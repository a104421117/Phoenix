/**
 * 消息類型枚舉
 */
export enum MessageType {
    // 連接相關
    HEARTBEAT = 'heartbeat',
    AUTH = 'auth',
    AUTH_RESULT = 'auth_result',

    // 遊戲狀態
    GAME_STATE = 'game_state',
    WAGER_START = 'wager_start',
    GAME_START = 'game_start',
    MULTIPLE_UPDATE = 'multiple_update',
    GAME_CRASH = 'game_crash',
    GAME_SETTLE = 'game_settle',

    // 玩家操作
    BET_REQUEST = 'bet_request',
    BET_RESULT = 'bet_result',
    TAKEOUT_REQUEST = 'takeout_request',
    TAKEOUT_RESULT = 'takeout_result',

    // 數據同步
    USER_INFO = 'user_info',
    HISTORY = 'history',
    PLAYER_LIST = 'player_list'
}

/**
 * 基礎消息結構
 */
export interface BaseMessage {
    type: MessageType | string;
    timestamp: number;
    seq?: number;
}

// ===== 服務器 -> 客戶端 =====

/**
 * 認證結果
 */
export interface AuthResultMessage extends BaseMessage {
    type: MessageType.AUTH_RESULT;
    data: {
        success: boolean;
        error?: string;
    };
}

/**
 * 遊戲狀態消息
 */
export interface GameStateMessage extends BaseMessage {
    type: MessageType.GAME_STATE;
    data: {
        state: string;
        roundId: string;
        multiple?: number;
        countdown?: number;
        crashPoint?: number;
    };
}

/**
 * 押注階段開始
 */
export interface WagerStartMessage extends BaseMessage {
    type: MessageType.WAGER_START;
    data: {
        roundId: string;
        countdown: number;
    };
}

/**
 * 遊戲開始
 */
export interface GameStartMessage extends BaseMessage {
    type: MessageType.GAME_START;
    data: {
        roundId: string;
    };
}

/**
 * 倍數更新消息
 */
export interface MultipleUpdateMessage extends BaseMessage {
    type: MessageType.MULTIPLE_UPDATE;
    data: {
        roundId: string;
        multiple: number;
        elapsedTime: number;
    };
}

/**
 * 遊戲崩潰消息
 */
export interface GameCrashMessage extends BaseMessage {
    type: MessageType.GAME_CRASH;
    data: {
        roundId: string;
        crashPoint: number;
    };
}

/**
 * 結算消息
 */
export interface GameSettleMessage extends BaseMessage {
    type: MessageType.GAME_SETTLE;
    data: {
        roundId: string;
        crashPoint: number;
        userResult?: {
            betAmount: number;
            takeoutMultiple: number | null;
            winAmount: number;
        };
    };
}

/**
 * 押注結果
 */
export interface BetResultMessage extends BaseMessage {
    type: MessageType.BET_RESULT;
    data: {
        success: boolean;
        roundId: string;
        betAmount?: number;
        balance?: number;
        error?: string;
    };
}

/**
 * 收錢結果
 */
export interface TakeoutResultMessage extends BaseMessage {
    type: MessageType.TAKEOUT_RESULT;
    data: {
        success: boolean;
        roundId: string;
        multiple?: number;
        winAmount?: number;
        balance?: number;
        error?: string;
    };
}

/**
 * 用戶信息
 */
export interface UserInfoMessage extends BaseMessage {
    type: MessageType.USER_INFO;
    data: {
        userId: string;
        username: string;
        avatar: string;
        balance: number;
    };
}

/**
 * 歷史記錄
 */
export interface HistoryMessage extends BaseMessage {
    type: MessageType.HISTORY;
    data: {
        records: Array<{
            roundId: string;
            crashPoint: number;
            timestamp: number;
        }>;
    };
}

/**
 * 玩家列表
 */
export interface PlayerListMessage extends BaseMessage {
    type: MessageType.PLAYER_LIST;
    data: {
        players: Array<{
            odId: string;
            username: string;
            betAmount?: number;
            takeoutMultiple?: number;
        }>;
    };
}

// ===== 客戶端 -> 服務器 =====

/**
 * 認證請求
 */
export interface AuthRequest extends BaseMessage {
    type: MessageType.AUTH;
    data: {
        token: string;
    };
}

/**
 * 押注請求
 */
export interface BetRequest extends BaseMessage {
    type: MessageType.BET_REQUEST;
    data: {
        roundId: string;
        amount: number;
        autoTakeout?: number;
    };
}

/**
 * 收錢請求
 */
export interface TakeoutRequest extends BaseMessage {
    type: MessageType.TAKEOUT_REQUEST;
    data: {
        roundId: string;
    };
}

/**
 * 心跳請求
 */
export interface HeartbeatMessage extends BaseMessage {
    type: MessageType.HEARTBEAT;
}

/**
 * 所有服務器消息類型聯合
 */
export type ServerMessage =
    | AuthResultMessage
    | GameStateMessage
    | WagerStartMessage
    | GameStartMessage
    | MultipleUpdateMessage
    | GameCrashMessage
    | GameSettleMessage
    | BetResultMessage
    | TakeoutResultMessage
    | UserInfoMessage
    | HistoryMessage
    | PlayerListMessage;

/**
 * 所有客戶端消息類型聯合
 */
export type ClientMessage =
    | AuthRequest
    | BetRequest
    | TakeoutRequest
    | HeartbeatMessage;
