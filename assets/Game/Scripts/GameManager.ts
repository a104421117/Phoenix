import { _decorator, Component, Node, Label, director } from 'cc';
import { gameEvents } from '../../Base/Scripts/EventManager';
import { Utils } from '../../Base/Scripts/Utils';
import { GameConfig } from './GameConfig';
import { BetManager } from './BetManager';
import { PhoenixController } from './PhoenixController';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

// 重新匯出 gameEvents 供其他模組使用
export { gameEvents };

// 遊戲事件名稱
export enum GameEvent {
    STATE_CHANGED = 'game_state_changed',
    MULTIPLIER_UPDATED = 'game_multiplier_updated',
    COUNTDOWN_UPDATED = 'game_countdown_updated',
    BET_PLACED = 'game_bet_placed',
    CASHOUT_SUCCESS = 'game_cashout_success',
    ROUND_END = 'game_round_end',
    HISTORY_UPDATED = 'game_history_updated'
}

// 歷史記錄
export interface RoundHistory {
    roundId: number;
    crashMultiplier: number;
    timestamp: number;
}

// 玩家投注資訊
export interface PlayerBetInfo {
    odId: string;
    odPlayername: string;
    odavatar: string;
    odtotalBet: number;
    odbets: BetEntry[];
}

// 單筆投注
export interface BetEntry {
    amount: number;
    cashedOut: boolean;
    cashoutMultiplier: number;
    profit: number;
}

