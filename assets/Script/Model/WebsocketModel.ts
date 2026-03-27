/** ─── Client → Server ───────────────────────────────────────── */

/** 客戶端 → 伺服器 操作指令 */
export enum ClientOp {
    LobbyList = 'lobby.list',
    RoomList = 'room.list',
    RoomJoin = 'room.join',
    GameInit = 'game.init',
    GameBalance = 'game.balance',
    GameAction = 'game.action',
}

/** 客戶端操作指令 → 資料型別映射 */
export type ClientOpMap = {
    [ClientOp.LobbyList]: { gameCode: string; currency?: string };
    [ClientOp.RoomList]: { lobbyId: string; status?: string; limit?: number };
    [ClientOp.RoomJoin]: { roomId: string };
    [ClientOp.GameInit]: { roomId: string };
    [ClientOp.GameBalance]: { roomId: string };
    [ClientOp.GameAction]: { roomId: string; method: string; payload: object };
}

/** ─── Game Data Types ───────────────────────────────────────── */

/** Login 型別定義。 */
export type Login = {
    id: string;
    balance: number;
    betOptions: number[];
    maxBetCount: number;
    roundHistory: number[];
}

/** BettingStart 型別定義。 */
export type BettingStart = {
    seconds: number;
}

/** CrashBetResult 型別定義。 */
export type CrashBetResult = {
    betIndex: number;
    betAmount: number;
    autoCashoutMultiplier: number | null;
}

/** Flying 型別定義。 */
export type Flying = {
    multiplier: number;
}

/** Explode 型別定義。 */
export type Explode = {
    multiplier: number;
    seconds: number;
}

/** ─── Server → Client ───────────────────────────────────────── */

/** 伺服器 → 客戶端 指令 */
export enum ServerCmd {
    LobbyList = 'lobby.list',
    RoomList = 'room.list',
    RoomJoin = 'room.join',
    RoomJoined = 'room.joined',
    GameInit = 'game.init',
    GameBalance = 'game.balance',
    GameAction = 'game.action',
    RoomRoundState = 'room.round.state',
    RoomRoundStarted = 'room.round.started',
    RoomBetPlaced = 'room.bet.placed',
    RoomCashoutDone = 'room.cashout.done',
    RoomRoundEnded = 'room.round.ended',
}

/** 伺服器指令 → 資料型別映射 */
export type ServerCmdMap = {
    [ServerCmd.LobbyList]: LobbyList;
    [ServerCmd.RoomList]: RoomList;
    [ServerCmd.RoomJoin]: RoomJoinResponse;
    [ServerCmd.RoomJoined]: RoomJoined;
    [ServerCmd.GameInit]: GameInit;
    [ServerCmd.GameBalance]: GameBalance;
    [ServerCmd.GameAction]: GameAction;
    [ServerCmd.RoomRoundState]: RoomRoundState;
    [ServerCmd.RoomRoundStarted]: RoomRoundStarted;
    [ServerCmd.RoomBetPlaced]: RoomBetPlaced;
    [ServerCmd.RoomCashoutDone]: RoomCashoutDone;
    [ServerCmd.RoomRoundEnded]: RoomRoundEnded;
}

/** RoundHistoryData 型別定義。 */
export type RoundHistoryData = {
    /** 舊版欄位 */
    history?: { roundId: string; crashPoint: number; crashedAt: string | null }[];
    /** 新版欄位 */
    items?: { roundId: string; crashPoint: number; crashedAt: string | null }[];
}

/** GameInitData 型別定義。 */
export type GameInitData = {
    currencyCode: string;
    minBet: number;
    maxBet: number;
    betLimitSource?: string;
    decimalPlaces?: number;
    leaderboardLimit?: number;
    maxBetsPerPlayer?: number;
    betOptions: number[];
    existingBets?: any[] | null;
    totalProfit?: number | null;
    startMultiplier?: number;
    maxMultiplier?: number;
    tickIntervalMs?: number;
    multiplierCurve?: { t: number; m: number }[];
}

/** LobbyList 型別定義。 */
export type LobbyList = {
    lobbies: {
        lobbyId: string;
        name: string;
        gameCode: string;
        currencyCode: string;
        minBet: number;
        maxBet: number;
        maxPlayers: number;
        status: string;
        sortOrder: number;
    }[];
}

