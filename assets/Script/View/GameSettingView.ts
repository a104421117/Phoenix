import { _decorator, Component } from 'cc';
import { NumberSelector } from '../../Base/NumberSelector';
import { GameData, GmaeModel } from '../Model/GameData';
const { ccclass, property } = _decorator;

@ccclass('GameSettingView')
export class GameSettingView extends Component {
    /** 欄位設定。 */
    @property({ type: NumberSelector })
    private betSelector: NumberSelector = null;

    /** start。 */
    start() {
        const gameData = GameData.getInstance();
        gameData.on(GmaeModel.BetOptions, this.setBetOptions, this);
        this.setBetOptions(gameData.BetOptions);
    }

    /**
     * setBetOptions。
     * @param betOptions betOptions
     */
    private setBetOptions(betOptions: number[]) {
        this.betSelector.Values = betOptions;
    }
}
