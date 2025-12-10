import { _decorator, AudioSource, Button, Component, director, game, Node, Slider } from 'cc';
import { AudioManager } from './AudioManager';
const { ccclass, property } = _decorator;

@ccclass('SettingManager')
export class SettingManager extends Component {
    @property({ type: Node }) private settingNode: Node;
    @property({ type: Button }) private settingButton: Button;

    protected onLoad(): void {

    }

    start() {
        this.settingButton.node.on(Button.EventType.CLICK, this.openSettingMenu.bind(this), this);
    }

    update(deltaTime: number) {

    }

    /**
     * 開啟設定選單
     * @param self 按鈕自身
     */
    openSettingMenu(self: Button): void {
        this.settingNode.active = !this.settingNode.active;
    }

    goHome() {

    }

    pause() {
        game.pause();
    }
}


