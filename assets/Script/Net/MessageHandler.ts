import { EventManager } from '../Lib/EventManager';
import { GameEvents } from '../Lib/Constants';
import {
    BaseMessage,
    MessageType,
    AuthResultMessage,
    GameStateMessage,
    WagerStartMessage,
    GameStartMessage,
    MultipleUpdateMessage,
    GameCrashMessage,
    GameSettleMessage,
    BetResultMessage,
    TakeoutResultMessage,
    UserInfoMessage,
    HistoryMessage
} from './Protocol';
import { ModelManager } from '../Model/ModelManager';

/**
 * 消息處理器
 * 負責接收 WebSocket 消息並分發到對應的處理函數
 */
export class MessageHandler {
    private static _instance: MessageHandler;

    private constructor() {}

    public static get instance(): MessageHandler {
        if (!MessageHandler._instance) {
            MessageHandler._instance = new MessageHandler();
        }
        return MessageHandler._instance;
    }

    /**
     * 初始化：註冊消息監聽
     */
    public init(): void {
        EventManager.instance.on(GameEvents.WS_MESSAGE, this._handleMessage, this);
    }

    /**
     * 銷毀：移除消息監聽
     */
    public destroy(): void {
        EventManager.instance.off(GameEvents.WS_MESSAGE, this._handleMessage);
    }

