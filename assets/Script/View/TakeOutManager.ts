import { _decorator, Button, instantiate, Label, Node, Prefab, Sprite } from 'cc';
import { getInstance, Manager } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { TakeOut } from 'db://assets/Script/ModelView/TakeOut';
import { GameModel } from '../Model/Model';
import { WebSocketManager } from '../Model/WebSocketManager';
import { GameManager } from '../Control/GameManager';
import { MessageManager } from './MessageManager';
const { ccclass, property } = _decorator;

type TakeOutArr = [TakeOut, TakeOut, TakeOut, TakeOut, TakeOut];

@ccclass('TakeOutManager')
export class TakeOutManager extends Manager {
    @property({ type: Button }) private bottomButtonBet: Button;
    @property({ type: Prefab }) private buttonPickNormalPrefab: Prefab;
    @property({ type: Node }) private takeOutLayout: Node;
    @property({ type: Button }) private repeatBtn: Button;//尚未有圖片故先隨意命名
    @property({ type: Button }) private BottomButtonPickall: Button;
    @property({ type: Array(TakeOut), readonly: true }) private takeOutArr: TakeOutArr = [
        new TakeOut(),
        new TakeOut(),
        new TakeOut(),
        new TakeOut(),
        new TakeOut()
    ];
    private takeOutTotal: number = 0;
    private winNum: number = 0;
    @property({ type: Node }) private winNode: Node;
    @property({ type: Sprite }) private TextD: Sprite;
    @property({ type: Label }) private H3A: Label;
    @property({ type: Label }) private H4B: Label;
    private index: number = 0;


    start() {
        this.bottomButtonBet.node.on(Button.EventType.CLICK, this.showTakeOut.bind(this));
        this.BottomButtonPickall.node.on(Button.EventType.CLICK, this.takeOut.bind(this));
        this.repeatBtn.node.on(Button.EventType.CLICK, this.repeatBet.bind(this));

        this.closeBottomButtonPickall();
        this.closeRepeatBtn();
        this.closeWin();

        //下注數量,若要有後台設定則要傳資料進來
        this.initTakeOut();
    }

    update(deltaTime: number) {

    }

    private initTakeOut(betCountMax: number = getInstance(ModelManager).BetModel.betCountMax): void {
        for (let i = 0; i < betCountMax; i++) {
            const node = instantiate(this.buttonPickNormalPrefab);
            this.takeOutLayout.addChild(node);
            node.on('takeout', this.showWin.bind(this));

            const _takeOut: TakeOut = node.getComponent(TakeOut);
            _takeOut.init(betCountMax);
            _takeOut.node.on(Button.EventType.CLICK, this.showWin.bind(this));
            this.takeOutArr[i] = _takeOut;
        }
    }

    private showTakeOut(self: Button, bet: number = getInstance(ModelManager).BetModel.bet): void {
        if (getInstance(GameManager).isRun === false && this.index < this.takeOutArr.length) {
            getInstance(WebSocketManager).Bet({ index: this.index, amount: bet });
            // this.BottomButtonPickall.enabled = false;
            this.takeOutArr[this.index].show(bet);
            this.index++;
        }
    }

    public autoTakeOut(bet: number, conut: number): void {
        for (let i = 0; i < conut; i++) {
            this.takeOutArr[i].show(bet);
        }
        this.index += conut;
    }

    public takeOut(): void {
        this.BottomButtonPickall.enabled = false;
        this.takeOutArr.forEach((takeOut) => {
            takeOut.takeOut();
        });
    }

    private checkTakeOut(): boolean {
        let isShow = false;
        for (let i = 0; i < this.index; i++) {
            if (this.takeOutArr[i].IsShow === true && this.takeOutArr[i].isTakeOut === false) {
                isShow = true;
            }
        }
        this.BottomButtonPickall.enabled = isShow;
        return isShow;
    }

    private repeatBet(): void {
        this.closeRepeatBtn();
        this.takeOutArr.forEach((takeOut, index) => {
            if (takeOut.bet > 0) {
                console.log("index:" + index);
                takeOut.isBetRepeat = true;
                takeOut.show();
            }
        });
    }

    public showBottomButtonPickall(): void {
        this.BottomButtonPickall.node.active = true;
        // this.BottomButtonPickall.enabled = true;
    }

    public closeBottomButtonPickall(): void {
        this.BottomButtonPickall.node.active = false;
    }

    public showRepeatBtn(): void {
        this.takeOutArr.forEach((takeOut) => {
            if (takeOut.IsShow) {
                this.repeatBtn.node.active = true;
            }
        });
    }

    public closeRepeatBtn(): void {
        this.repeatBtn.node.active = false;
    }

    public runTakeOut() {
        this.checkTakeOut();
        this.takeOutArr.forEach((takeOut) => {
            takeOut.run();
        });
    }

    public changeTakeOut(multiple: number): void {
        this.takeOutArr.forEach((takeOut) => {
            takeOut.change(multiple);
        });
        this.changeTotal();
    }

    public closeTakeOut() {
        this.takeOutArr.forEach((takeOut) => {
            takeOut.close();
        });
        this.index = 0;
    }

    public resetTakeOut() {
        this.takeOutArr.forEach((takeOut) => {
            if (takeOut.isBetRepeat === true) {
                takeOut.reset();
            }
        });
        this.closeRepeatBtn();
    }

    private showWin(winNum: number): number {
        this.checkTakeOut();

        let betTotal = 0;
        for (let i = 0; i < this.index; i++) {
            const bet = this.takeOutArr[i].bet;
            betTotal += bet;
        }

        const commission = GameModel.getFloor(this.takeOutTotal * 0.05);

        this.winNum = this.takeOutTotal - betTotal - commission;

        const winStr = this.winNum > 0 ? "+" + GameModel.getThousandth(this.winNum) : GameModel.getThousandth(this.winNum);
        this.H3A.string = winStr;

        this.winNode.active = true;
        this.takeOutArr[this.index - 1].node.addChild(this.winNode);
        getInstance(MessageManager).setMessage("win", { win: winNum, total: this.winNum });
        return this.winNum;
    }

    private changeTotal(): number {
        let total = 0;
        for (let i = 0; i < this.index; i++) {
            const num = this.takeOutArr[i].TakeOut;
            total += num;
        }
        if (total > 0) {
            this.H4B.string = GameModel.getThousandth(total);
        }
        this.takeOutTotal = total;
        return total;
    }


    public closeWin() {
        this.winNum = 0;
        this.takeOutTotal = 0;
        this.H3A.string = "";
        this.H4B.string = "";
        this.winNode.active = false;
    }
}


