import { _decorator, Component } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents, GameState, GameConfig, DefaultGameConfig } from '../Lib/Constants';
import { Timer, MultipleTimer } from '../Lib/Timer';
import { GameStateMachine } from './GameStateMachine';
import { WebSocketManager } from '../Net/WebSocketManager';
import { MessageHandler } from '../Net/MessageHandler';
import { MessageType, BetRequest, TakeoutRequest } from '../Net/Protocol';
import { ModelManager } from '../Model/ModelManager';

const { ccclass, property } = _decorator;

/**
 * 遊戲主控制器
 */
@ccclass('GameManager')
export class GameManager extends BaseManager {
    private static _inst: GameManager;
    public static get instance(): GameManager {
        return GameManager._inst;
    }

    @property
    public serverUrl: string = 'wss://localhost:7070/ws';

    @property
    public authToken: string = '';

    @property
    public minBet: number = 10;

    @property
    public maxBet: number = 100000;

    @property({ type: [Number] })
    public betOptions: number[] = [10, 50, 100, 500, 1000, 5000];

    @property
    public wagerDuration: number = 10;

    @property
    public deadDuration: number = 5;

    @property
    public maxMultiplier: number = 1000;

    @property
    public growthRate: number = 0.06;

    private _stateMachine: GameStateMachine;
    private _wagerTimer: Timer;
    private _settleTimer: Timer;
    private _multipleTimer: MultipleTimer;
    private _config: GameConfig;

    protected onManagerLoad(): void {
        GameManager._inst = this;

        this._stateMachine = new GameStateMachine();
        this._wagerTimer = new Timer();
        this._settleTimer = new Timer();
        this._multipleTimer = new MultipleTimer();

        this._config = {
            minBet: this.minBet,
            maxBet: this.maxBet,
            betOptions: this.betOptions,
            wagerDuration: this.wagerDuration,
            deadDuration: this.deadDuration,
            maxMultiplier: this.maxMultiplier,
            growthRate: this.growthRate
        };

        this._initStateMachine();
        this._registerEvents();
    }

    protected onManagerDestroy(): void {
        this._wagerTimer.stop();
        this._settleTimer.stop();
        this._multipleTimer.stop();
        EventManager.instance.offTarget(this);
    }

    public init(): void {
        // 初始化消息處理器
        MessageHandler.instance.init();

        // 設置倍數增長率
        ModelManager.instance.multipleModel.setGrowthRate(this.growthRate);

        console.log('GameManager initialized with config:', this._config);
    }

    public reset(): void {
        ModelManager.instance.resetAll();
        this._stateMachine.reset();
        this._wagerTimer.stop();
        this._settleTimer.stop();
        this._multipleTimer.stop();
    }

    /**
     * 連接服務器（返回 Promise）
     * 建議在 Loading 場景調用，連線成功後再切換場景
     */
    public connectServer(url?: string, token?: string): Promise<void> {
        return WebSocketManager.instance.connect(
            url || this.serverUrl,
            token || this.authToken
        );
    }

    /**
     * 斷開服務器
     */
    public disconnectServer(): void {
        WebSocketManager.instance.disconnect();
    }

    /**
     * 檢查是否已連線且認證
     */
    public get isServerReady(): boolean {
        return WebSocketManager.instance.isReady;
    }

    private _initStateMachine(): void {
        // IDLE 狀態
        this._stateMachine.registerState(GameState.IDLE, {
            onEnter: () => {
                console.log('[GameManager] Enter IDLE state');
            }
        });

        // WAGER 狀態（押注階段）
        this._stateMachine.registerState(GameState.WAGER, {
            onEnter: () => {
                console.log('[GameManager] Enter WAGER state');
                ModelManager.instance.resetForNewRound();
            },
            onExit: () => {
                this._wagerTimer.stop();
            }
        });

        // RUNNING 狀態（運行階段）
        this._stateMachine.registerState(GameState.RUNNING, {
            onEnter: () => {
                console.log('[GameManager] Enter RUNNING state');
                this._startMultipleGrowth();
            },
            onExit: () => {
                this._multipleTimer.stop();
                ModelManager.instance.multipleModel.stopGrowth();
            },
            onUpdate: (dt: number) => {
                this._checkAutoTakeout();
            }
        });

        // CRASHED 狀態
        this._stateMachine.registerState(GameState.CRASHED, {
            onEnter: () => {
                console.log('[GameManager] Enter CRASHED state');
            }
        });

        // SETTLE 狀態（結算階段）
        this._stateMachine.registerState(GameState.SETTLE, {
            onEnter: () => {
                console.log('[GameManager] Enter SETTLE state');
                this._startSettleCountdown();
            },
            onExit: () => {
                this._settleTimer.stop();
            }
        });

        // 狀態變化回調
        this._stateMachine.setOnStateChange((from, to) => {
            EventManager.instance.emit(GameEvents.GAME_STATE_CHANGED, { from, to });
        });
    }

