import { _decorator, CCFloat, CCInteger, Node } from 'cc';
import { GameModel, StateModel } from './Model';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('ModelManager')
export class ModelManager extends Manager {
    @property({ type: StateModel }) public Wager: StateModel = new StateModel();
    @property({ type: GameModel.BetModel }) public BetModel: GameModel.BetModel = new GameModel.BetModel();
    @property({ type: GameModel.MultipleModel }) public MultipleModel: GameModel.MultipleModel = new GameModel.MultipleModel();


    public socket: WebSocket = null;
    public createrSocket(socketUrl: string, callback: Function) {
        // this.socket = new WebSocket(socketUrl);
        this.scheduleOnce(() => {
            callback(true);
        }, 0.1);
    }
}