@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager = null;
    public static get instance(): GameManager {
        return this._instance;
    }

    @property(PhoenixController)
    phoenixController: PhoenixController = null;

    @property(BetManager)
    betManager: BetManager = null;

    @property(UIManager)
    uiManager: UIManager = null;

    // 遊戲狀態
    private _gameState: number = GameConfig.STATE_BETTING;
    private _currentMultiplier: number = 1.0;
    private _crashMultiplier: number = 1.0;
    private _countdown: number = GameConfig.BETTING_TIME;
    private _roundId: number = 0;

    // 歷史記錄
    private _history: RoundHistory[] = [];

    // 其他玩家（模擬）
    private _otherPlayers: PlayerBetInfo[] = [];

    // 計時器
    private _gameTimer: number = 0;
    private _multiplierStartTime: number = 0;

    // 今日/歷史最高
    private _todayHighest: number = 0;
    private _historyHighest: number = 0;

    get gameState(): number { return this._gameState; }
    get currentMultiplier(): number { return this._currentMultiplier; }
    get crashMultiplier(): number { return this._crashMultiplier; }
    get countdown(): number { return this._countdown; }
    get roundId(): number { return this._roundId; }
    get history(): RoundHistory[] { return this._history; }
    get todayHighest(): number { return this._todayHighest; }
    get historyHighest(): number { return this._historyHighest; }

    onLoad() {
        if (GameManager._instance) {
            this.destroy();
            return;
        }
        GameManager._instance = this;

        // 初始化模擬歷史數據
        this.initMockHistory();
        // 開始新一局
        this.startNewRound();
    }

    onDestroy() {
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }

    /**
     * 初始化模擬歷史數據
     */
    private initMockHistory() {
        // 生成一些初始歷史記錄
        for (let i = 0; i < 8; i++) {
            const mult = this.generateRandomCrashMultiplier();
            this._history.unshift({
                roundId: i + 1,
                crashMultiplier: mult,
                timestamp: Date.now() - (8 - i) * 30000
            });
            if (mult > this._historyHighest) this._historyHighest = mult;
            if (mult > this._todayHighest) this._todayHighest = mult;
        }
        this._roundId = 8;
    }

    /**
     * 開始新一局
     */
    startNewRound() {
        this._roundId++;
        this._gameState = GameConfig.STATE_BETTING;
        this._currentMultiplier = 1.0;
        this._countdown = GameConfig.BETTING_TIME;
        this._crashMultiplier = this.generateRandomCrashMultiplier();

        // 重置押注
        if (this.betManager) {
            this.betManager.resetForNewRound();
        }

        // 生成模擬玩家
        this.generateMockPlayers();

        // 通知狀態變更
        gameEvents.emit(GameEvent.STATE_CHANGED, this._gameState);
        gameEvents.emit(GameEvent.COUNTDOWN_UPDATED, this._countdown);

        console.log(`[GameManager] 新局開始 #${this._roundId}, 爆炸倍數: ${this._crashMultiplier.toFixed(2)}x`);
    }

    /**
     * 生成隨機爆炸倍數
     * 使用指數分布，大部分情況在低倍數爆炸
     */
    private generateRandomCrashMultiplier(): number {
        // 使用指數分布
        const random = Math.random();
        // 有3%機率出現高倍數(10x+)
        if (random < 0.03) {
            return Math.round((10 + Math.random() * 990) * 100) / 100;
        }
        // 有10%機率出現中倍數(3-10x)
        if (random < 0.13) {
            return Math.round((3 + Math.random() * 7) * 100) / 100;
        }
        // 87%機率出現低倍數(0.1-3x)
        return Math.round((0.1 + Math.random() * 2.9) * 100) / 100;
    }

    /**
     * 生成模擬玩家
     */
    private generateMockPlayers() {
        const mockNames = ['小明', '阿華', '大雄', '靜香', '胖虎', '小夫', '哆啦A夢', '野比'];
        const playerCount = Math.floor(Math.random() * 5) + 2;

        this._otherPlayers = [];
        for (let i = 0; i < playerCount; i++) {
            const betCount = Math.floor(Math.random() * 3) + 1;
            const bets: BetEntry[] = [];
            let totalBet = 0;

            for (let j = 0; j < betCount; j++) {
                const amount = (Math.floor(Math.random() * 100) + 1) * 100;
                bets.push({
                    amount,
                    cashedOut: false,
                    cashoutMultiplier: 0,
                    profit: 0
                });
                totalBet += amount;
            }

            this._otherPlayers.push({
                odId: `player_${i}`,
                odPlayername: mockNames[i % mockNames.length],
                odavatar: '',
                odtotalBet: totalBet,
                odbets: bets
            });
        }
    }

    update(deltaTime: number) {
        switch (this._gameState) {
            case GameConfig.STATE_BETTING:
                this.updateBettingPhase(deltaTime);
                break;
            case GameConfig.STATE_FLYING:
                this.updateFlyingPhase(deltaTime);
                break;
            case GameConfig.STATE_CRASHED:
                this.updateCrashedPhase(deltaTime);
                break;
            case GameConfig.STATE_SETTLING:
                this.updateSettlingPhase(deltaTime);
                break;
        }
    }

    /**
     * 更新押注階段
     */
    private updateBettingPhase(deltaTime: number) {
        this._countdown -= deltaTime;

        if (this._countdown <= 0) {
            this._countdown = 0;
            this.startFlying();
        }

        gameEvents.emit(GameEvent.COUNTDOWN_UPDATED, Math.ceil(this._countdown));
    }

    /**
     * 開始飛行
     */
    private startFlying() {
        this._gameState = GameConfig.STATE_FLYING;
        this._currentMultiplier = 1.0;
        this._multiplierStartTime = Date.now();

        // 播放鳳凰起飛動畫
        if (this.phoenixController) {
            this.phoenixController.startFlying();
        }

        gameEvents.emit(GameEvent.STATE_CHANGED, this._gameState);
        console.log('[GameManager] 開始飛行');
    }

    /**
     * 更新飛行階段
     */
    private updateFlyingPhase(deltaTime: number) {
        // 倍數遞增（使用非線性增長）
        const elapsed = (Date.now() - this._multiplierStartTime) / 1000;
        // 公式: multiplier = e^(0.06 * t) ，約每秒增加6%
        this._currentMultiplier = Math.round(Math.exp(0.06 * elapsed) * 100) / 100;

        // 模擬其他玩家隨機取出
        this.simulateOtherPlayersCashout();

        // 檢查自動取出
        if (this.betManager) {
            this.betManager.checkAutoCashout(this._currentMultiplier);
        }

        gameEvents.emit(GameEvent.MULTIPLIER_UPDATED, this._currentMultiplier);

        // 檢查是否爆炸
        if (this._currentMultiplier >= this._crashMultiplier) {
            this.crash();
        }
    }

    /**
     * 模擬其他玩家取出
     */
    private simulateOtherPlayersCashout() {
        for (const player of this._otherPlayers) {
            for (const bet of player.odbets) {
                if (!bet.cashedOut && Math.random() < 0.01) {
                    // 1%機率取出
                    bet.cashedOut = true;
                    bet.cashoutMultiplier = this._currentMultiplier;
                    bet.profit = GameConfig.calculateProfit(bet.amount, this._currentMultiplier);
                }
            }
        }
    }

    /**
     * 爆炸
     */
    private crash() {
        this._gameState = GameConfig.STATE_CRASHED;
        this._currentMultiplier = this._crashMultiplier;
        this._countdown = GameConfig.SETTLE_TIME;

        // 播放爆炸動畫
        if (this.phoenixController) {
            this.phoenixController.crash();
        }

        // 結算未取出的押注
        if (this.betManager) {
            this.betManager.settleRound(this._crashMultiplier);
        }

        // 記錄歷史
        this._history.unshift({
            roundId: this._roundId,
            crashMultiplier: this._crashMultiplier,
            timestamp: Date.now()
        });

        // 保持歷史記錄數量
        if (this._history.length > GameConfig.MAX_HISTORY_RECORD) {
            this._history.pop();
        }

        // 更新最高倍數
        if (this._crashMultiplier > this._todayHighest) {
            this._todayHighest = this._crashMultiplier;
        }
        if (this._crashMultiplier > this._historyHighest) {
            this._historyHighest = this._crashMultiplier;
        }

        gameEvents.emit(GameEvent.STATE_CHANGED, this._gameState);
        gameEvents.emit(GameEvent.MULTIPLIER_UPDATED, this._currentMultiplier);
        gameEvents.emit(GameEvent.HISTORY_UPDATED, this._history);
        gameEvents.emit(GameEvent.ROUND_END, this._crashMultiplier);

        console.log(`[GameManager] 爆炸! ${this._crashMultiplier}x`);
    }

    /**
     * 更新爆炸階段（等待進入結算）
     */
    private updateCrashedPhase(deltaTime: number) {
        this._countdown -= deltaTime;

        if (this._countdown <= 0) {
            this._gameState = GameConfig.STATE_SETTLING;
            gameEvents.emit(GameEvent.STATE_CHANGED, this._gameState);
        }

        gameEvents.emit(GameEvent.COUNTDOWN_UPDATED, Math.ceil(this._countdown));
    }

    /**
     * 更新結算階段
     */
    private updateSettlingPhase(deltaTime: number) {
        // 結算完成，開始新一局
        this.startNewRound();
    }

    /**
     * 玩家取出（由 BetManager 調用後通知）
     */
    notifyCashout(betIndex: number, multiplier: number, profit: number) {
        gameEvents.emit(GameEvent.CASHOUT_SUCCESS, { betIndex, multiplier, profit });
    }

    /**
     * 獲取其他玩家列表（按投注金額排序）
     */
    getOtherPlayersSorted(): PlayerBetInfo[] {
        return [...this._otherPlayers].sort((a, b) => b.odtotalBet - a.odtotalBet);
    }

    /**
     * 獲取當前在玩人數
     */
    getOnlinePlayerCount(): number {
        return this._otherPlayers.length + 1; // 加上自己
    }
}
