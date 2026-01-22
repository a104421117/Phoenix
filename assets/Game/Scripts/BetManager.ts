import { _decorator, Component, Node } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, gameEvents, GameEvent, BetEntry } from './GameManager';

const { ccclass, property } = _decorator;

// 押注事件
export enum BetEvent {
    BET_AMOUNT_CHANGED = 'bet_amount_changed',
    BET_LIST_CHANGED = 'bet_list_changed',
    BALANCE_CHANGED = 'balance_changed',
    AUTO_CASHOUT_CHANGED = 'auto_cashout_changed',
    ROUND_RESULT = 'round_result'
}

@ccclass('BetManager')
export class BetManager extends Component {
    // 玩家餘額
    private _balance: number = 100000;

    // 當前押注金額設定
    private _currentBetAmount: number = 1000;

    // 當局押注列表
    private _bets: BetEntry[] = [];

    // 自動取出設定
    private _autoCashoutEnabled: boolean = false;
    private _autoCashoutMultiplier: number = 2.0;

    // 最近使用的自動取出倍數（最多4個）
    private _recentAutoCashout: number[] = [1.2, 1.5, 2.0, 3.0];

    // 上一局押注記錄（用於重複上局）
    private _lastRoundBets: number[] = [];

    // 當局結果
    private _roundProfit: number = 0;

    get balance(): number { return this._balance; }
    get currentBetAmount(): number { return this._currentBetAmount; }
    get bets(): BetEntry[] { return this._bets; }
    get autoCashoutEnabled(): boolean { return this._autoCashoutEnabled; }
    get autoCashoutMultiplier(): number { return this._autoCashoutMultiplier; }
    get recentAutoCashout(): number[] { return this._recentAutoCashout; }
    get roundProfit(): number { return this._roundProfit; }
    get canBet(): boolean {
        return GameManager.instance?.gameState === GameConfig.STATE_BETTING &&
               this._bets.length < GameConfig.MAX_BET_COUNT &&
               this._currentBetAmount <= this._balance;
    }
    get canCashout(): boolean {
        return GameManager.instance?.gameState === GameConfig.STATE_FLYING &&
               this._bets.some(bet => !bet.cashedOut);
    }
    get hasLastRoundBets(): boolean {
        return this._lastRoundBets.length > 0;
    }

