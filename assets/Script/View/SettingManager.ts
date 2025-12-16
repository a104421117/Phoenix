import { _decorator, Button, Component, director, game, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SettingManager')
export class SettingManager extends Component {
    @property({ type: Node }) private MenuDecorateBackgroundA: Node;
    @property({ type: Button }) private MenuBottonCloseABtn: Button;

    @property({ type: Node }) private MenuDecorateBackgroundB: Node;
    @property({ type: Button }) private MenuBottonCloseBBtn: Button;

    @property({ type: Node }) private MenuDecorateBackgroundC: Node;
    @property({ type: Button }) private MenuBottonCloseCBtn: Button;

    @property({ type: Node }) private MenuDecorateBackgroundD: Node;
    @property({ type: Button }) private MenuBottonCloseDBtn: Button;

    @property({ type: Node }) private MenuDecorateBackgroundE: Node;
    @property({ type: Button }) private MenuBottonCloseEBtn: Button;

    @property({ type: Button }) private TopButtonHamBtn: Button;
    @property({ type: Button }) private rulesBtn: Button;
    @property({ type: Button }) private recordBtn: Button;
    @property({ type: Button }) private settingBtn: Button;
    @property({ type: Button }) private leaveBtn: Button;

    @property({ type: Button }) private leaveCancelBtn: Button;
    @property({ type: Button }) private leaveCheckBtn: Button;
    protected onLoad(): void {
        this.closeMenuDecorateBackgroundA();
        this.closeMenuDecorateBackgroundB();
        this.closeMenuDecorateBackgroundC();
        this.closeMenuDecorateBackgroundD();
        this.closeMenuDecorateBackgroundE();
    }

    start() {
        this.TopButtonHamBtn.node.on(Button.EventType.CLICK, this.openMenuDecorateBackgroundA.bind(this), this);

        this.rulesBtn.node.on(Button.EventType.CLICK, this.openMenuDecorateBackgroundB.bind(this), this);
        this.recordBtn.node.on(Button.EventType.CLICK, this.openMenuDecorateBackgroundC.bind(this), this);
        this.settingBtn.node.on(Button.EventType.CLICK, this.openMenuDecorateBackgroundD.bind(this), this);
        this.leaveBtn.node.on(Button.EventType.CLICK, this.openMenuDecorateBackgroundE.bind(this), this);

        this.MenuBottonCloseABtn.node.on(Button.EventType.CLICK, this.closeMenuDecorateBackgroundA.bind(this), this);
        this.MenuBottonCloseBBtn.node.on(Button.EventType.CLICK, this.closeMenuDecorateBackgroundB.bind(this), this);
        this.MenuBottonCloseCBtn.node.on(Button.EventType.CLICK, this.closeMenuDecorateBackgroundC.bind(this), this);
        this.MenuBottonCloseDBtn.node.on(Button.EventType.CLICK, this.closeMenuDecorateBackgroundD.bind(this), this);
        this.MenuBottonCloseEBtn.node.on(Button.EventType.CLICK, this.closeMenuDecorateBackgroundE.bind(this), this);

        this.leaveCancelBtn.node.on(Button.EventType.CLICK, this.closeMenuDecorateBackgroundE.bind(this), this);
        this.leaveCheckBtn.node.on(Button.EventType.CLICK, this.leaveGame.bind(this), this);
    }

    update(deltaTime: number) {

    }

    /**
     * 開啟設定選單
     */
    openMenuDecorateBackgroundA(): void {
        this.MenuDecorateBackgroundA.active = true;
    }

    closeMenuDecorateBackgroundA() {
        this.MenuDecorateBackgroundA.active = false;
    }

    openMenuDecorateBackgroundB() {
        this.MenuDecorateBackgroundB.active = true;
    }

    closeMenuDecorateBackgroundB() {
        this.MenuDecorateBackgroundB.active = false;
    }

    openMenuDecorateBackgroundC() {
        this.MenuDecorateBackgroundC.active = true;
    }

    closeMenuDecorateBackgroundC() {
        this.MenuDecorateBackgroundC.active = false;
    }

    openMenuDecorateBackgroundD() {
        this.MenuDecorateBackgroundD.active = true;
    }

    closeMenuDecorateBackgroundD() {
        this.MenuDecorateBackgroundD.active = false;
    }

    openMenuDecorateBackgroundE() {
        this.MenuDecorateBackgroundE.active = true;
    }

    closeMenuDecorateBackgroundE() {
        this.MenuDecorateBackgroundE.active = false;
    }

    leaveGame() {
        director.end();
        // game.end();
    }
}


