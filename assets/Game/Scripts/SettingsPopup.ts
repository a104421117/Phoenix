import { _decorator, Node, Slider, Label, AudioSource, director } from 'cc';
import { PopupBase } from '../../Base/Scripts/PopupBase';
import { StorageManager } from '../../Base/Scripts/StorageManager';

const { ccclass, property } = _decorator;

/**
 * 設定彈窗
 */
@ccclass('SettingsPopup')
export class SettingsPopup extends PopupBase {
    @property(Slider)
    musicSlider: Slider = null;

    @property(Label)
    musicValueLabel: Label = null;

    @property(Slider)
    sfxSlider: Slider = null;

    @property(Label)
    sfxValueLabel: Label = null;

    @property(Node)
    helpPanel: Node = null;

    @property(Label)
    helpContentLabel: Label = null;

    private _musicVolume: number = 1.0;
    private _sfxVolume: number = 1.0;

    // 說明文案
    private readonly HELP_TEXT = `【鳳飛飛玩法說明】

遊戲流程：
1. 押注階段（12秒）- 設定押注金額並點擊押注
2. 遊戲開始 - 鳳凰起飛，倍數開始上升
3. 取出 - 在爆炸前點擊取出獲得對應倍數獎勵
4. 爆炸 - 未取出的押注全部損失

規則：
• 玩家押注後在本局倍數爆炸前取出，即可獲得對應積分
• 若爆炸後未取出則失去押注積分
• 押注階段可設定自動取出倍數
• 爆炸倍數最低0.1倍，最高1000倍
• 每局最多可押注5次，每次押注單獨結算

贏分計算：
押注額 × 取出倍數 - 服務費（取出金額的5%）`;

    onLoad() {
        super.onLoad();

        // 從本地存儲讀取音量設定
        this._musicVolume = StorageManager.getMusicVolume();
        this._sfxVolume = StorageManager.getSfxVolume();

        // 初始化滑動條
        if (this.musicSlider) {
            this.musicSlider.progress = this._musicVolume;
            this.musicSlider.node.on('slide', this.onMusicSliderChange, this);
        }
        if (this.sfxSlider) {
            this.sfxSlider.progress = this._sfxVolume;
            this.sfxSlider.node.on('slide', this.onSfxSliderChange, this);
        }

        this.updateDisplay();
    }

    protected onShowComplete() {
        // 隱藏說明面板
        if (this.helpPanel) {
            this.helpPanel.active = false;
        }
    }

    onDestroy() {
        super.onDestroy();

        if (this.musicSlider) {
            this.musicSlider.node.off('slide', this.onMusicSliderChange, this);
        }
        if (this.sfxSlider) {
            this.sfxSlider.node.off('slide', this.onSfxSliderChange, this);
        }
    }

    /**
     * 音樂滑動條變更
     */
    private onMusicSliderChange(slider: Slider) {
        this._musicVolume = slider.progress;
        StorageManager.setMusicVolume(this._musicVolume);
        this.updateDisplay();
        this.applyMusicVolume();
    }

    /**
     * 音效滑動條變更
     */
    private onSfxSliderChange(slider: Slider) {
        this._sfxVolume = slider.progress;
        StorageManager.setSfxVolume(this._sfxVolume);
        this.updateDisplay();
    }

    /**
     * 更新顯示
     */
    private updateDisplay() {
        if (this.musicValueLabel) {
            this.musicValueLabel.string = Math.round(this._musicVolume * 100) + '%';
        }
        if (this.sfxValueLabel) {
            this.sfxValueLabel.string = Math.round(this._sfxVolume * 100) + '%';
        }
    }

    /**
     * 應用音樂音量
     */
    private applyMusicVolume() {
        // 查找所有 AudioSource 並設定音量
        const audioSources = director.getScene().getComponentsInChildren(AudioSource);
        for (const audio of audioSources) {
            audio.volume = this._musicVolume;
        }
    }

    /**
     * 點擊玩法說明
     */
    onHelpClick() {
        if (this.helpPanel) {
            this.helpPanel.active = true;
        }
        if (this.helpContentLabel) {
            this.helpContentLabel.string = this.HELP_TEXT;
        }
    }

    /**
     * 關閉說明面板
     */
    onCloseHelpClick() {
        if (this.helpPanel) {
            this.helpPanel.active = false;
        }
    }

    /**
     * 退出房間
     */
    onExitClick() {
        // 跳轉到俱樂部場景
        director.loadScene('Club');
    }
}
