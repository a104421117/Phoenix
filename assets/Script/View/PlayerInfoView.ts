import { _decorator, Component, Label } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { GameData } from '../Model/GameData';
import { GmaeModel } from '../Model/GameModel';
import { EventManager } from '../Model/EventManager';
const { ccclass, property } = _decorator;

@ccclass('PlayerInfoView')
export class PlayerInfoView extends Component {
    /** 欄位設定。 */
    @property({ type: Label })
    private playerIdLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private balanceLabel: Label = null;

    /** start。 */
    start() {
        const gameData = GameData.getInstance();
        EventManager.getInstance().gameState.on(GmaeModel.PlayerId, this.setPlayerId, this);
        EventManager.getInstance().gameState.on(GmaeModel.Balance, this.setBalance, this);

        this.setPlayerId(gameData.PlayerId);
        this.setBalance(gameData.Balance);
    }

    /**
     * setPlayerId。
     * @param playerId playerId
     */
    private setPlayerId(playerId: string) {
        this.playerIdLabel.string = playerId;
    }

    /**
     * setBalance。
     * @param balance balance
     */
    private setBalance(balance: number) {
        this.balanceLabel.string = BaseModel.getFormatNum(balance);
    }
}
