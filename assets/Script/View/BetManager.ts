import { _decorator, Node, Button, Label, EditBox, Toggle } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents, GameState } from '../Lib/Constants';
import { GameManager } from '../Control/GameManager';
import { ModelManager } from '../Model/ModelManager';

const { ccclass, property } = _decorator;

/**
 * 押注 UI 管理器
 */
@ccclass('BetManager')
export class BetManager extends BaseManager {
    private static _inst: BetManager;
    public static get instance(): BetManager {
        return BetManager._inst;
    }

    @property(Node)
    private betNode: Node = null;

    @property(Button)
    private betBtn: Button = null;

    @property(Button)
    private minusBtn: Button = null;

    @property(Button)
    private plusBtn: Button = null;

    @property(Label)
    private betAmountLabel: Label = null;

    @property(Label)
    private balanceLabel: Label = null;

    @property(Toggle)
    private autoToggle: Toggle = null;

    @property(EditBox)
    private autoMultipleInput: EditBox = null;

    @property(Node)
    private betConfirmedNode: Node = null;

    @property(Label)
    private betConfirmedLabel: Label = null;

    private _currentBetIndex: number = 0;
    private _isAutoBet: boolean = false;

    protected onManagerLoad(): void {
        BetManager._inst = this;
    }

    public init(): void {
        this._setupListeners();
        this._registerEvents();
        this._updateUI();
    }

    public reset(): void {
        this._currentBetIndex = 0;
        this._isAutoBet = false;
        this._updateUI();
        this._showBetUI();
    }

    private _setupListeners(): void {
        this.betBtn?.node.on('click', this._onBetClick, this);
        this.minusBtn?.node.on('click', this._onMinusClick, this);
        this.plusBtn?.node.on('click', this._onPlusClick, this);
        this.autoToggle?.node.on('toggle', this._onAutoToggle, this);
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.GAME_STATE_CHANGED, this._onStateChanged, this);
        EventManager.instance.on(GameEvents.BET_CONFIRMED, this._onBetConfirmed, this);
        EventManager.instance.on(GameEvents.BET_FAILED, this._onBetFailed, this);
        EventManager.instance.on(GameEvents.USER_INFO_UPDATE, this._onUserInfoUpdate, this);
        EventManager.instance.on(GameEvents.BALANCE_UPDATE, this._onBalanceUpdate, this);
    }

    private _onStateChanged(data: { from: GameState; to: GameState }): void {
        switch (data.to) {
            case GameState.WAGER:
                this._showBetUI();
                this._setInteractable(true);
                break;
            case GameState.RUNNING:
            case GameState.CRASHED:
            case GameState.SETTLE:
                this._setInteractable(false);
                break;
            case GameState.IDLE:
                this._showBetUI();
                this._setInteractable(false);
                break;
        }
    }

    private _onBetClick(): void {
        const config = GameManager.instance.config;
        const amount = config.betOptions[this._currentBetIndex];

        let autoTakeout: number | undefined;
        if (this._isAutoBet && this.autoMultipleInput) {
            const value = parseFloat(this.autoMultipleInput.string);
            if (!isNaN(value) && value > 1) {
                autoTakeout = value;
            }
        }

        GameManager.instance.placeBet(amount, autoTakeout);
    }

    private _onMinusClick(): void {
        if (this._currentBetIndex > 0) {
            this._currentBetIndex--;
            this._updateBetAmount();
        }
    }

    private _onPlusClick(): void {
        const config = GameManager.instance.config;
        if (this._currentBetIndex < config.betOptions.length - 1) {
            this._currentBetIndex++;
            this._updateBetAmount();
        }
    }

    private _onAutoToggle(): void {
        this._isAutoBet = this.autoToggle?.isChecked ?? false;
        if (this.autoMultipleInput) {
            this.autoMultipleInput.node.active = this._isAutoBet;
        }
    }

    private _onBetConfirmed(data: any): void {
        this._setInteractable(false);
        this._showBetConfirmed(data.betAmount);
        this._updateBalance();
    }

    private _onBetFailed(error: string): void {
        EventManager.instance.emit(GameEvents.SHOW_MESSAGE, error);
    }

    private _onUserInfoUpdate(data: any): void {
        this._updateBalance();
    }

    private _onBalanceUpdate(): void {
        this._updateBalance();
    }

    private _updateUI(): void {
        this._updateBetAmount();
        this._updateBalance();

        if (this.autoMultipleInput) {
            this.autoMultipleInput.node.active = this._isAutoBet;
        }
    }

    private _updateBetAmount(): void {
        const config = GameManager.instance.config;
        const amount = config.betOptions[this._currentBetIndex];
        if (this.betAmountLabel) {
            this.betAmountLabel.string = amount.toLocaleString();
        }

        // 更新按鈕狀態
        if (this.minusBtn) {
            this.minusBtn.interactable = this._currentBetIndex > 0;
        }
        if (this.plusBtn) {
            this.plusBtn.interactable = this._currentBetIndex < config.betOptions.length - 1;
        }
    }

    private _updateBalance(): void {
        if (this.balanceLabel) {
            const balance = ModelManager.instance.userModel.balance;
            this.balanceLabel.string = balance.toLocaleString();
        }
    }

    private _setInteractable(enabled: boolean): void {
        if (this.betBtn) this.betBtn.interactable = enabled;
        if (this.minusBtn) this.minusBtn.interactable = enabled && this._currentBetIndex > 0;
        if (this.plusBtn) {
            const config = GameManager.instance.config;
            this.plusBtn.interactable = enabled && this._currentBetIndex < config.betOptions.length - 1;
        }
        if (this.autoToggle) this.autoToggle.interactable = enabled;
        if (this.autoMultipleInput) this.autoMultipleInput.enabled = enabled;
    }

    private _showBetUI(): void {
        if (this.betNode) {
            this.betNode.active = true;
        }
        if (this.betConfirmedNode) {
            this.betConfirmedNode.active = false;
        }
    }

    private _showBetConfirmed(amount: number): void {
        if (this.betNode) {
            this.betNode.active = false;
        }
        if (this.betConfirmedNode) {
            this.betConfirmedNode.active = true;
        }
        if (this.betConfirmedLabel) {
            this.betConfirmedLabel.string = `已押注 ${amount.toLocaleString()}`;
        }
    }

    /**
     * 設置押注金額（外部調用）
     */
    public setBetAmount(amount: number): void {
        const config = GameManager.instance.config;
        const index = config.betOptions.indexOf(amount);
        if (index >= 0) {
            this._currentBetIndex = index;
            this._updateBetAmount();
        }
    }

    /**
     * 獲取當前選中的押注金額
     */
    public getCurrentBetAmount(): number {
        const config = GameManager.instance.config;
        return config.betOptions[this._currentBetIndex];
    }
}
