import { _decorator, Button, instantiate, Label, Node, Prefab, Sprite, UIOpacity } from 'cc';
import { getInstance, Manager } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { GameModel, RateArr, TakeOutArr } from '../Model/Model';
import { GameManager } from '../Control/GameManager';
const { ccclass, property } = _decorator;

type BetObj = {
    btn: Button;
    label: Label;
};

@ccclass('TakeOutObj')
class TakeOutObj {
    @property({ type: Button, readonly: true }) btn: Button = null;
    @property({ type: Label, readonly: true }) bet: Label = null;
    @property({ type: Label, readonly: true }) update: Label = null;
    @property({ type: Label, readonly: true }) profit: Label = null;
    @property({ type: Label, readonly: true }) multiple: Label = null;
    index: number = 0;
    /**
     *
     */
    constructor(node: Node, index: number) {
        this.btn = node.getComponent(Button);
        this.btn.enabled = false;
        this.bet = node.children[0].getComponent(Label);
        this.update = node.children[1].getComponent(Label);
        this.profit = node.children[2].getComponent(Label);
        this.multiple = node.children[3].getComponent(Label);
        this.index = index;
        node.on(Button.EventType.CLICK, this.takeOut.bind(this, index));
    }
    show() {
        this.bet.node.active = true;
        this.update.node.active = false;
        this.profit.node.active = false;
        this.multiple.node.active = false;
    }
    run() {
        this.bet.node.active = false;
        this.update.node.active = true;
        this.profit.node.active = false;
        this.multiple.node.active = false;
        this.bet.enabled = true;
    }
    change(multiple: number) {
        const numStr = GameModel.getRoundToStr(multiple);
        this.update.string = numStr;
    }
    takeOut(index: number = this.index) {
        this.bet.node.active = false;
        this.update.node.active = true;
        this.profit.node.active = true;
        this.multiple.node.active = true;
        getInstance(ModelManager).BetModel.takeOutArr[index].select();
    }
};

function test() {
    this.t = 0;
}

type BetObjArr = [BetObj, BetObj, BetObj, BetObj];
type TakeOutObjArr = [TakeOutObj, TakeOutObj, TakeOutObj, TakeOutObj, TakeOutObj];

@ccclass('BetManager')
export class BetManager extends Manager {
    /**整個Bet物件,用於整個bet的顯示與否 */
    @property({ type: Node }) private betNode: Node;




    @property({ type: Button }) private bottomButtonBet: Button;


    /**顯示bet選項按鈕 */
    @property({ type: Button }) private buttonPickClick: Button;
    /**減少bet */
    @property({ type: Button }) private bottomButtonMinus: Button;
    /**增加bet */
    @property({ type: Button }) private bottomButtonPlus: Button;
    /**當前押注額 */
    @property({ type: Label }) private betLabel: Label;
    /**關閉bet選項按鈕(除了選項外的部分) */
    @property({ type: Button }) private betBtn: Button;
    /**bet選項父物件 */
    @property({ type: Node }) private betLayout: Node;
    /**button-pick-click選項的預製物件 */
    @property({ type: Prefab }) private buttonPickClickPrefab: Prefab;
    /**button-pick-click選項陣列 */
    private buttonPickClickArr: BetObjArr = [null, null, null, null];


    @property({ type: Prefab }) private buttonPickNormalPrefab: Prefab;
    @property({ type: Node }) private takeOutLayout: Node;
    @property({ type: Array(TakeOutObj), readonly: true }) private takeOutObjArr: TakeOutObjArr = [null, null, null, null, null];





    start() {
        this.setEvent();
        this.closeBetBtn();
        //需要與API串接
        this.changeBet(getInstance(ModelManager).BetModel.bet);
        this.setTakeOut(getInstance(ModelManager).BetModel.takeOutArr);
        this.setBet(getInstance(ModelManager).BetModel.rateArr);
    }

    update(deltaTime: number) {

    }

