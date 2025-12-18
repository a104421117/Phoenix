import { _decorator, Button, CCBoolean, CCFloat, CCInteger, Component, instantiate, Label, Node, Prefab, UIOpacity } from 'cc';
import { GameModel } from '../Model/Model';
const { ccclass, property } = _decorator;

@ccclass('TakeOut')
export class TakeOut extends Component {
    @property({ type: CCInteger, readonly: true, tooltip: "該注注額" }) bet: number = 0;
    @property({ type: CCFloat, readonly: true, tooltip: "倍率" }) multiple: number = 0;
    @property({ type: CCBoolean, readonly: true, tooltip: "是否取出" }) isTakeOut: boolean = false;
    @property({ type: CCBoolean, readonly: true, tooltip: "是否結束" }) isBetRepeat: boolean = false;

    // @property({ type: CCInteger, readonly: true }) index: number = 0;
    get TakeOut() {
        return GameModel.getFloor(this.bet * this.multiple);
    }
    get IsShow() {
        return this.node.active;
    }
    // get Win() {
    //     const multiple = this.multiple - 1;
    //     const win = GameModel.getFloor(this.bet * multiple * 0.95);
    //     this.multiple = 0;
    //     return win;
    // }
    @property({ type: Button }) btn: Button = null;
    @property({ type: Label }) betLabel: Label = null;
    @property({ type: Label }) updateLabel: Label = null;
    @property({ type: Label }) profitLabel: Label = null;
    @property({ type: Label }) multipleLabel: Label = null;

    start() {

    }

    update(deltaTime: number) {

    }

    init(betCountMax: number) {
        this.node.active = false;
        this.btn.enabled = false;
        this.btn.node.on(Button.EventType.CLICK, this.takeOut.bind(this));
    }

    reset() {
        this.bet = 0;
    }

    close() {
        this.node.active = false;
        this.multiple = 0;
        if (this.isTakeOut === true) {
            this.btn.enabled = false;
            this.isTakeOut = false;
        }
    }

    show(bet: number = this.bet) {
        console.log(bet);
        this.isBetRepeat = false;

        this.node.active = true;

        this.btn.interactable = true;
        this.btn.enabled = false;

        this.bet = bet;
        this.betLabel.node.active = true;
        const thousandth = GameModel.getThousandth(bet)
        this.betLabel.string = thousandth;

        this.updateLabel.node.active = false;

        this.profitLabel.node.active = false;

        this.multipleLabel.node.active = false;
    }
    run() {
        this.btn.enabled = true;
        // if (this.IsShow === true) {
        this.betLabel.node.active = false;
        this.updateLabel.node.active = true;
        this.updateLabel.string = "0";
        this.profitLabel.node.active = false;
        this.multipleLabel.node.active = false;
        // }
    }
    change(multiple: number): number {
        if (this.IsShow === true && this.isTakeOut === false) {
            this.multiple = GameModel.getFloor(multiple, 2);
            const numStr = GameModel.getThousandth(this.TakeOut);
            this.updateLabel.string = numStr;
        }
        return this.TakeOut;
    }
    takeOut(): void {
        if (this.isTakeOut === false && this.IsShow === true) {
            this.btn.interactable = false;
            this.isTakeOut = true;
            this.betLabel.node.active = false;
            this.updateLabel.node.active = false;
            this.profitLabel.node.active = true;
            const takeout = GameModel.getThousandth(this.TakeOut);
            const takeoutStr = "+" + takeout;
            this.profitLabel.string = takeoutStr;
            this.multipleLabel.node.active = true;
            const multiple = GameModel.getRoundToStr(this.multiple, 2);
            const multipleStr = multiple + "x";
            this.multipleLabel.string = multipleStr;
        }
    }
}