    onLoad() {
        // 監聽遊戲事件
        gameEvents.on(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
    }

    onDestroy() {
        gameEvents.off(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
    }

    private onGameStateChanged(state: number) {
        if (state === GameConfig.STATE_BETTING) {
            // 新局開始，清空當局押注
            this.resetForNewRound();
        }
    }

    /**
     * 重置為新一局
     */
    resetForNewRound() {
        // 保存上一局押注
        if (this._bets.length > 0) {
            this._lastRoundBets = this._bets.map(bet => bet.amount);
        }

        this._bets = [];
        this._roundProfit = 0;
        gameEvents.emit(BetEvent.BET_LIST_CHANGED, this._bets);
    }

    /**
     * 增加押注金額
     */
    increaseBetAmount() {
        const newAmount = this._currentBetAmount + GameConfig.BET_STEP;
        if (newAmount <= GameConfig.MAX_BET && newAmount <= this._balance) {
            this._currentBetAmount = newAmount;
            gameEvents.emit(BetEvent.BET_AMOUNT_CHANGED, this._currentBetAmount);
        }
    }

    /**
     * 減少押注金額
     */
    decreaseBetAmount() {
        const newAmount = this._currentBetAmount - GameConfig.BET_STEP;
        if (newAmount >= GameConfig.MIN_BET) {
            this._currentBetAmount = newAmount;
            gameEvents.emit(BetEvent.BET_AMOUNT_CHANGED, this._currentBetAmount);
        }
    }

    /**
     * 設定押注金額
     */
    setBetAmount(amount: number) {
        amount = Math.max(GameConfig.MIN_BET, Math.min(amount, GameConfig.MAX_BET, this._balance));
        this._currentBetAmount = amount;
        gameEvents.emit(BetEvent.BET_AMOUNT_CHANGED, this._currentBetAmount);
    }

    /**
     * 押注
     */
    placeBet(): boolean {
        if (!this.canBet) {
            console.log('[BetManager] 無法押注');
            return false;
        }

        // 扣除餘額
        this._balance -= this._currentBetAmount;

        // 添加押注
        this._bets.push({
            amount: this._currentBetAmount,
            cashedOut: false,
            cashoutMultiplier: 0,
            profit: 0
        });

        gameEvents.emit(BetEvent.BET_LIST_CHANGED, this._bets);
        gameEvents.emit(BetEvent.BALANCE_CHANGED, this._balance);
        gameEvents.emit(GameEvent.BET_PLACED, this._bets.length - 1);

        console.log(`[BetManager] 押注 ${this._currentBetAmount}, 餘額: ${this._balance}`);
        return true;
    }

    /**
     * 重複上一局押注
     */
    repeatLastBets(): boolean {
        if (!this.hasLastRoundBets) return false;
        if (GameManager.instance?.gameState !== GameConfig.STATE_BETTING) return false;

        const totalNeeded = this._lastRoundBets.reduce((sum, amt) => sum + amt, 0);
        if (totalNeeded > this._balance) {
            console.log('[BetManager] 餘額不足以重複上局押注');
            return false;
        }

        // 清空當前押注
        this._bets = [];

        // 重複上一局的押注
        for (const amount of this._lastRoundBets) {
            if (this._bets.length >= GameConfig.MAX_BET_COUNT) break;

            this._balance -= amount;
            this._bets.push({
                amount,
                cashedOut: false,
                cashoutMultiplier: 0,
                profit: 0
            });
        }

        gameEvents.emit(BetEvent.BET_LIST_CHANGED, this._bets);
        gameEvents.emit(BetEvent.BALANCE_CHANGED, this._balance);

        console.log(`[BetManager] 重複上局押注, 共 ${this._bets.length} 筆`);
        return true;
    }

    /**
     * 單筆取出
     */
    cashoutSingle(index: number): boolean {
        if (!this.canCashout) return false;
        if (index < 0 || index >= this._bets.length) return false;

        const bet = this._bets[index];
        if (bet.cashedOut) return false;

        const multiplier = GameManager.instance.currentMultiplier;
        const winnings = GameConfig.calculateWinnings(bet.amount, multiplier);
        const profit = winnings - bet.amount;

        bet.cashedOut = true;
        bet.cashoutMultiplier = multiplier;
        bet.profit = profit;

        // 加回餘額
        this._balance += winnings;
        this._roundProfit += profit;

        gameEvents.emit(BetEvent.BET_LIST_CHANGED, this._bets);
        gameEvents.emit(BetEvent.BALANCE_CHANGED, this._balance);
        GameManager.instance?.notifyCashout(index, multiplier, profit);

        console.log(`[BetManager] 取出 #${index}, 倍數: ${multiplier}x, 獲利: ${profit}`);
        return true;
    }

    /**
     * 全部取出
     */
    cashoutAll(): boolean {
        if (!this.canCashout) return false;

        let success = false;
        for (let i = 0; i < this._bets.length; i++) {
            if (!this._bets[i].cashedOut) {
                this.cashoutSingle(i);
                success = true;
            }
        }
        return success;
    }

    /**
     * 檢查自動取出
     */
    checkAutoCashout(currentMultiplier: number) {
        if (!this._autoCashoutEnabled) return;
        if (currentMultiplier < this._autoCashoutMultiplier) return;

        // 自動取出所有未取出的押注
        for (let i = 0; i < this._bets.length; i++) {
            if (!this._bets[i].cashedOut) {
                this.cashoutSingle(i);
            }
        }
    }

    /**
     * 設定自動取出
     */
    setAutoCashout(enabled: boolean, multiplier?: number) {
        this._autoCashoutEnabled = enabled;

        if (multiplier !== undefined) {
            multiplier = Math.max(GameConfig.AUTO_CASHOUT_MIN,
                                  Math.min(multiplier, GameConfig.AUTO_CASHOUT_MAX));
            this._autoCashoutMultiplier = multiplier;

            // 更新最近使用的倍數
            const index = this._recentAutoCashout.indexOf(multiplier);
            if (index > -1) {
                this._recentAutoCashout.splice(index, 1);
            }
            this._recentAutoCashout.unshift(multiplier);
            if (this._recentAutoCashout.length > 4) {
                this._recentAutoCashout.pop();
            }
        }

        gameEvents.emit(BetEvent.AUTO_CASHOUT_CHANGED, {
            enabled: this._autoCashoutEnabled,
            multiplier: this._autoCashoutMultiplier
        });
    }

    /**
     * 結算本局
     */
    settleRound(crashMultiplier: number) {
        // 未取出的押注視為虧損
        for (const bet of this._bets) {
            if (!bet.cashedOut) {
                bet.profit = -bet.amount;
                this._roundProfit -= bet.amount;
            }
        }

        gameEvents.emit(BetEvent.BET_LIST_CHANGED, this._bets);
        gameEvents.emit(BetEvent.ROUND_RESULT, {
            bets: this._bets,
            totalProfit: this._roundProfit,
            crashMultiplier
        });

        console.log(`[BetManager] 本局結算, 總損益: ${this._roundProfit}`);
    }

    /**
     * 獲取當前可取出總金額
     */
    getTotalCashoutAmount(): number {
        if (GameManager.instance?.gameState !== GameConfig.STATE_FLYING) return 0;

        const multiplier = GameManager.instance.currentMultiplier;
        let total = 0;

        for (const bet of this._bets) {
            if (!bet.cashedOut) {
                total += GameConfig.calculateWinnings(bet.amount, multiplier);
            }
        }

        return total;
    }

    /**
     * 獲取未取出的押注數量
     */
    getActiveBetCount(): number {
        return this._bets.filter(bet => !bet.cashedOut).length;
    }
}