    private setEvent(): void {
        this.bottomButtonBet.node.on(Button.EventType.CLICK, this.showTakeOut.bind(this));
        this.buttonPickClick.node.on(Button.EventType.CLICK, this.showBetBtn.bind(this));
        this.bottomButtonMinus.node.on(Button.EventType.CLICK, this.betLess.bind(this));
        this.bottomButtonPlus.node.on(Button.EventType.CLICK, this.betPlus.bind(this));
        this.betBtn.node.on(Button.EventType.CLICK, this.closeBetBtn.bind(this));
    }

    private setBet(betArr: RateArr): BetObjArr {
        betArr.forEach((bet, index) => {
            const node = instantiate(this.buttonPickClickPrefab);
            this.betLayout.addChild(node);

            const btn = node.getComponent(Button);
            btn.node.on(Button.EventType.CLICK, this.changeBet.bind(this, bet));

            const label = node.children[0].getComponent(Label);
            const thousandthRate = GameModel.getThousandth(bet);
            label.string = thousandthRate;

            const buttonPickClick: BetObj = {
                btn: btn,
                label: label
            };
            this.buttonPickClickArr[index] = buttonPickClick;
        });
        return this.buttonPickClickArr;
    }

    private changeBet(num: number): string {
        const thousandth = getInstance(ModelManager).BetModel.changeBetThousandth(num);
        this.betLabel.string = thousandth;
        this.closeBetBtn();
        return thousandth;
    }

    private showBetBtn(): void {
        this.betBtn.node.active = true;
    }

    public closeBetBtn(): void {
        this.betBtn.node.active = false;
    }

    private betPlus(): number {
        const num = getInstance(ModelManager).BetModel.Plus;
        this.changeBet(num);
        return num;
    }

    private betLess(): number {
        const num = getInstance(ModelManager).BetModel.Less;
        this.changeBet(num);
        return num;
    }

    private setTakeOut(takeOutArr: TakeOutArr): void {
        takeOutArr.forEach((takeOut, index) => {
            const node = instantiate(this.buttonPickNormalPrefab);
            node.getComponent(UIOpacity).opacity = 0;
            this.takeOutLayout.addChild(node);

            const buttonPickNormal: TakeOutObj = new TakeOutObj(node, index);
            this.takeOutObjArr[index] = buttonPickNormal;
        })
    }

    public closeTakeOutObjArr(): void {
        this.takeOutObjArr.forEach((takeOutObj) => {
            takeOutObj.btn.getComponent(UIOpacity).opacity = 0;
            takeOutObj.btn.enabled = false;
        });
    }

    public changeTakeOutArr(): void {
        this.takeOutObjArr.forEach((takeOutObj, index) => {
            takeOutObj.update.string = GameModel.getThousandth(getInstance(ModelManager).BetModel.takeOutArr[index].TakeOut);
        });
    }

    private showTakeOut() {
        const index = getInstance(ModelManager).BetModel.setTakeOut();
        if (index < getInstance(ModelManager).BetModel.takeOutArr.length) {
            this.takeOutObjArr[index].btn.getComponent(UIOpacity).opacity = 255;
            this.takeOutObjArr[index].bet.string = GameModel.getThousandth(getInstance(ModelManager).BetModel.bet);
        }
    }

    public runTakeOut(takeOutIndex: number = getInstance(ModelManager).BetModel.takeOutIndex) {
        for (let i = 0; i < takeOutIndex; i++) {
            this.takeOutObjArr[i].run();
        }
    }

    public changeTakeOut(multiple: number, takeOutIndex: number = getInstance(ModelManager).BetModel.takeOutIndex): void {
        for (let i = 0; i < takeOutIndex; i++) {
            this.takeOutObjArr[i].change(multiple);
        }
    }

    public showBetNode(): void {
        this.betNode.active = true;
    }

    public closeBetNode(): void {
        this.betNode.active = false;
    }
}


