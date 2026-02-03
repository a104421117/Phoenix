import { _decorator, Component, Node } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { GameData } from '../Model/GameData';
import { WebsocketManager, ServerCmd, ClientCmd } from '../Model/WebsocketManager';
import { Bet } from '../Model/ClientModel';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends BaseModel.Singleton<GameManager> {
    start() {
        const websocketManager = new WebsocketManager("ws://localhost:7070/ws/fengfeifei%40%24_%24%40Jack?table=A",
            (ws: WebSocket) => { },
            (event: CloseEvent) => { }
        );
        const gameData = GameData.getInstance();
        websocketManager.on(ServerCmd.Login, gameData.login.bind(gameData));
        websocketManager.on(ServerCmd.BettingStart, gameData.bettingStart.bind(gameData));
        // websocketManager.onMsg(ServerCmd.BetOK, gameData.bettingStart.bind(gameData));
        // websocketManager.onMsg(ServerCmd.RoundStart, gameData.roundStart.bind(gameData));
        websocketManager.on(ServerCmd.Flying, gameData.flying.bind(gameData));
        websocketManager.on(ServerCmd.Explode, gameData.explode.bind(gameData));
    }

    update(deltaTime: number) {

    }

    public betToServer(index: number, amount: number) {
        const bet: Bet = {
            index: 0,
            amount: 0
        }
        WebsocketManager.getInstance().send(ClientCmd.Bet, bet);
    }
}
