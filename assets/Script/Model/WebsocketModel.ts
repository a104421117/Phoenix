/**
 * WS 接口型別：opcode、請求/回應 payload、以及 contracts re-export。
 * GameModel.ts 只負責客戶端遊戲事件/狀態；外部 WS 通訊型別都集中在這裡。
 */

import type {
    CrashBetItemContract,
    CrashBetPayload,
} from "../../game-contracts/ts/crash/crashBetPayload";
import type {
    CrashCashoutItemContract,
    CrashCashoutPayload,
} from "../../game-contracts/ts/crash/crashCashoutPayload";
import type { CrashRoundStartedPush } from "../../game-contracts/ts/crash/crashRoundStartedPush";
import type { CrashRoundEndedPush } from "../../game-contracts/ts/crash/crashRoundEndedPush";
import type {
    CrashRoundStatePush,
    CrashLeaderboardItemContract,
} from "../../game-contracts/ts/crash/crashRoundStatePush";
import type { CrashBetPlacedPush } from "../../game-contracts/ts/crash/crashBetPlacedPush";
import type { CrashCashoutDonePush } from "../../game-contracts/ts/crash/crashCashoutDonePush";
import type {
    CrashInitPayload,
    CrashInitBalanceContract,
    CrashInitExistingBetContract,
    CrashRoundHistoryContract,
    CrashHistoryDistributionItemContract,
} from "../../game-contracts/ts/crash/crashInitPayload";
import type { CrashStatePayload } from "../../game-contracts/ts/crash/crashStatePayload";
import type { CrashReconnectPayload } from "../../game-contracts/ts/crash/crashReconnectPayload";
import type { CrashHistoryPayload } from "../../game-contracts/ts/crash/crashHistoryPayload";
import type { CrashBetsPayload } from "../../game-contracts/ts/crash/crashBetsPayload";

export type {
    CrashBetItemContract,
    CrashBetPayload,
    CrashCashoutItemContract,
    CrashCashoutPayload,
    CrashRoundStartedPush,
    CrashRoundEndedPush,
    CrashRoundStatePush,
    CrashLeaderboardItemContract,
    CrashBetPlacedPush,
    CrashCashoutDonePush,
    CrashInitPayload,
    CrashInitBalanceContract,
    CrashInitExistingBetContract,
    CrashRoundHistoryContract,
    CrashHistoryDistributionItemContract,
    CrashStatePayload,
    CrashReconnectPayload,
    CrashHistoryPayload,
    CrashBetsPayload,
};

/** Client → Server opcodes. */
export enum ClientOp {
    RoomList = 'room.list',
    RoomJoin = 'room.join',
    RoomLeave = 'room.leave',
    GameInit = 'game.init',
    GameBalance = 'game.balance',
    GameAction = 'game.action',
}

/** game.action method 名稱（client/server 共用）。 */
export enum CrashAction {
    Bet = 'crash.bet',
    Cashout = 'crash.cashout',
    State = 'crash.state',
    Reconnect = 'crash.reconnect',
    RoundHistory = 'crash.roundHistory',
    Bets = 'crash.bets',
}

/** Client → Server: 各 method 對應的 request payload。 */
export type ClientOpGameActionPayloadMap = {
    [CrashAction.Bet]: {
        bets: {
            betUnits: number;
            autoCashoutMultiplier: number | null;
            betIndex: number;
        }[];
    };
    [CrashAction.Cashout]: { betIndexes: number[] };
    [CrashAction.RoundHistory]: Record<string, never>;
    [CrashAction.Reconnect]: Record<string, never>;
    [CrashAction.Bets]: Record<string, never>;
}

/**
 * Client → Server: game.action 請求 payload。
 * 以 `M`（CrashAction enum 成員）映射對應的 payload 形狀；省略時為所有合法 variant 的 discriminated union。
 */
