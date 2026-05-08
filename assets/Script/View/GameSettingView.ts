import { _decorator, Component, warn } from 'cc';
import { NumberSelector } from '../../Game.Client.Common/NumberSelector';
import { GameData } from '../Model/GameData';
import { GmaeModel } from '../Model/GameModel';
import { EventManager } from '../Model/EventManager';
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
        EventManager.getInstance().gameState.on(GmaeModel.BetOptions, this.setBetOptions, this);
        this.betSelector?.addValueChangedListener(this.onBetSelectorChanged, this);
        this.setBetOptions(this.gameData.BetOptions);
        this.syncSelectedBetUnits();
    }

    protected onDestroy(): void {
        EventManager.getInstance().gameState.off(GmaeModel.BetOptions, this.setBetOptions, this);
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
    private setBetOptions(betOptions: number[]) {
        if (!this.betSelector) return;
        this.betSelector.Values = betOptions ?? [];
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