    private _handleMessage(message: BaseMessage): void {
        switch (message.type) {
            case MessageType.AUTH_RESULT:
                this._handleAuthResult(message as AuthResultMessage);
                break;
            case MessageType.GAME_STATE:
                this._handleGameState(message as GameStateMessage);
                break;
            case MessageType.WAGER_START:
                this._handleWagerStart(message as WagerStartMessage);
                break;
            case MessageType.GAME_START:
                this._handleGameStart(message as GameStartMessage);
                break;
            case MessageType.MULTIPLE_UPDATE:
                this._handleMultipleUpdate(message as MultipleUpdateMessage);
                break;
            case MessageType.GAME_CRASH:
                this._handleGameCrash(message as GameCrashMessage);
                break;
            case MessageType.GAME_SETTLE:
                this._handleGameSettle(message as GameSettleMessage);
                break;
            case MessageType.BET_RESULT:
                this._handleBetResult(message as BetResultMessage);
                break;
            case MessageType.TAKEOUT_RESULT:
                this._handleTakeoutResult(message as TakeoutResultMessage);
                break;
            case MessageType.USER_INFO:
                this._handleUserInfo(message as UserInfoMessage);
                break;
            case MessageType.HISTORY:
                this._handleHistory(message as HistoryMessage);
                break;
            case MessageType.HEARTBEAT:
                // 心跳消息，無需處理
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private _handleAuthResult(msg: AuthResultMessage): void {
        if (msg.data.success) {
            console.log('Authentication successful');
        } else {
            console.error('Authentication failed:', msg.data.error);
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, '認證失敗: ' + msg.data.error);
        }
    }

    private _handleGameState(msg: GameStateMessage): void {
        const gameModel = ModelManager.instance.gameModel;
        gameModel.updateState(msg.data.state, msg.data.roundId);

        if (msg.data.multiple !== undefined) {
            ModelManager.instance.multipleModel.setMultiple(msg.data.multiple);
        }
        if (msg.data.countdown !== undefined) {
            EventManager.instance.emit(GameEvents.TIME_UPDATE, msg.data.countdown);
        }
        if (msg.data.crashPoint !== undefined) {
            gameModel.setCrashPoint(msg.data.crashPoint);
        }

        EventManager.instance.emit(GameEvents.GAME_STATE_CHANGED, {
            state: msg.data.state,
            roundId: msg.data.roundId
        });
    }

    private _handleWagerStart(msg: WagerStartMessage): void {
        const gameModel = ModelManager.instance.gameModel;
        gameModel.updateState('wager', msg.data.roundId);

        ModelManager.instance.resetForNewRound();

        EventManager.instance.emit(GameEvents.WAGER_START, {
            roundId: msg.data.roundId,
            countdown: msg.data.countdown
        });
        EventManager.instance.emit(GameEvents.TIME_UPDATE, msg.data.countdown);
    }

    private _handleGameStart(msg: GameStartMessage): void {
        const gameModel = ModelManager.instance.gameModel;
        gameModel.updateState('running', msg.data.roundId);

        ModelManager.instance.multipleModel.startGrowth();

        EventManager.instance.emit(GameEvents.GAME_START, {
            roundId: msg.data.roundId
        });
    }

    private _handleMultipleUpdate(msg: MultipleUpdateMessage): void {
        ModelManager.instance.multipleModel.setMultiple(msg.data.multiple);

        EventManager.instance.emit(GameEvents.MULTIPLE_UPDATE, {
            multiple: msg.data.multiple,
            elapsedTime: msg.data.elapsedTime
        });
    }

    private _handleGameCrash(msg: GameCrashMessage): void {
        const gameModel = ModelManager.instance.gameModel;
        gameModel.updateState('crashed', msg.data.roundId);
        gameModel.setCrashPoint(msg.data.crashPoint);

        ModelManager.instance.multipleModel.setMultiple(msg.data.crashPoint);

        EventManager.instance.emit(GameEvents.GAME_CRASH, {
            roundId: msg.data.roundId,
            crashPoint: msg.data.crashPoint
        });
    }

    private _handleGameSettle(msg: GameSettleMessage): void {
        const gameModel = ModelManager.instance.gameModel;
        gameModel.updateState('settle', msg.data.roundId);

        if (msg.data.userResult) {
            ModelManager.instance.betModel.setSettleResult(msg.data.userResult);
        }

        // 添加到歷史記錄
        ModelManager.instance.historyModel.addRecord({
            roundId: msg.data.roundId,
            crashPoint: msg.data.crashPoint,
            timestamp: Date.now()
        });

        EventManager.instance.emit(GameEvents.GAME_SETTLE, {
            roundId: msg.data.roundId,
            crashPoint: msg.data.crashPoint,
            userResult: msg.data.userResult
        });
    }

    private _handleBetResult(msg: BetResultMessage): void {
        if (msg.data.success) {
            ModelManager.instance.betModel.confirmBet(msg.data.betAmount!);

            if (msg.data.balance !== undefined) {
                ModelManager.instance.userModel.setBalance(msg.data.balance);
            }

            EventManager.instance.emit(GameEvents.BET_CONFIRMED, {
                roundId: msg.data.roundId,
                betAmount: msg.data.betAmount,
                balance: msg.data.balance
            });
        } else {
            EventManager.instance.emit(GameEvents.BET_FAILED, msg.data.error || '押注失敗');
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, msg.data.error || '押注失敗');
        }
    }

    private _handleTakeoutResult(msg: TakeoutResultMessage): void {
        if (msg.data.success) {
            ModelManager.instance.betModel.setTakeoutResult(
                msg.data.multiple!,
                msg.data.winAmount!
            );

            if (msg.data.balance !== undefined) {
                ModelManager.instance.userModel.setBalance(msg.data.balance);
            }

            EventManager.instance.emit(GameEvents.TAKEOUT_SUCCESS, {
                roundId: msg.data.roundId,
                multiple: msg.data.multiple,
                winAmount: msg.data.winAmount,
                balance: msg.data.balance
            });
        } else {
            EventManager.instance.emit(GameEvents.TAKEOUT_FAILED, msg.data.error || '收錢失敗');
            EventManager.instance.emit(GameEvents.SHOW_MESSAGE, msg.data.error || '收錢失敗');
        }
    }

    private _handleUserInfo(msg: UserInfoMessage): void {
        ModelManager.instance.userModel.updateUserInfo(msg.data);
        EventManager.instance.emit(GameEvents.USER_INFO_UPDATE, msg.data);
    }

    private _handleHistory(msg: HistoryMessage): void {
        ModelManager.instance.historyModel.setRecords(msg.data.records);
    }
}
