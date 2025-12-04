import { _decorator, Button, CCFloat, CCInteger, Component, instantiate, Node, Prefab, Sprite } from 'cc';
import { ArtWord } from '../../lib/DataManager';
const { ccclass, property } = _decorator;

type BtnArtWord = {
    btn: Button;
    artWord: ArtWord;
};

enum BettingCalculatorType {
    Bet = 0,
    Profit = 1,
    Multiple = 2
}

class BettingCalculator {
    @property({ type: Button }) private btn: Button = null;
    @property({ type: ArtWord }) private betArtWord: ArtWord = null;
    @property({ type: ArtWord }) private profitArtWord: ArtWord = null;
    @property({ type: ArtWord }) private multipleArtWord: ArtWord = null;
    showBet(bet: number) {
        this.btn.node.active = true;
        this.betArtWord.node.active = true;
        this.betArtWord.setThousandthNum(bet);
        this.profitArtWord.node.active = false;
        this.multipleArtWord.node.active = false;
    }
    showProfitMultiple(profit: number, multiple: number) {
        this.btn.node.active = true;
        this.betArtWord.node.active = false;
        this.profitArtWord.node.active = true;
        this.profitArtWord.setThousandthNum(profit);
        this.multipleArtWord.node.active = true;
        this.multipleArtWord.setThousandthNum(multiple);
    }
    close() {
        this.btn.node.active = false;
    }
}
type BettingCalculatorArr = [BettingCalculator, BettingCalculator, BettingCalculator, BettingCalculator, BettingCalculator];
type RateArr = [number, number, number, number];
type BetArr = [number, number, number, number, number, number, number, number, number, number];

@ccclass('BetManager')
export class BetManager extends Component {
    private static _instance: BetManager;
    public static getInstance(): BetManager {
        return this._instance;
    }
    @property({ type: ArtWord }) private BetTimeArtWord: ArtWord;
    @property({ type: Sprite }) private TextA: Sprite;

    @property({ type: ArtWord }) private BetMultipleArtWord: ArtWord;
    @property({ type: Sprite }) private TextC: Sprite;

    @property({ type: ArtWord }) private ResetTimeArtWord: ArtWord;
    @property({ type: Sprite }) private TextB: Sprite;

    @property({ type: Node }) private BetNode: Node;
    @property({ type: Button }) private BottomButtonBet: Button;
    @property({ type: Prefab }) private buttonPickClickPrefab: Prefab;
    @property({ type: Button }) private buttonPickClick: Button;
    @property({ type: Button }) private BottomButtonMinus: Button;
    @property({ type: Button }) private BottomButtonPlus: Button;
    @property({ type: ArtWord }) private BottomArtWord: ArtWord;
    @property({ type: Button }) private RateBtn: Button;
    @property({ type: Node }) private RateLayout: Node;
    private buttonPickClickList: BtnArtWord[] = [];

    @property({ type: Node }) private TakeOutLayout: Node;
    @property({ type: Prefab }) private buttonPickNormal: Prefab;

    public betTime: number = 12;
    private betCount: number = 0;
    public runTime: number = 10;
    public maxMultiple: number = 5.00;
    @property({ type: CCFloat }) public runMultiple: number = 0.00;
    public runDeltaTime: number = 1.0;
    public deadTime: number = 5;
    @property({ type: CCInteger, readonly: true }) private bottomArtWordBet: number = 1000;
    private rateArr: RateArr = [1000, 2500, 5000, 10000];
    private betArr: BetArr = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
    private bettingCalculatorArr: BettingCalculatorArr = [new BettingCalculator(), new BettingCalculator(), new BettingCalculator(), new BettingCalculator(), new BettingCalculator()];
    protected onLoad(): void {
        BetManager._instance = this;
    }

    start() {
        this.init();
    }

    update(deltaTime: number) {

    }

    private init() {
        this.setEvent();
        this.closeRateButton();
        //需要與API串接
        this.setRate(this.rateArr);
        this.changeBottomArtWord(this.bottomArtWordBet);
    }

    private setEvent(): void {
        this.buttonPickClick.node.on(Button.EventType.CLICK, this.showRateButton.bind(this), this);
        this.RateBtn.node.on(Button.EventType.CLICK, this.closeRateButton.bind(this), this);
        this.BottomButtonMinus.node.on(Button.EventType.CLICK, this.BottomArtWordLess.bind(this, this.betArr), this);
        this.BottomButtonPlus.node.on(Button.EventType.CLICK, this.BottomArtWordPlus.bind(this, this.betArr), this);
        this.BottomButtonBet.node.on(Button.EventType.CLICK, this.changeBettingCalculatorArr.bind(this), this);
    }

