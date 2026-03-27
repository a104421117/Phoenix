import { _decorator, Component, Label } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { GameData, GmaeModel } from '../Model/GameData';
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
        gameData.on(GmaeModel.PlayerId, this.setPlayerId, this);
        gameData.on(GmaeModel.Balance, this.setBalance, this);

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
