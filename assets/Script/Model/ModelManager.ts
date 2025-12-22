import { _decorator, Node } from 'cc';
import { GameModel, StateModel } from './Model';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('ModelManager')
export class ModelManager extends Manager {
    @property({ type: StateModel }) public Wager: StateModel = new StateModel();
    @property({ type: GameModel.BetModel }) public BetModel: GameModel.BetModel = new GameModel.BetModel();
    @property({ type: GameModel.MultipleModel }) public MultipleModel: GameModel.MultipleModel = new GameModel.MultipleModel();
    @property({ type: GameModel.RankModel }) public RankModel: GameModel.RankModel = new GameModel.RankModel();
}