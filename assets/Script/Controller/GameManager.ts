import { _decorator, Component, Node } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { GameData } from '../Model/GameData';
import { WebsocketManager, ServerCmd } from '../Model/WebsocketManager';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends BaseModel.Singleton<GameManager> {
    start() {
        const websocketManager = new WebsocketManager("ws://localhost:7070/ws/fengfeifei%40%24_%24%40Jack?table=A",
            (ws: WebSocket) => { },
            (event: CloseEvent) => { }
        );
        const gameData = GameData.getInstance();
        websocketManager.onMsg(ServerCmd.Login, gameData.login.bind(gameData));
        websocketManager.onMsg(ServerCmd.BettingStart, gameData.bettingStart.bind(gameData));

    }

    update(deltaTime: number) {

    }
}
