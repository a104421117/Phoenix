/**
 * WebSocket wire definitions and SDK type mapping.
 *
 * Keep SDK-generated models here, then narrow or reshape them into the
 * client-facing contract used by WebSocketManager and GameController.
 */

import { GameActionOpcodes, Opcodes } from '@juprojects/game-sdk';
import type {
    BalanceResponse,
    CrashBetItemContract,
    CrashBetPayload,
    CrashBetsPayload,
    CrashCashoutItemContract,
    CrashCashoutPayload,
    CrashHistoryDistributionItemContract,
    CrashHistoryPayload,
    CrashInitExistingBetContract,
    CrashInitPayload,
    CrashLeaderboardItemContract,
    CrashMultiplierCurvePointContract,
    CrashReconnectPayload,
    CrashRoundEndedPush,
    CrashRoundHistoryContract,
    CrashRoundStartedPush,
    CrashRoundStatePush,
    CrashStatePayload,
    Disposable,
    GameActionPayloadFor,
    GameActionPayloadMap,
    GameActionRequest,
    GameActionResponse,
    GameInitMessage,
    GameInitResponse,
    JoinRoomMessage,
    JoinRoomResponse,
    LeaveRoomMessage,
    LeaveRoomResponse,
    MoneyDecimal,
    RoomListRequest,
    RoomListResponse,
    RoomSummary,
    WalletBalanceRequest,
} from '@juprojects/game-sdk';

export type {
    BalanceResponse,
    CrashBetItemContract,
    CrashBetPayload,
    CrashBetsPayload,
    CrashCashoutItemContract,
    CrashCashoutPayload,
    CrashHistoryDistributionItemContract,
    CrashHistoryPayload,
    CrashInitExistingBetContract,
    CrashInitPayload,
    CrashLeaderboardItemContract,
    CrashMultiplierCurvePointContract,
    CrashReconnectPayload,
    CrashRoundEndedPush,
    CrashRoundHistoryContract,
    CrashRoundStartedPush,
    CrashRoundStatePush,
    CrashStatePayload,
    Disposable,
    GameInitMessage,
    GameInitResponse,
    JoinRoomMessage,
    JoinRoomResponse,
    LeaveRoomMessage,
    LeaveRoomResponse,
    MoneyDecimal,
    RoomListRequest,
    RoomListResponse,
    RoomSummary,
    WalletBalanceRequest,
};

export const OpcodesRoomRound = {
    State: 'room.round.state',
    Started: 'room.round.started',
    Ended: 'room.round.ended',
} as const;

export { GameActionOpcodes, Opcodes };
export type { GameActionPayloadFor, GameActionPayloadMap, GameActionRequest, GameActionResponse };

export type CrashBetRequestItem = {
    betAmount: MoneyDecimal;
    autoCashoutMultiplier: number | null;
    betIndex: number;
};

export type CrashBetRequestPayload = {
    bets: CrashBetRequestItem[];
    requestId: string;
};

export type CrashCashoutRequestPayload = {
    betIndexes: number[];
};

/** Client → Server: 各 game.action method 對應的 request payload（Phoenix 自訂，SDK 沒映射這層）。 */
export type GameActionRequestPayloadMap = {
    [GameActionOpcodes.CrashBet]: CrashBetRequestPayload;
    [GameActionOpcodes.CrashCashout]: CrashCashoutRequestPayload;
    [GameActionOpcodes.CrashRoundHistory]: Record<string, never>;
    [GameActionOpcodes.CrashReconnect]: Record<string, never>;
    [GameActionOpcodes.CrashBets]: Record<string, never>;
};

export type WsRequestMap = {
    [Opcodes.Room.List]: RoomListRequest;
    [Opcodes.Room.Join]: JoinRoomMessage;
    [Opcodes.Room.Leave]: LeaveRoomMessage;
    [Opcodes.Game.Init]: GameInitMessage;
    [Opcodes.Wallet.Balance]: WalletBalanceRequest;
    [Opcodes.Game.Action]: GameActionRequest;
};

export type WsResponseMap = {
    [Opcodes.Room.List]: RoomListResponse;
    [Opcodes.Room.Join]: JoinRoomResponse;
    [Opcodes.Room.Leave]: LeaveRoomResponse;
    [Opcodes.Game.Init]: GameInitResponse;
    [Opcodes.Wallet.Balance]: BalanceResponse;
    [Opcodes.Game.Action]: GameActionResponse;
    [OpcodesRoomRound.State]: CrashRoundStatePush;
    [OpcodesRoomRound.Started]: CrashRoundStartedPush;
    [OpcodesRoomRound.Ended]: CrashRoundEndedPush;
};

/* ===== Request payload constructors (trivial wire-shape literals; pair with type defs above) ===== */

/** 房間列表查詢請求 payload。 */
export function encodeRoomList(status: string, limit: number): RoomListRequest {
    return { status, limit };
}

/** 加入房間請求 payload。 */
export function encodeRoomJoin(roomId: string): JoinRoomMessage {
    return { roomId };
}

/** 離開房間請求 payload。 */
export function encodeRoomLeave(roomId: string): LeaveRoomMessage {
    return { roomId };
}

/** Game.Init 請求 payload。 */
export function encodeGameInit(roomId: string): GameInitMessage {
    return { roomId };
}

/** 錢包餘額查詢 payload（目前 server 不需參數）。 */
export function encodeWalletBalance(): WalletBalanceRequest {
    return {};
}

/** crash.bet 請求 payload。 */
export function encodeCrashBet(bets: CrashBetRequestItem[], requestId: string): CrashBetRequestPayload {
    return { bets, requestId };
}

/** crash.cashout 請求 payload。 */
export function encodeCrashCashout(betIndexes: number[]): CrashCashoutRequestPayload {
    return { betIndexes };
}

/** crash.roundHistory 請求 payload（無參數）。 */
export function encodeCrashRoundHistory(): Record<string, never> {
    return {};
}

/** crash.reconnect 請求 payload（無參數）。 */
export function encodeCrashReconnect(): Record<string, never> {
    return {};
}

/** crash.bets 請求 payload（無參數）。 */
export function encodeCrashBets(): Record<string, never> {
    return {};
}
