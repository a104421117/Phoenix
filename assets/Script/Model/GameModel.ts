import { LobbyList } from "./WebsocketModel";

/** GmaeModel 列舉。 */
export enum GmaeModel {
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
    ExistingBets = "ExistingBets",
    Lobbies = "Lobbies",
};

/** ExistingBetStatus 型別定義。 */
export type ExistingBetStatus =
    | 'WalletPending'
    | 'Pending'
    | 'CashoutPending'
    | 'CashedOut'
    | 'Lost'
    | string;

/** ExistingBet 型別定義。 */
export type ExistingBet = {
    betId?: string;
    betIndex: number;
    betAmount: number;
    status?: ExistingBetStatus;
    autoCashoutMultiplier?: number | null;
    cashoutMultiplier?: number | null;
    payoutGross?: number | null;
    serviceFee?: number | null;
    payoutNet?: number | null;
    currentProfit?: number | null;
    cashoutAtUtc?: string | null;
};

/** LeaderboardItem 型別定義。 */
export type LeaderboardItem = {
    playerId: string;
    totalBet: number;
    profit: number;
    cashoutMultiplier?: number | null;
    rank: number;
    betStatuses: number[];
};

/** CrashBetPayload 型別定義。 */
export type CrashBetPayload = {
    betId?: string;
    betIndex: number;
    betAmount: number;
    autoCashoutMultiplier?: number | null;
    balanceUnits?: number | string | null;
};

/** CashoutPayload 型別定義。 */
export type CashoutPayload = {
    betIndex: number;
    cashoutMultiplier: number;
    payoutGross: number;
    serviceFee: number;
    payoutNet: number;
    payout?: number;
    balanceUnits?: number | string | null;
};

/** crash.bet 批次回應（payload） */
export type CrashBetBatchPayload = {
    bets?: CrashBetPayload[];
    balanceUnits?: number | string | null;
};

/** crash.cashout 批次回應（payload） */
export type CashoutBatchPayload = {
    cashouts?: CashoutPayload[];
    totalPayout?: number;
    balanceUnits?: number | string | null;
};

/** MultiplierCurvePoint 型別定義。 */
export type MultiplierCurvePoint = {
    t: number;
    m: number;
};

/** GmaeModelMap 型別定義。 */
export type GmaeModelMap = {
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
    [GmaeModel.CrashBet]: CrashBetPayload;
    [GmaeModel.Cashout]: CashoutPayload;
    [GmaeModel.ExistingBets]: ExistingBet[];
    [GmaeModel.Lobbies]: LobbyList;
}
