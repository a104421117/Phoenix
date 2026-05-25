import { _decorator } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';

const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends BaseModel.ComponentSingleton {
    start() {
    }
}
