import { _decorator } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { GameController } from './GameController';

const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends BaseModel.ComponentSingleton {
    start() {
        GameController.getInstance().bootstrapGame();
    }
}
