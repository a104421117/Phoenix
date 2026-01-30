import { _decorator, Button, Component, Label, Node } from 'cc';
import { NodeSwitcher } from '../../Base/NodeSwitcher';
import { BaseModel } from '../../Base/BaseModel';
import { NumberSelector } from '../../Base/NumberSelector';
import { GameData, Model } from '../Model/GameData';
const { ccclass, property } = _decorator;

@ccclass('ViewManager')
export class ViewManager extends BaseModel.Singleton<ViewManager> {
    @property({ type: Label })
    private IDLabel: Label = null;
    @property({ type: Label })
    private balanceLabel: Label = null;
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

    start() {
        this.openPageBtns.forEach((btn, index) => {
            if (btn) btn.node.on(Button.EventType.CLICK, this.openPage.bind(this, index));
        });
        this.closeBtns.forEach((closeBtn) => {
            closeBtn.node.on(Button.EventType.CLICK, this.closePage.bind(this));
        });
        this.settingBtns.forEach((settingBtn) => {
            settingBtn.node.on(Button.EventType.CLICK, this.openPage.bind(this, 0));
        });
        const gameData = GameData.getInstance();
        gameData.on(Model.ID, this.setID.bind(this));
        gameData.on(Model.Balance, this.setBalance.bind(this));
        gameData.on(Model.BetOptions, this.setBetOptions.bind(this));
        // gameData.on(Model.ID, this.setID.bind(this));
        // gameData.on(Model.ID, this.setID.bind(this));

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
}


