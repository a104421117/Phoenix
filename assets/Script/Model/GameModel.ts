/**
 * 摰Ｘ蝡舫??脖?隞?/ ??芋?S ?亙?隢? WebsocketModel.ts?? *
 * gameState ???憿?隞塚?
 *   - ??嚗odel ??view嚗?PlayerId / Balance / Multiplier / Rooms / RoomJoined / ...
 *   - Request events: view/model ask EventManager to send a WS command.
 */

import type {
    CrashBetPlacedPush,
    CrashBetItemContract,
    CrashCashoutDonePush,
    CrashCashoutItemContract,
    CrashInitBalanceContract,
    CrashRoundEndedPush,
    CrashRoundStartedPush,
    CrashRoundStatePush,
    GameInit,
    RoomJoinResponse,
    RoomLeaveResponse,
    RoomList,
    ServerOpGameAction,
} from "./WebsocketModel";

/** 摰Ｘ蝡臭?隞?key嚗ameData ??view ?? EventManager.gameState 撱?嚗?*/
export enum GmaeModel {
    /* ===== ??嚗odel ??view嚗?===== */
    PlayerId = "PlayerId",
    Balance = "Balance",
    Leaderboard = "Leaderboard",
    BetOptions = "BetOptions",
    MaxBetCount = "MaxBetCount",
    RoundHistory = "RoundHistory",
    BettingCountdown = "BettingCountdown",
    Multiplier = "Multiplier",
    RunningElapsed = "RunningElapsed",
    MultiplierCurve = "MultiplierCurve",
    Explode = "Explode",
    CrashedCountdown = "CrashedCountdown",
    Settled = "Settled",
    CrashBet = "crash.bet",
    Cashout = "Cashout",
    CashoutTotalPayout = "CashoutTotalPayout",
    ExistingBets = "ExistingBets",
    Rooms = "Rooms",
    RoomJoined = "RoomJoined",
    ShowError = "ShowError",

    /* ===== ??隢?嚗iew ??model嚗?===== */
    RequestGameInit = "RequestGameInit",
    RequestRoomList = "RequestRoomList",
    RequestJoinRoom = "RequestJoinRoom",
    RequestLeaveRoom = "RequestLeaveRoom",
    RequestReconnect = "RequestReconnect",
    RequestRoundHistory = "RequestRoundHistory",
    RequestGameBalance = "RequestGameBalance",
    RequestBet = "RequestBet",
    RequestCashout = "RequestCashout",

    /* ===== WS internal -> model ===== */
    ServerRoomList = "ServerRoomList",
    ServerRoomJoin = "ServerRoomJoin",
    ServerRoomLeave = "ServerRoomLeave",
    ServerRoomRoundStarted = "ServerRoomRoundStarted",
    ServerRoomRoundState = "ServerRoomRoundState",
    ServerRoomRoundEnded = "ServerRoomRoundEnded",
    ServerRoomBetPlaced = "ServerRoomBetPlaced",
    ServerRoomCashoutDone = "ServerRoomCashoutDone",
    ServerGameInit = "ServerGameInit",
    ServerGameBalance = "ServerGameBalance",
    ServerGameAction = "ServerGameAction",
};

/** 摰Ｘ蝡?normalize 敺??桃? bet ??望????*/
export enum GameErrorPrompt {
    InsufficientBalance = "您的積分不足",
    InsufficientBalanceWithPeriod = "您的積分不足。",
    MaxBetCountReached = "已達該局最大投注次數",
    IdleKicked = "由於您長時間沒進行遊戲，已經離開此遊戲局",
    RoundRunningWait = "遊戲進行中，請等候該局遊戲結束",
    NetworkReconnecting = "網路連線異常，正在嘗試重新連線...",
    RoomBetLimitReached = "本局總投注積分已達上限。",
    LeaveWithActiveBet = "您目前有進行中的注單，暫時無法離開遊戲",
    LeaveWhileSettling = "遊戲結算中，請稍候",
    AfkLeaveConfirm = "當前正處於掛機模式，離開將停止自動下注，是否確認離開？",
    AfkActionBlocked = "請先停止掛機後再進行其他動作",
}

