/**
 * 遊戲狀態枚舉
 */
export enum GameState {
    IDLE = 'idle',           // 空閒（等待開始）
    WAGER = 'wager',         // 押注階段
    RUNNING = 'running',     // 運行階段（倍數增長）
    CRASHED = 'crashed',     // 崩潰
    SETTLE = 'settle'        // 結算階段
}

/**
 * 事件名稱常量
 */
export const GameEvents = {
    // WebSocket 事件
    WS_CONNECTED: 'ws_connected',
    WS_DISCONNECTED: 'ws_disconnected',
    WS_ERROR: 'ws_error',
    WS_MESSAGE: 'ws_message',

    // 遊戲狀態事件
    GAME_STATE_CHANGED: 'game_state_changed',
    WAGER_START: 'wager_start',
    GAME_START: 'game_start',
    GAME_CRASH: 'game_crash',
    GAME_SETTLE: 'game_settle',

    // 倍數事件
    MULTIPLE_UPDATE: 'multiple_update',

    // 押注事件
    BET_PLACED: 'bet_placed',
    BET_CONFIRMED: 'bet_confirmed',
    BET_FAILED: 'bet_failed',

    // 收錢事件
    TAKEOUT_REQUEST: 'takeout_request',
    TAKEOUT_SUCCESS: 'takeout_success',
    TAKEOUT_FAILED: 'takeout_failed',

    // 用戶事件
    USER_INFO_UPDATE: 'user_info_update',
    BALANCE_UPDATE: 'balance_update',

    // UI 事件
    SHOW_MESSAGE: 'show_message',
    TIME_UPDATE: 'time_update'
};

/**
 * 遊戲配置接口
 */
export interface GameConfig {
    minBet: number;
    maxBet: number;
    betOptions: number[];
    wagerDuration: number;    // 押注倒計時（秒）
    deadDuration: number;     // 結算展示時間（秒）
    maxMultiplier: number;    // 最大倍數
    growthRate: number;       // 增長率
}

/**
 * 默認遊戲配置
 */
export const DefaultGameConfig: GameConfig = {
    minBet: 10,
    maxBet: 100000,
    betOptions: [10, 50, 100, 500, 1000, 5000],
    wagerDuration: 10,
    deadDuration: 5,
    maxMultiplier: 1000,
    growthRate: 0.06
};
