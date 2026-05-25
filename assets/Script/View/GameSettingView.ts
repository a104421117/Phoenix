import { _decorator, Component, warn } from 'cc';
import { NumberSelector } from '../../Game.Client.Common/NumberSelector';
import { GameData } from '../Model/GameData';
import { GmaeModel } from '../Model/GameData';
import { GameController } from '../Controller/GameController';
const { ccclass, property } = _decorator;

@ccclass('GameSettingView')
export class GameSettingView extends Component {
    /** 賭注選擇器 */
    @property({ type: NumberSelector })
    private betSelector: NumberSelector = null;

    private gameData: GameData = null;

    /** 初始化 */
    start() {
        this.resolveBetSelector();

        this.gameData = GameData.getInstance();
        GameData.getInstance().onGameState(GmaeModel.BetLevels, this.setBetLevels, this);
        this.betSelector?.addValueChangedListener(this.onBetSelectorChanged, this);
        this.setBetLevels(this.gameData.BetLevels);
        this.syncSelectedBetUnits();
    }

    protected onDestroy(): void {
        GameData.getInstance().offGameState(GmaeModel.BetLevels, this.setBetLevels, this);
        if (this.betSelector?.isValid) {
            this.betSelector.removeValueChangedListener(this.onBetSelectorChanged, this);
        }
    }

    private resolveBetSelector() {
        if (this.betSelector?.isValid) return;

        this.betSelector = this.getComponentInChildren(NumberSelector);
        if (this.betSelector?.isValid) return;

        warn('[GameSettingView] betSelector is not assigned and cannot be auto-resolved.');
    }

    /** 設定投注選項 */
    private setBetLevels(betLevels: number[]) {
        if (!this.betSelector) return;
        this.betSelector.Values = betLevels ?? [];
        this.syncSelectedBetUnits();
    }

    private onBetSelectorChanged(value: number) {
        if (!this.gameData) return;
        GameController.getInstance().selectBetUnits(value);
    }

    private syncSelectedBetUnits() {
        if (!this.gameData || !this.betSelector) return;
        GameController.getInstance().selectBetUnits(this.betSelector.currentValue);
    }
}
