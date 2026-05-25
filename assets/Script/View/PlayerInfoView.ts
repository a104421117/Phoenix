import { _decorator, Component, Label } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { GameData } from '../Model/GameData';
import { GmaeModel } from '../Model/GameData';
const { ccclass, property } = _decorator;

@ccclass('PlayerInfoView')
export class PlayerInfoView extends Component {
    /** 欄位設定。 */
    @property({ type: Label })
    private playerIdLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private walletLabel: Label = null;

    /** start。 */
    start() {
        const gameData = GameData.getInstance();
        GameData.getInstance().onGameState(GmaeModel.PlayerId, this.setPlayerId, this);
        GameData.getInstance().onGameState(GmaeModel.Wallet, this.setWallet, this);

        this.setPlayerId(gameData.PlayerId);
        this.setWallet(gameData.Wallet);
    }

    /**
     * setPlayerId。
     * @param playerId playerId
     */
    private setPlayerId(playerId: string) {
        this.playerIdLabel.string = playerId;
    }

    /**
     * setWallet。
     * @param wallet wallet
     */
    private setWallet(wallet: number) {
        this.walletLabel.string = BaseModel.getMoneyStr(wallet);
    }
}
