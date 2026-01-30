import { _decorator, Component, Node } from 'cc';
import { Login, ServerCmd, WebsocketManager } from '../Model/SocketManager';
import { BaseModel } from '../../Base/BaseModel';
import { GameData } from '../Model/GameData';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends BaseModel.Singleton<GameManager> {
    start() {
        const websocketManager = new WebsocketManager("ws://localhost:7070/ws/fengfeifei%40%24_%24%40Jack?table=A",
            (ws: WebSocket) => { },
            (event: CloseEvent) => { }
        );
        websocketManager.on(ServerCmd.Login, GameData.getInstance().init.bind(GameData.getInstance()));
        websocketManager.on(ServerCmd.BettingStart, ((data) => {  }));
    }

    update(deltaTime: number) {

    }

}


