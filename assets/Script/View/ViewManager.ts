import { _decorator, Button, Component, Label, Node } from 'cc';
import { NodeSwitcher } from '../../Base/NodeSwitcher';
import { BaseModel } from '../../Base/BaseModel';
import { NumberSelector } from '../../Base/NumberSelector';
import { GameData, GmaeModel } from '../Model/GameData';
import { GameManager } from '../Controller/GameManager';
const { ccclass, property } = _decorator;

enum State {
    BettingCountdown = 0,
    Multiplier = 1,
    Explode = 2,
};

enum Normal {
    IdleNode = -1,
    BetNode = 0,
    CashoutNode = 1,
};

@ccclass('ViewManager')
export class ViewManager extends BaseModel.Singleton<ViewManager> {
    @property({ type: Label })
    private IDLabel: Label = null;
    @property({ type: Label })
    private balanceLabel: Label = null;
    @property({ type: Label })
    private bettingCountdownLabel: Label = null;
    @property({ type: NodeSwitcher })
    private stateNodeSwitcher: NodeSwitcher = null;
    @property({ type: NodeSwitcher })
    private normalNodeSwitcher: NodeSwitcher = null;
    @property({ type: Label })
    private multiplierLabel: Label = null;
    @property({ type: Label })
    private explodeLabel: Label = null;
    @property({ type: Label })
    private roundCountdownLabel: Label = null;
    @property({ type: NodeSwitcher })
    private popupsNodeSwitcher: NodeSwitcher = null;
    @property({ type: Array(Button) })
    private openPageBtns: Button[] = [];
    @property({ type: Array(Button) })
    private closeBtns: Button[] = [];
    @property({ type: Array(Button) })
    private settingBtns: Button[] = [];
    @property({ type: Array(NumberSelector) })
    private betNumericStepper: NumberSelector;
    @property({ type: Button })
    private betBtn: Button = null;
    @property({ type: Button })
    private cashoutBtn: Button = null;
    start() {
        this.openPageBtns.forEach((btn, index) => {
            btn?.node.on(Button.EventType.CLICK, this.openPage.bind(this, index));
        });
        this.closeBtns.forEach((closeBtn) => {
            closeBtn?.node.on(Button.EventType.CLICK, this.closePage.bind(this));
        });
        this.settingBtns.forEach((settingBtn) => {
            settingBtn?.node.on(Button.EventType.CLICK, this.openPage.bind(this, 0));
        });
        this.betBtn.node.on(Button.EventType.CLICK, this.sendBet.bind(this));
        // this.cashoutBtn.node.on(Button.EventType.CLICK,);
        const gameData = GameData.getInstance();
        gameData.on(GmaeModel.Name, this.setID.bind(this));
        gameData.on(GmaeModel.Balance, this.setBalance.bind(this));
        gameData.on(GmaeModel.BetOptions, this.setBetOptions.bind(this));
        gameData.on(GmaeModel.BettingStart, this.setBettingStart.bind(this));
        gameData.on(GmaeModel.BettingCountdown, this.setBettingCountdown.bind(this));
        gameData.on(GmaeModel.RoundCountdown, this.setRoundCountdown.bind(this));
        gameData.on(GmaeModel.Multiplier, this.setMultiplier.bind(this));
        gameData.on(GmaeModel.Explode, this.setExplode.bind(this));

    }

    update(deltaTime: number) {

    }

    private openPage(page: number) {
        this.popupsNodeSwitcher.switch(page);
    }

    private closePage() {
        this.popupsNodeSwitcher.switch(-1);
    }

    private setID(id: string) {
        this.IDLabel.string = id;
    }

    private setBalance(balance: number) {
        const balanceStr = BaseModel.getFormatNum(balance);
        this.balanceLabel.string = balanceStr;
    }

    private setBetOptions(bets: number[]) {
        this.betNumericStepper.Values = bets;
    }

    private setBettingStart(remaining: number) {
        this.stateNodeSwitcher.switch(State.BettingCountdown);
        this.normalNodeSwitcher.switch(Normal.BetNode);
        this.bettingCountdownLabel.string = `${Math.ceil(remaining)}`;
    }

    private setBettingCountdown(remaining: number) {
        this.stateNodeSwitcher.switch(State.BettingCountdown);
        this.normalNodeSwitcher.switch(Normal.BetNode);
        this.bettingCountdownLabel.string = `${Math.ceil(remaining)}s`;
    }

    private setMultiplier(multiplier: number) {
        this.stateNodeSwitcher.switch(State.Multiplier);
        this.normalNodeSwitcher.switch(Normal.CashoutNode);
        this.multiplierLabel.string = `${BaseModel.getRoundToStr(multiplier, 2)}x`;
    }

    private setExplode(multiplier: number) {
        this.stateNodeSwitcher.switch(State.Explode);
        this.explodeLabel.string = `${BaseModel.getRoundToStr(multiplier, 2)}x`;
    }

    private setRoundCountdown(remaining: number) {
        this.roundCountdownLabel.string = `${Math.ceil(remaining)}s`;
    }

    private sendBet() {
        GameData.getInstance().sendBet(this.betNumericStepper.currentValue);
    }
}