    public showBetTime(): void {
        this.TextA.node.active = true;
        this.BetTimeArtWord.node.active = true;
    }

    public closeBetTime(): void {
        this.TextA.node.active = false;
        this.BetTimeArtWord.node.active = false;
    }

    public changeBetTime(time: number): string {
        const str = time + "s";
        this.BetTimeArtWord.string = str;
        return str;
    }

    public showBetMultiple(): void {
        this.TextC.node.active = true;
        this.BetMultipleArtWord.node.active = true;
    }

    public closeBetMultiple(): void {
        this.TextC.node.active = false;
    }

    public changeBetMultiple(multiple: number): string {
        //四捨五入
        let num = multiple.toFixed(2);
        let str = num + "x";
        this.BetMultipleArtWord.string = str;
        return str;
    }

    public showDeadTime(): void {
        this.TextB.node.active = true;
        this.ResetTimeArtWord.node.active = true;
    }

    public closeDeadTime(): void {
        this.TextB.node.active = false;
        this.BetMultipleArtWord.node.active = false;
        this.ResetTimeArtWord.node.active = false;
    }

    public changeDeadTime(time: number): string {
        let str = time.toString() + "s"
        this.ResetTimeArtWord.string = str;
        return str;
    }

    private setRate(rateArr: RateArr): BtnArtWord[] {
        rateArr.forEach((rate) => {
            const node = instantiate(this.buttonPickClickPrefab);
            this.RateLayout.addChild(node);

            const artWord = node.getComponentInChildren(ArtWord);
            const numStr = rate.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            artWord.string = numStr;

            const button = node.getComponent(Button);
            button.node.on(Button.EventType.CLICK, this.changeBottomArtWord.bind(this, rate));

            const buttonPickClick: BtnArtWord = {
                btn: button,
                artWord: artWord,
            };
            this.buttonPickClickList.push(buttonPickClick);
        });
        return this.buttonPickClickList;
    }

    private changeBottomArtWord(num: number): void {
        this.bottomArtWordBet = num;
        this.BottomArtWord.setThousandthNum(num);
        this.closeRateButton();
    }

    private showRateButton(): void {
        this.RateBtn.node.active = true;
    }

    public closeRateButton(): void {
        this.RateBtn.node.active = false;
    }

    public showBetNode(): void {
        this.BetNode.active = true;
    }

    public closeBetNode(): void {
        this.BetNode.active = false;
    }

    private BottomArtWordPlus(betArr: BetArr): number {
        const filter = betArr.filter(e => e > this.bottomArtWordBet);
        this.bottomArtWordBet = filter.length > 0 ? Math.min(...filter) : this.bottomArtWordBet;
        this.BottomArtWord.setThousandthNum(this.bottomArtWordBet);
        return this.bottomArtWordBet;
    }

    private BottomArtWordLess(betArr: BetArr): number {
        const filter = betArr.filter(e => e < this.bottomArtWordBet);
        this.bottomArtWordBet = filter.length > 0 ? Math.max(...filter) : this.bottomArtWordBet;
        this.BottomArtWord.setThousandthNum(this.bottomArtWordBet);
        return this.bottomArtWordBet;
    }

    private changeBettingCalculatorArr(): void {
        if (this.bettingCalculatorArr.length > this.betCount) {
            let betTakeOut = this.bettingCalculatorArr[this.betCount];
            betTakeOut.showBet(this.bottomArtWordBet);


            // betTakeOut.Bet = this.bottomArtWordBet;
            // if (!betTakeOut.haveBtnArtWord()) {
            //     const node = instantiate(this.buttonPickNormal);
            //     this.TakeOutLayout.addChild(node);
            //     const btn = node.getComponent(Button);
            //     const artWord = node.getComponentInChildren(ArtWord);
            //     const btnArtWord: BtnArtWord = {
            //         btn: btn,
            //         artWord: artWord
            //     };
            //     betTakeOut.BtnArtWord = btnArtWord;
            // } else {
            //     betTakeOut.showBtnArtWord();
            // }
            // betTakeOut.setThousandthNum(this.bottomArtWordBet);
            this.betCount++;
        }
    }

    public resetTakeOut(): void {
        this.bettingCalculatorArr.forEach((bettingCalculator) => {
            // betTakeOut.closeBtnArtWord();
            // bettingCalculator.clearData();
        })
        this.betCount = 0;
    }

    public prodButtonPickNormal(): void {
        let node = instantiate(this.buttonPickNormal);
        this.TakeOutLayout.addChild(node);
    }
}


