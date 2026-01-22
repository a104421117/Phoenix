import { _decorator, Component, Node, Label, Slider, Button } from 'cc';
import { GameConfig } from './GameConfig';
import { BetManager } from './BetManager';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

/**
 * 自動取出設定彈窗
 */
@ccclass('AutoCashoutPopup')
export class AutoCashoutPopup extends Component {
    @property(Slider)
    multiplierSlider: Slider = null;

    @property(Label)
    multiplierLabel: Label = null;

    @property(Node)
    recentButtonsContainer: Node = null;

    @property([Button])
    recentButtons: Button[] = [];

    @property([Label])
    recentLabels: Label[] = [];

    private _betManager: BetManager = null;
    private _currentMultiplier: number = 1.2;

    onLoad() {
        // 初始化滑動條
        if (this.multiplierSlider) {
            this.multiplierSlider.node.on('slide', this.onSliderChange, this);
        }
    }

    onEnable() {
        this._betManager = GameManager.instance?.betManager;

        if (this._betManager) {
            this._currentMultiplier = this._betManager.autoCashoutMultiplier;
            this.updateDisplay();
            this.updateRecentButtons();
        }
    }

    onDestroy() {
        if (this.multiplierSlider) {
            this.multiplierSlider.node.off('slide', this.onSliderChange, this);
        }
    }

    /**
     * 滑動條變更
     */
    private onSliderChange(slider: Slider) {
        // 將滑動條值（0-1）轉換為倍數
        // 使用對數刻度讓低倍數更精確
        const minLog = Math.log(GameConfig.AUTO_CASHOUT_MIN);
        const maxLog = Math.log(GameConfig.AUTO_CASHOUT_MAX);
        const logValue = minLog + slider.progress * (maxLog - minLog);
        this._currentMultiplier = Math.round(Math.exp(logValue) * 100) / 100;

        this.updateDisplay();
    }

    /**
     * 更新顯示
     */
    private updateDisplay() {
        if (this.multiplierLabel) {
            this.multiplierLabel.string = this._currentMultiplier.toFixed(2) + 'x';
        }

        // 更新滑動條位置
        if (this.multiplierSlider) {
            const minLog = Math.log(GameConfig.AUTO_CASHOUT_MIN);
            const maxLog = Math.log(GameConfig.AUTO_CASHOUT_MAX);
            const currentLog = Math.log(this._currentMultiplier);
            this.multiplierSlider.progress = (currentLog - minLog) / (maxLog - minLog);
        }
    }

    /**
     * 更新最近使用的倍數按鈕
     */
    private updateRecentButtons() {
        if (!this._betManager) return;

        const recent = this._betManager.recentAutoCashout;

        for (let i = 0; i < this.recentLabels.length; i++) {
            if (i < recent.length) {
                this.recentLabels[i].string = recent[i].toFixed(2) + 'x';
                if (this.recentButtons[i]) {
                    this.recentButtons[i].node.active = true;
                }
            } else {
                if (this.recentButtons[i]) {
                    this.recentButtons[i].node.active = false;
                }
            }
        }
    }

    /**
     * 點擊增加按鈕
     */
    onIncreaseClick() {
        this._currentMultiplier = Math.min(
            this._currentMultiplier + 0.1,
            GameConfig.AUTO_CASHOUT_MAX
        );
        this._currentMultiplier = Math.round(this._currentMultiplier * 100) / 100;
        this.updateDisplay();
    }

    /**
     * 點擊減少按鈕
     */
    onDecreaseClick() {
        this._currentMultiplier = Math.max(
            this._currentMultiplier - 0.1,
            GameConfig.AUTO_CASHOUT_MIN
        );
        this._currentMultiplier = Math.round(this._currentMultiplier * 100) / 100;
        this.updateDisplay();
    }

    /**
     * 點擊最近使用的倍數按鈕
     */
    onRecentClick(event: Event, customData: string) {
        const index = parseInt(customData);
        if (this._betManager && index >= 0) {
            const recent = this._betManager.recentAutoCashout;
            if (index < recent.length) {
                this._currentMultiplier = recent[index];
                this.updateDisplay();
            }
        }
    }

    /**
     * 確認設定
     */
    onConfirmClick() {
        if (this._betManager) {
            this._betManager.setAutoCashout(
                this._betManager.autoCashoutEnabled,
                this._currentMultiplier
            );
        }
        this.close();
    }

    /**
     * 關閉彈窗
     */
    onCloseClick() {
        this.close();
    }

    /**
     * 點擊背景關閉
     */
    onBackgroundClick() {
        this.close();
    }

    private close() {
        this.node.active = false;
    }
}