/** RoomList 型別定義。 */
export type RoomList = {
    rooms: {
        roomId: string;
        gameType: string;
        gameCode: string;
        /** 舊欄位 */
        playerCount?: number;
        /** 新欄位 */
        playersCount?: number;
        maxPlayers: number;
        status: string;
    }[];
}

/** RoomJoinResponse 型別定義。 */
export type RoomJoinResponse = {
    roomId: string;
    gameCode: string;
    playerId: string;
    sessionId: string;
    minBet?: number | null;
    maxBet?: number | null;
    /** 新版欄位 */
    gameState?: GameInitData | null;
    /** 舊版欄位，保留相容 */
    gameInit?: GameInitData | null;
    balance: {
        playerId: string;
        currency: string;
        balanceUnits: string;
    } | null;
    roundHistory?: RoundHistoryData | null;
}

/** RoomJoined 型別定義。 */
export type RoomJoined = {
    roomId: string;
    gameCode: string;
    playerId: string;
    sessionId: string;
}

/** GameInit 型別定義。 */
export type GameInit = {
    /** 新版欄位 */
    gameState?: GameInitData;
    /** 舊版欄位 */
    gameInit?: GameInitData;
    roomId?: string;
    gameCode?: string;
    sessionId?: string;
    minBet?: number | null;
    maxBet?: number | null;
}

/** GameBalance 型別定義。 */
export type GameBalance = {
    playerId: string;
    currency: string;
    balanceUnits: string;
}

/** GameAction 型別定義。 */
export type GameAction = {
    method: string;
    payload?: any;
}

/** Betting 階段的 leaderboard（有 totalBet，無 profit / cashoutMultiplier） */
export type LeaderboardEntryBetting = {
    playerId: string;
    totalBet: number;
    betStatuses: number[];
    rank: number;
}

/** Running / Crashed 階段的 leaderboard（有 profit / cashoutMultiplier，無 totalBet） */
export type LeaderboardEntryRunning = {
    playerId: string;
    profit: number;
    betStatuses: number[];
    cashoutMultiplier?: number | null;
    rank: number;
}

/** LeaderboardEntry 型別定義。 */
export type LeaderboardEntry = LeaderboardEntryBetting | LeaderboardEntryRunning;

/** 回合狀態廣播（Betting / Running / Crashed） */
export type RoomRoundState =
    | {
        roomId: string;
        roundId: string;
        gameCode: string;
        state: 'Betting';
        bettingCountdown: number;
        leaderboard?: LeaderboardEntryBetting[];
    }
    | {
        roomId: string;
        roundId: string;
        gameCode: string;
        state: 'Running';
        currentMultiplier: number;
        runningElapsed?: number;
        leaderboard?: LeaderboardEntryRunning[];
    }
    | {
        roomId: string;
        roundId: string;
        gameCode: string;
        state: 'Crashed';
        crashPoint: number;
        crashedCountdown: number;
        runningElapsed?: number;
        leaderboard?: LeaderboardEntryRunning[];
    };

/** RoomRoundStarted 型別定義。 */
export type RoomRoundStarted = {
    roomId: string;
    roundId: string;
    gameCode: string;
    roundSeq: number;
    state: 'Betting';
    bettingCountdown: number | null;
}

/** RoomBetPlaced 型別定義。 */
export type RoomBetPlaced = {
    roomId: string;
    roundId: string;
    gameCode: string;
    betId: string;
    playerId: string;
    betAmount: number;
    betSeq: number;
    autoCashoutMultiplier: number | null;
    leaderboard?: LeaderboardEntry[];
}

/** 兌現成功廣播 */
export type RoomCashoutDone = {
    roomId: string;
    roundId: string;
    gameCode: string;
    playerId: string;
    betIndex: number;
    cashoutMultiplier: number;
    payoutGross: number;
    serviceFee: number;
    payoutNet: number;
}

/** RoomRoundEnded 型別定義。 */
export type RoomRoundEnded = {
    roomId: string;
    roundId: string;
    gameCode: string;
    kind?: string;
    roundSeq?: number;
    state: 'Settled';
    currentMultiplier: number;
    crashPoint: number;
}