export type ClientOpGameAction<
    M extends keyof ClientOpGameActionPayloadMap = keyof ClientOpGameActionPayloadMap
> = {
    [K in M]: {
        instanceId: string;
        method: K;
        payload: ClientOpGameActionPayloadMap[K];
    };
}[M];

/** Payload shape per ClientOp（送出端）。 */
export type ClientOpMap = {
    [ClientOp.RoomList]: { status: string; limit: number };
    [ClientOp.RoomJoin]: { roomId: string };
    [ClientOp.RoomLeave]: { roomId: string };
    [ClientOp.GameInit]: { roomId: string };
    [ClientOp.GameBalance]: { instanceId: string };
    [ClientOp.GameAction]: ClientOpGameAction;
}

/** Server → Client opcodes. */
export enum ServerOp {
    RoomList = 'room.list',
    RoomJoin = 'room.join',
    RoomLeave = 'room.leave',
    GameInit = 'game.init',
    GameBalance = 'game.balance',
    GameAction = 'game.action',
    RoomRoundState = 'room.round.state',
    RoomRoundStarted = 'room.round.started',
    RoomBetPlaced = 'room.bet.placed',
    RoomCashoutDone = 'room.cashout.done',
    RoomRoundEnded = 'room.round.ended',
}

/** Room list payload. */
export type RoomList = {
    rooms: {
        roomId: string;
        gameCategory: string;
        gameCode: string;
        playerCount: number;
        maxPlayers: number;
        status: string;
    }[];
}

export type RoomLeaveResponse = {
    roomId: string;
    roomClosed: boolean;
    rooms: RoomList['rooms'];
}

export type RoomJoinResponse = {
    roomId: string;
    gameCode: string;
    playerId: string;
    sessionId: string;
    minBet: number | null;
    maxBet: number | null;
    gameState: CrashInitPayload | null;
    balance: CrashInitBalanceContract | null;
    roundHistory: number[] | null;
}

export type GameInit = {
    gameState: CrashInitPayload;
    roomId: string;
    gameCode: string;
    sessionId: string;
    minBet: number | null;
    maxBet: number | null;
}

/** Server → Client: 各 method 對應的 push payload。 */
export type ServerOpGameActionPayloadMap = {
    [CrashAction.Bet]: CrashBetPayload;
    [CrashAction.Cashout]: CrashCashoutPayload;
    [CrashAction.State]: CrashStatePayload;
    [CrashAction.Reconnect]: CrashReconnectPayload;
    [CrashAction.RoundHistory]: CrashHistoryPayload;
    [CrashAction.Bets]: CrashBetsPayload;
}

/**
 * Server → Client: game.action 推播 payload。
 * 以 `M`（CrashAction enum 成員）映射對應的 payload 形狀；省略時為所有合法 variant 的 discriminated union。
 */
export type ServerOpGameAction<
    M extends keyof ServerOpGameActionPayloadMap = keyof ServerOpGameActionPayloadMap
> = {
    [K in M]: {
        method: K;
        payload: ServerOpGameActionPayloadMap[K];
    };
}[M];

/** Payload shape per ServerOp（接收端）。 */
export type ServerOpMap = {
    [ServerOp.RoomList]: RoomList;
    [ServerOp.RoomJoin]: RoomJoinResponse;
    [ServerOp.RoomLeave]: RoomLeaveResponse;
    [ServerOp.GameInit]: GameInit;
    [ServerOp.GameBalance]: CrashInitBalanceContract;
    [ServerOp.GameAction]: ServerOpGameAction;
    [ServerOp.RoomRoundState]: CrashRoundStatePush;
    [ServerOp.RoomRoundStarted]: CrashRoundStartedPush;
    [ServerOp.RoomBetPlaced]: CrashBetPlacedPush;
    [ServerOp.RoomCashoutDone]: CrashCashoutDonePush;
    [ServerOp.RoomRoundEnded]: CrashRoundEndedPush;
}
