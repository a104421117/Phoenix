import { GameModel } from './GameModel';
import { BetModel } from './BetModel';
import { MultipleModel } from './MultipleModel';
import { UserModel } from './UserModel';
import { HistoryModel } from './HistoryModel';

/**
 * 數據模型管理器（單例模式）
 * 統一管理所有遊戲數據模型
 */
export class ModelManager {
    private static _instance: ModelManager;

    private _gameModel: GameModel;
    private _betModel: BetModel;
    private _multipleModel: MultipleModel;
    private _userModel: UserModel;
    private _historyModel: HistoryModel;

    private constructor() {
        this._gameModel = new GameModel();
        this._betModel = new BetModel();
        this._multipleModel = new MultipleModel();
        this._userModel = new UserModel();
        this._historyModel = new HistoryModel();
    }

    /**
     * 獲取單例實例
     */
    public static get instance(): ModelManager {
        if (!ModelManager._instance) {
            ModelManager._instance = new ModelManager();
        }
        return ModelManager._instance;
    }

    /**
     * 遊戲狀態模型
     */
    public get gameModel(): GameModel {
        return this._gameModel;
    }

    /**
     * 押注數據模型
     */
    public get betModel(): BetModel {
        return this._betModel;
    }

    /**
     * 倍數數據模型
     */
    public get multipleModel(): MultipleModel {
        return this._multipleModel;
    }

    /**
     * 用戶數據模型
     */
    public get userModel(): UserModel {
        return this._userModel;
    }

    /**
     * 歷史記錄模型
     */
    public get historyModel(): HistoryModel {
        return this._historyModel;
    }

    /**
     * 重置所有模型
     */
    public resetAll(): void {
        this._gameModel.reset();
        this._betModel.reset();
        this._multipleModel.reset();
    }

    /**
     * 為新回合重置（保留用戶信息和歷史記錄）
     */
    public resetForNewRound(): void {
        this._betModel.reset();
        this._multipleModel.reset();
    }

    /**
     * 完全重置（包括用戶信息和歷史記錄）
     */
    public resetComplete(): void {
        this._gameModel.reset();
        this._betModel.reset();
        this._multipleModel.reset();
        this._userModel.reset();
        this._historyModel.clear();
    }
}