export enum ExistingBetStatus {
    WalletPending = 'WalletPending',
    Pending = 'Pending',
    CashoutPending = 'CashoutPending',
    CashedOut = 'CashedOut',
    Lost = 'Lost',
}

/**
 * 摰Ｘ蝡舀????桃?銝釣?? bet ??望?蝝舐?嚗?瘜???running ??cashout / lost?? * ??雿?optional ???府甈??函銝???賡?瘝潦???WS ?臬??key?? */
export type ExistingBet = {
    betId?: string;
    betIndex: number;
    betAmount: number;
    status?: ExistingBetStatus;
    autoCashoutMultiplier?: number | null;
    cashoutMultiplier?: number | null;
    payout?: number | null;
    payoutGross?: number | null;
    serviceFee?: number | null;
    payoutNet?: number | null;
    currentProfit?: number | null;
    cashoutAtUtc?: string | null;
};

/** ??璁???*/
export type LeaderboardItem = {
    playerId: string;
    totalBet: number;
    profit: number;
    cashoutMultiplier: number | null;
    rank: number;
    betStatuses: number[];
};

/** Multiplier ?脩??見暺?*/
export type MultiplierCurvePoint = {
    t: number;
    m: number;
};

/** ??隞?key 撠??誨??payload ???*/
export type GmaeModelMap = {
    /* ?? */
    [GmaeModel.PlayerId]: string;
    [GmaeModel.Balance]: number;
    [GmaeModel.Leaderboard]: LeaderboardItem[];
    [GmaeModel.BetOptions]: number[];
    [GmaeModel.MaxBetCount]: number;
    [GmaeModel.RoundHistory]: number[];
    [GmaeModel.BettingCountdown]: number;
    [GmaeModel.Multiplier]: number;
    [GmaeModel.RunningElapsed]: number;
    [GmaeModel.MultiplierCurve]: MultiplierCurvePoint[];
    [GmaeModel.Explode]: number;
    [GmaeModel.CrashedCountdown]: number;
    [GmaeModel.Settled]: void;
    [GmaeModel.CrashBet]: CrashBetItemContract;
    [GmaeModel.Cashout]: CrashCashoutItemContract;
    [GmaeModel.CashoutTotalPayout]: number;
    [GmaeModel.ExistingBets]: ExistingBet[];
    [GmaeModel.Rooms]: RoomList;
    [GmaeModel.RoomJoined]: RoomJoinResponse;
    [GmaeModel.ShowError]: { message: string };

    /* ??隢? */
    [GmaeModel.RequestGameInit]: { roomId: string };
    [GmaeModel.RequestRoomList]: void;
    [GmaeModel.RequestJoinRoom]: { roomId: string };
    [GmaeModel.RequestLeaveRoom]: { roomId: string };
    [GmaeModel.RequestReconnect]: { instanceId: string };
    [GmaeModel.RequestRoundHistory]: { instanceId: string };
    [GmaeModel.RequestGameBalance]: { instanceId: string };
    [GmaeModel.RequestBet]: { instanceId: string; betUnits: number; betIndexes: number[]; autoCashoutMultiplier: number | null };
    [GmaeModel.RequestCashout]: { instanceId: string; betIndexes: number[] };

    /* WS internal -> model */
    [GmaeModel.ServerRoomList]: RoomList;
    [GmaeModel.ServerRoomJoin]: RoomJoinResponse;
    [GmaeModel.ServerRoomLeave]: RoomLeaveResponse;
    [GmaeModel.ServerRoomRoundStarted]: CrashRoundStartedPush;
    [GmaeModel.ServerRoomRoundState]: CrashRoundStatePush;
    [GmaeModel.ServerRoomRoundEnded]: CrashRoundEndedPush;
    [GmaeModel.ServerRoomBetPlaced]: CrashBetPlacedPush;
    [GmaeModel.ServerRoomCashoutDone]: CrashCashoutDonePush;
    [GmaeModel.ServerGameInit]: GameInit;
    [GmaeModel.ServerGameBalance]: CrashInitBalanceContract;
    [GmaeModel.ServerGameAction]: ServerOpGameAction;
}
