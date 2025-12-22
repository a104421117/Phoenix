import { _decorator, Button, instantiate, Label, Node, Prefab, Sprite, UIOpacity } from 'cc';
import { getInstance, Manager } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { GameModel, RateArr } from '../Model/Model';
const { ccclass, property } = _decorator;

type BetObj = {
    btn: Button;
    label: Label;
};

type BetObjArr = [BetObj, BetObj, BetObj, BetObj];

@ccclass('BetManager')
export class BetManager extends Manager {
    /**整個Bet物件,用於整個bet的顯示與否 */
    @property({ type: Node }) private betNode: Node;
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
    start() {
        this.buttonPickClick.node.on(Button.EventType.CLICK, this.showBetBtn.bind(this));
        this.bottomButtonMinus.node.on(Button.EventType.CLICK, this.betLess.bind(this));
        this.bottomButtonPlus.node.on(Button.EventType.CLICK, this.betPlus.bind(this));
        this.betBtn.node.on(Button.EventType.CLICK, this.closeBetBtn.bind(this));

        this.closeBetBtn();
        //需要與API串接
        this.changeBet(getInstance(ModelManager).BetModel.bet);
        this.initBet();
    }

    update(deltaTime: number) {

    }

    private initBet(betArr: RateArr = getInstance(ModelManager).BetModel.rateArr): BetObjArr {
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

    public showBetNode(): void {
        this.betNode.active = true;
    }

    public closeBetNode(): void {
        this.betNode.active = false;
    }
}