    private _registerEvents(): void {
        // 監聽押注階段開始
        EventManager.instance.on(GameEvents.WAGER_START, (data: any) => {
            this._stateMachine.changeState(GameState.WAGER);
            this._startWagerCountdown(data.countdown);
        }, this);

        // 監聽遊戲開始
        EventManager.instance.on(GameEvents.GAME_START, () => {
            this._stateMachine.changeState(GameState.RUNNING);
        }, this);

        // 監聽遊戲崩潰
        EventManager.instance.on(GameEvents.GAME_CRASH, () => {
            this._stateMachine.changeState(GameState.CRASHED);
        }, this);

        // 監聽遊戲結算
        EventManager.instance.on(GameEvents.GAME_SETTLE, () => {
            this._stateMachine.changeState(GameState.SETTLE);
        }, this);

        // 監聽連接成功
        EventManager.instance.on(GameEvents.WS_CONNECTED, () => {
            console.log('[GameManager] WebSocket connected');
        }, this);

        // 監聽連接斷開
        EventManager.instance.on(GameEvents.WS_DISCONNECTED, () => {
            console.log('[GameManager] WebSocket disconnected');
        }, this);
    }

    private _startWagerCountdown(seconds: number): void {
        this._wagerTimer.start({
            duration: seconds,
            interval: 0.1,
            onUpdate: (remaining) => {
                EventManager.instance.emit(GameEvents.TIME_UPDATE, remaining);
            },
            onComplete: () => {
                // 倒計時結束，等待服務器 GAME_START 消息
            }
        });
    }

    private _startMultipleGrowth(): void {
        ModelManager.instance.multipleModel.startGrowth();

        this._multipleTimer.start(this.growthRate, (multiple) => {
            // 本地平滑更新倍數顯示
            EventManager.instance.emit(GameEvents.MULTIPLE_UPDATE, { multiple });
        });
    }

    private _startSettleCountdown(): void {
        this._settleTimer.start({
            duration: this.deadDuration,
            onComplete: () => {
                this._stateMachine.changeState(GameState.IDLE);
            }
        });
    }

    private _checkAutoTakeout(): void {
        const betModel = ModelManager.instance.betModel;
        const multipleModel = ModelManager.instance.multipleModel;

        if (betModel.shouldAutoTakeout(multipleModel.currentMultiple)) {
            this.takeout();
        }
    }

    // ===== 公開 API =====

    /**
     * 押注
     */
    public placeBet(amount: number, autoTakeout?: number): boolean {
        const userModel = ModelManager.instance.userModel;
        const betModel = ModelManager.instance.betModel;
        const gameModel = ModelManager.instance.gameModel;

        // 驗證遊戲狀態
        if (!gameModel.isWagerPhase()) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '當前不在押注階段');
            return false;
        }

        // 驗證是否已押注
        if (betModel.hasBet()) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '已經押注過了');
            return false;
        }

        // 驗證金額範圍
        if (amount < this._config.minBet || amount > this._config.maxBet) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, `押注金額需在 ${this._config.minBet} - ${this._config.maxBet} 之間`);
            return false;
        }

        // 驗證餘額
        if (!userModel.canAfford(amount)) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '餘額不足');
            return false;
        }

        // 驗證自動收錢倍數
        if (autoTakeout !== undefined && autoTakeout <= 1) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '自動收錢倍數需大於 1');
            return false;
        }

        // 發送押注請求
        const request: BetRequest = {
            type: MessageType.BET_REQUEST,
            timestamp: Date.now(),
            data: {
                roundId: gameModel.roundId,
                amount: amount,
                autoTakeout: autoTakeout
            }
        };

        if (!WebSocketManager.instance.send(request)) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '網絡連接異常');
            return false;
        }

        // 設置待確認狀態
        betModel.setBetAmount(amount);
        if (autoTakeout) {
            betModel.setAutoTakeout(autoTakeout);
        }

        EventManager.instance.emit(GameEvents.BET_PLACED, { amount, autoTakeout });
        return true;
    }

    /**
     * 收錢
     */
    public takeout(): boolean {
        const betModel = ModelManager.instance.betModel;
        const gameModel = ModelManager.instance.gameModel;

        // 驗證遊戲狀態
        if (!gameModel.isRunningPhase()) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '遊戲未在運行中');
            return false;
        }

        // 驗證是否可以收錢
        if (!betModel.canTakeout()) {
            if (!betModel.hasBet()) {
                EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '您沒有押注');
            } else {
                EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '已經收錢過了');
            }
            return false;
        }

        // 發送收錢請求
        const request: TakeoutRequest = {
            type: MessageType.TAKEOUT_REQUEST,
            timestamp: Date.now(),
            data: {
                roundId: gameModel.roundId
            }
        };

        if (!WebSocketManager.instance.send(request)) {
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '網絡連接異常');
            return false;
        }

        EventManager.instance.emit(GameEvents.TAKEOUT_REQUEST);
        return true;
    }

    /**
     * 獲取當前遊戲狀態
     */
    public get currentState(): GameState {
        return this._stateMachine.currentState;
    }

    /**
     * 獲取遊戲配置
     */
    public get config(): GameConfig {
        return { ...this._config };
    }

    /**
     * 是否可以押注
     */
    public canPlaceBet(): boolean {
        return ModelManager.instance.gameModel.isWagerPhase() &&
               !ModelManager.instance.betModel.hasBet();
    }

    /**
     * 是否可以收錢
     */
    public canTakeout(): boolean {
        return ModelManager.instance.gameModel.isRunningPhase() &&
               ModelManager.instance.betModel.canTakeout();
    }

    /**
     * 更新邏輯（每幀調用）
     */
    protected update(dt: number): void {
        this._stateMachine.update(dt);
    }
}
