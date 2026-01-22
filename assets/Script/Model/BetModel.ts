/**
 * 押注數據接口
 */
export interface BetData {
    amount: number;
    autoTakeout: number | null;
    isConfirmed: boolean;
}

/**
 * 結算結果接口
 */
export interface SettleResult {
    betAmount: number;
    takeoutMultiple: number | null;
    winAmount: number;
}

/**
 * 押注數據模型
 */
export class BetModel {
    private _currentBet: BetData = {
        amount: 0,
        autoTakeout: null,
        isConfirmed: false
    };
    private _hasTakenOut: boolean = false;
    private _takeoutMultiple: number = 0;
    private _winAmount: number = 0;
    private _lastBetAmount: number = 0;

    /**
     * 當前押注數據
     */
    public get currentBet(): BetData {
        return { ...this._currentBet };
    }

    /**
     * 是否已收錢
     */
    public get hasTakenOut(): boolean {
        return this._hasTakenOut;
    }

    /**
     * 收錢時的倍數
     */
    public get takeoutMultiple(): number {
        return this._takeoutMultiple;
    }

    /**
     * 獲勝金額
     */
    public get winAmount(): number {
        return this._winAmount;
    }

    /**
     * 上次押注金額
     */
    public get lastBetAmount(): number {
        return this._lastBetAmount;
    }

    /**
     * 設置押注金額
     */
    public setBetAmount(amount: number): void {
        this._currentBet.amount = amount;
    }

    /**
     * 設置自動收錢倍數
     */
    public setAutoTakeout(multiple: number | null): void {
        this._currentBet.autoTakeout = multiple;
    }

    /**
     * 確認押注
     */
    public confirmBet(amount: number): void {
        this._currentBet.amount = amount;
        this._currentBet.isConfirmed = true;
        this._lastBetAmount = amount;
    }

    /**
     * 設置收錢結果
     */
    public setTakeoutResult(multiple: number, winAmount: number): void {
        this._hasTakenOut = true;
        this._takeoutMultiple = multiple;
        this._winAmount = winAmount;
    }

    /**
     * 設置結算結果
     */
    public setSettleResult(result: SettleResult): void {
        if (result.takeoutMultiple !== null) {
            this._hasTakenOut = true;
            this._takeoutMultiple = result.takeoutMultiple;
        }
        this._winAmount = result.winAmount;
    }

    /**
     * 重置狀態（新回合開始時調用）
     */
    public reset(): void {
        this._currentBet = {
            amount: 0,
            autoTakeout: null,
            isConfirmed: false
        };
        this._hasTakenOut = false;
        this._takeoutMultiple = 0;
        this._winAmount = 0;
    }

    /**
     * 是否已押注
     */
    public hasBet(): boolean {
        return this._currentBet.isConfirmed && this._currentBet.amount > 0;
    }

    /**
     * 是否可以收錢
     */
    public canTakeout(): boolean {
        return this.hasBet() && !this._hasTakenOut;
    }

    /**
     * 計算潛在獲勝金額
     */
    public calculatePotentialWin(multiple: number): number {
        if (!this.hasBet()) return 0;
        return this._currentBet.amount * multiple;
    }

    /**
     * 是否設置了自動收錢
     */
    public hasAutoTakeout(): boolean {
        return this._currentBet.autoTakeout !== null && this._currentBet.autoTakeout > 1;
    }

    /**
     * 檢查是否應該自動收錢
     */
    public shouldAutoTakeout(currentMultiple: number): boolean {
        if (!this.hasAutoTakeout() || !this.canTakeout()) return false;
        return currentMultiple >= this._currentBet.autoTakeout!;
    }
}
