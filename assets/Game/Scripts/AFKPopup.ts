import { _decorator, Component, Node, Label, Button, Toggle, tween, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
import { gameEvents } from './GameManager';
import { PopupBase } from '../../Base/Scripts/PopupBase';

const { ccclass, property } = _decorator;

/**
 * 掛機設定彈窗（1.9新增功能）
 *
 * 功能說明：
 * 1. 每局投注額 - 依照預設額度調整
 * 2. 投注總額 - 非必要，達到後自動停止
 * 3. 自動局數 - 設定自動遊戲次數
 * 4. 自動領回 - 設定自動取出倍數（不勾選則不會自動領回）
 *
 * 若2/3同時勾選，先達到的目標為停止標準
 */

// 掛機設定事件
export enum AFKEvent {
    AFK_STARTED = 'afk_started',
    AFK_STOPPED = 'afk_stopped',
    AFK_ROUND_COMPLETE = 'afk_round_complete'
}

// 掛機設定數據
export interface AFKSettings {
    betPerRound: number;        // 每局投注額
    useTotalBetLimit: boolean;  // 是否啟用總額限制
    totalBetLimit: number;      // 投注總額上限
    useRoundsLimit: boolean;    // 是否啟用局數限制（默認啟用）
    roundsLimit: number;        // 自動局數
    useAutoCashout: boolean;    // 是否啟用自動領回
    autoCashoutMultiplier: number; // 自動領回倍數
}

@ccclass('AFKPopup')
export class AFKPopup extends PopupBase {
    // === Row 1: 每局投注 ===
    @property(Label)
    betPerRoundLabel: Label = null;

    @property(Button)
    betPerRoundMinusBtn: Button = null;

    @property(Button)
    betPerRoundPlusBtn: Button = null;

    // === Row 2: 投注總額 ===
    @property(Toggle)
    totalBetToggle: Toggle = null;

    @property(Label)
    totalBetLabel: Label = null;

    @property(Button)
    totalBetMinusBtn: Button = null;

    @property(Button)
    totalBetPlusBtn: Button = null;

    // === Row 3: 自動局數 ===
    @property(Label)
    roundsLabel: Label = null;

    @property(Button)
    roundsMinusBtn: Button = null;

    @property(Button)
    roundsPlusBtn: Button = null;

    // === Row 4: 自動領回 ===
    @property(Toggle)
    autoCashoutToggle: Toggle = null;

    @property(Label)
    autoCashoutLabel: Label = null;

    @property(Button)
    autoCashoutMinusBtn: Button = null;

    @property(Button)
    autoCashoutPlusBtn: Button = null;

    // === 開始按鈕 ===
    @property(Button)
    startButton: Button = null;

    @property(Label)
    startButtonLabel: Label = null;

    // 當前設定
    private _settings: AFKSettings = {
        betPerRound: 1000,
        useTotalBetLimit: false,
        totalBetLimit: 100000,
        useRoundsLimit: true,
        roundsLimit: 100,
        useAutoCashout: true,
        autoCashoutMultiplier: 2.0
    };

    // 掛機狀態
    private _isAFKActive: boolean = false;
    private _currentTotalBet: number = 0;
    private _currentRounds: number = 0;

    get settings(): AFKSettings { return { ...this._settings }; }
    get isAFKActive(): boolean { return this._isAFKActive; }

    onLoad() {
        super.onLoad();
        this.initUI();
    }

    private initUI() {
        this.updateAllLabels();
        this.updateStartButton();
    }

    // === 每局投注 ===
    onBetPerRoundMinus() {
        const step = this.getBetStep(this._settings.betPerRound);
        this._settings.betPerRound = Math.max(
            GameConfig.AFK_MIN_BET_PER_ROUND,
            this._settings.betPerRound - step
        );
        this.updateBetPerRoundLabel();
    }

    onBetPerRoundPlus() {
        const step = this.getBetStep(this._settings.betPerRound);
        this._settings.betPerRound = Math.min(
            GameConfig.AFK_MAX_BET_PER_ROUND,
            this._settings.betPerRound + step
        );
        this.updateBetPerRoundLabel();
    }

    private getBetStep(currentValue: number): number {
        // 根據當前值動態調整步長
        if (currentValue < 100) return 10;
        if (currentValue < 1000) return 100;
        if (currentValue < 10000) return 1000;
        return 10000;
    }

    private updateBetPerRoundLabel() {
        if (this.betPerRoundLabel) {
            this.betPerRoundLabel.string = this.formatNumber(this._settings.betPerRound);
        }
    }

    // === 投注總額 ===
    onTotalBetToggle(toggle: Toggle) {
        this._settings.useTotalBetLimit = toggle.isChecked;
        this.updateTotalBetUI();
    }

    onTotalBetMinus() {
        const step = this.getBetStep(this._settings.totalBetLimit);
        this._settings.totalBetLimit = Math.max(
            GameConfig.AFK_MIN_TOTAL_BET,
            this._settings.totalBetLimit - step
        );
        this.updateTotalBetLabel();
    }

    onTotalBetPlus() {
        const step = this.getBetStep(this._settings.totalBetLimit);
        this._settings.totalBetLimit = Math.min(
            GameConfig.AFK_MAX_TOTAL_BET,
            this._settings.totalBetLimit + step
        );
        this.updateTotalBetLabel();
    }

    private updateTotalBetUI() {
        const enabled = this._settings.useTotalBetLimit;
        if (this.totalBetMinusBtn) this.totalBetMinusBtn.interactable = enabled;
        if (this.totalBetPlusBtn) this.totalBetPlusBtn.interactable = enabled;
        if (this.totalBetLabel) {
            this.totalBetLabel.node.active = enabled;
        }
    }

    private updateTotalBetLabel() {
        if (this.totalBetLabel) {
            this.totalBetLabel.string = this.formatNumber(this._settings.totalBetLimit);
        }
    }

    // === 自動局數 ===
    onRoundsMinus() {
        this._settings.roundsLimit = Math.max(
            GameConfig.AFK_MIN_ROUNDS,
            this._settings.roundsLimit - 10
        );
        this.updateRoundsLabel();
    }

    onRoundsPlus() {
        this._settings.roundsLimit = Math.min(
            GameConfig.AFK_MAX_ROUNDS,
            this._settings.roundsLimit + 10
        );
        this.updateRoundsLabel();
    }

    private updateRoundsLabel() {
        if (this.roundsLabel) {
            this.roundsLabel.string = this._settings.roundsLimit.toString();
        }
    }

    // === 自動領回 ===
    onAutoCashoutToggle(toggle: Toggle) {
        this._settings.useAutoCashout = toggle.isChecked;
        this.updateAutoCashoutUI();
    }

    onAutoCashoutMinus() {
        this._settings.autoCashoutMultiplier = Math.max(
            GameConfig.AUTO_CASHOUT_MIN,
            Math.round((this._settings.autoCashoutMultiplier - 0.1) * 100) / 100
        );
        this.updateAutoCashoutLabel();
    }

    onAutoCashoutPlus() {
        this._settings.autoCashoutMultiplier = Math.min(
            GameConfig.AUTO_CASHOUT_MAX,
            Math.round((this._settings.autoCashoutMultiplier + 0.1) * 100) / 100
        );
        this.updateAutoCashoutLabel();
    }

    private updateAutoCashoutUI() {
        const enabled = this._settings.useAutoCashout;
        if (this.autoCashoutMinusBtn) this.autoCashoutMinusBtn.interactable = enabled;
        if (this.autoCashoutPlusBtn) this.autoCashoutPlusBtn.interactable = enabled;
    }

    private updateAutoCashoutLabel() {
        if (this.autoCashoutLabel) {
            this.autoCashoutLabel.string = this._settings.autoCashoutMultiplier.toFixed(2) + 'x';
        }
    }

    // === 開始/停止按鈕 ===
    onStartClick() {
        if (this._isAFKActive) {
            this.stopAFK();
        } else {
            this.startAFK();
        }
    }

    private startAFK() {
        this._isAFKActive = true;
        this._currentTotalBet = 0;
        this._currentRounds = 0;

        this.updateStartButton();
        gameEvents.emit(AFKEvent.AFK_STARTED, this._settings);

        // 關閉彈窗
        this.hide();

        console.log('[AFKPopup] 掛機開始', this._settings);
    }

    private stopAFK() {
        this._isAFKActive = false;
        this.updateStartButton();
        gameEvents.emit(AFKEvent.AFK_STOPPED);

        console.log('[AFKPopup] 掛機停止');
    }

    /**
     * 每局結束時由外部調用，檢查是否達到停止條件
     * @param betAmount 本局投注額
     */
    onRoundComplete(betAmount: number) {
        if (!this._isAFKActive) return;

        this._currentTotalBet += betAmount;
        this._currentRounds++;

        gameEvents.emit(AFKEvent.AFK_ROUND_COMPLETE, {
            currentTotalBet: this._currentTotalBet,
            currentRounds: this._currentRounds
        });

        // 檢查停止條件
        let shouldStop = false;
        let reason = '';

        // 檢查總額限制
        if (this._settings.useTotalBetLimit &&
            this._currentTotalBet >= this._settings.totalBetLimit) {
            shouldStop = true;
            reason = '已達投注總額上限';
        }

        // 檢查局數限制
        if (this._settings.useRoundsLimit &&
            this._currentRounds >= this._settings.roundsLimit) {
            shouldStop = true;
            reason = '已達自動局數上限';
        }

        if (shouldStop) {
            console.log(`[AFKPopup] 自動停止: ${reason}`);
            this.stopAFK();
        }
    }

    private updateStartButton() {
        if (this.startButtonLabel) {
            this.startButtonLabel.string = this._isAFKActive ? '停止' : '開始';
        }
    }

    private updateAllLabels() {
        this.updateBetPerRoundLabel();
        this.updateTotalBetLabel();
        this.updateRoundsLabel();
        this.updateAutoCashoutLabel();
        this.updateTotalBetUI();
        this.updateAutoCashoutUI();

        // 設置 Toggle 初始狀態
        if (this.totalBetToggle) {
            this.totalBetToggle.isChecked = this._settings.useTotalBetLimit;
        }
        if (this.autoCashoutToggle) {
            this.autoCashoutToggle.isChecked = this._settings.useAutoCashout;
        }
    }

    private formatNumber(num: number): string {
        if (num >= 10000) {
            return (num / 10000).toFixed(2) + '萬';
        }
        return num.toLocaleString();
    }

    // === 覆寫 PopupBase 方法 ===
    show() {
        super.show();
        this.updateAllLabels();
        this.updateStartButton();
    }
}