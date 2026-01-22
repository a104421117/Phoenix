import { _decorator, Node, Button, Label, tween, Vec3, Color } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents, GameState } from '../Lib/Constants';
import { GameManager } from '../Control/GameManager';
import { ModelManager } from '../Model/ModelManager';

const { ccclass, property } = _decorator;

/**
 * 收錢/結算管理器
 */
@ccclass('TakeOutManager')
export class TakeOutManager extends BaseManager {
    private static _inst: TakeOutManager;
    public static get instance(): TakeOutManager {
        return TakeOutManager._inst;
    }

    @property(Node)
    private takeoutNode: Node = null;

    @property(Button)
    private takeoutBtn: Button = null;

    @property(Label)
    private takeoutLabel: Label = null;

    @property(Label)
    private potentialWinLabel: Label = null;

    @property(Node)
    private winNode: Node = null;

    @property(Label)
    private winAmountLabel: Label = null;

    @property(Label)
    private winMultipleLabel: Label = null;

    @property(Node)
    private lossNode: Node = null;

    @property(Label)
    private lossLabel: Label = null;

    // 顏色
    private readonly COLOR_WIN = new Color(76, 175, 80);
    private readonly COLOR_LOSS = new Color(255, 77, 77);

    protected onManagerLoad(): void {
        TakeOutManager._inst = this;
    }

    public init(): void {
        this._setupListeners();
        this._registerEvents();
        this._hideAll();
    }

    public reset(): void {
        this._hideAll();
    }

    private _setupListeners(): void {
        this.takeoutBtn?.node.on('click', this._onTakeoutClick, this);
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.GAME_STATE_CHANGED, this._onStateChanged, this);
        EventManager.instance.on(GameEvents.BET_CONFIRMED, this._onBetConfirmed, this);
        EventManager.instance.on(GameEvents.MULTIPLE_UPDATE, this._onMultipleUpdate, this);
        EventManager.instance.on(GameEvents.TAKEOUT_SUCCESS, this._onTakeoutSuccess, this);
        EventManager.instance.on(GameEvents.GAME_CRASH, this._onGameCrash, this);
        EventManager.instance.on(GameEvents.GAME_SETTLE, this._onGameSettle, this);
    }

    private _onStateChanged(data: { from: GameState; to: GameState }): void {
        switch (data.to) {
            case GameState.WAGER:
            case GameState.IDLE:
                this._hideAll();
                break;
            case GameState.RUNNING:
                this._checkShowTakeout();
                break;
            case GameState.SETTLE:
                // 保持當前顯示狀態
                break;
        }
    }

    private _onBetConfirmed(data: any): void {
        // 押注確認後，準備在遊戲開始時顯示收錢按鈕
    }

    private _onMultipleUpdate(data: { multiple: number }): void {
        this._updateTakeoutInfo(data.multiple);
    }

    private _onTakeoutClick(): void {
        GameManager.instance.takeout();
    }

    private _onTakeoutSuccess(data: any): void {
        this._showWin(data.multiple, data.winAmount);
    }

    private _onGameCrash(data: { crashPoint: number }): void {
        const betModel = ModelManager.instance.betModel;
        if (betModel.hasBet() && !betModel.hasTakenOut) {
            // 未收錢，顯示虧損
            this._showLoss(betModel.currentBet.amount);
        }
    }

    private _onGameSettle(data: any): void {
        if (data.userResult) {
            if (data.userResult.takeoutMultiple !== null) {
                // 已收錢，顯示獲勝（如果尚未顯示）
            } else if (data.userResult.betAmount > 0) {
                // 未收錢，顯示虧損（如果尚未顯示）
            }
        }
    }

    private _checkShowTakeout(): void {
        const betModel = ModelManager.instance.betModel;
        if (betModel.hasBet() && !betModel.hasTakenOut) {
            this._showTakeout();
        }
    }

    private _showTakeout(): void {
        if (this.takeoutNode) {
            this.takeoutNode.active = true;
        }
        if (this.takeoutBtn) {
            this.takeoutBtn.interactable = true;
        }
        if (this.winNode) {
            this.winNode.active = false;
        }
        if (this.lossNode) {
            this.lossNode.active = false;
        }
    }

    private _updateTakeoutInfo(multiple: number): void {
        const betModel = ModelManager.instance.betModel;
        if (!betModel.hasBet() || betModel.hasTakenOut) return;

        const potentialWin = betModel.calculatePotentialWin(multiple);

        if (this.takeoutLabel) {
            this.takeoutLabel.string = '收錢';
        }
        if (this.potentialWinLabel) {
            this.potentialWinLabel.string = `+${potentialWin.toFixed(0)}`;
        }
    }

    private _showWin(multiple: number, winAmount: number): void {
        // 隱藏收錢按鈕
        if (this.takeoutNode) {
            this.takeoutNode.active = false;
        }

        // 顯示獲勝
        if (this.winNode) {
            this.winNode.active = true;
            this.winNode.setScale(0, 0, 1);

            // 獲勝動畫
            tween(this.winNode)
                .to(0.3, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }

        if (this.winAmountLabel) {
            this.winAmountLabel.string = `+${winAmount.toFixed(0)}`;
            this.winAmountLabel.color = this.COLOR_WIN;
        }

        if (this.winMultipleLabel) {
            this.winMultipleLabel.string = `@${multiple.toFixed(2)}x`;
        }

        if (this.lossNode) {
            this.lossNode.active = false;
        }
    }

    private _showLoss(betAmount: number): void {
        // 隱藏收錢按鈕
        if (this.takeoutNode) {
            this.takeoutNode.active = false;
        }

        // 顯示虧損
        if (this.lossNode) {
            this.lossNode.active = true;
        }

        if (this.lossLabel) {
            this.lossLabel.string = `-${betAmount.toFixed(0)}`;
            this.lossLabel.color = this.COLOR_LOSS;
        }

        if (this.winNode) {
            this.winNode.active = false;
        }
    }

    private _hideAll(): void {
        if (this.takeoutNode) this.takeoutNode.active = false;
        if (this.winNode) this.winNode.active = false;
        if (this.lossNode) this.lossNode.active = false;
    }

    /**
     * 檢查是否可以收錢
     */
    public canTakeout(): boolean {
        return ModelManager.instance.betModel.canTakeout();
    }
}
