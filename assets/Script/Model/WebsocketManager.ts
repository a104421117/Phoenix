import { GameClient } from '@juprojects/game-sdk';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import {
    GameActionOpcodes,
    Opcodes,
    OpcodesRoomRound,
} from './WebsocketModel';
import type {
    BalanceResponse,
    CrashBetPayload,
    CrashBetRequestPayload,
    CrashBetsPayload,
    CrashCashoutPayload,
    CrashCashoutRequestPayload,
    CrashHistoryPayload,
    CrashReconnectPayload,
    CrashRoundEndedPush,
    CrashRoundStartedPush,
    CrashRoundStatePush,
    CrashStatePayload,
    Disposable,
    GameActionPayloadFor,
    GameActionPayloadMap,
    GameActionRequestPayloadMap,
    GameActionResponse,
    GameInitMessage,
    GameInitResponse,
    JoinRoomMessage,
    JoinRoomResponse,
    LeaveRoomMessage,
    LeaveRoomResponse,
    RoomListRequest,
    RoomListResponse,
    WalletBalanceRequest,
    WsRequestMap,
    WsResponseMap,
} from './WebsocketModel';

export type {
    BalanceResponse,
    CrashBetItemContract,
    CrashBetPayload,
    CrashBetRequestItem,
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
} from './WebsocketModel';

export class WebSocketManager extends BaseModel.Singleton {
    private client: GameClient | null = null;
    private disposables: Disposable[] = [];

    public get IsConnected(): boolean {
        return this.client !== null;
    }

    public async connect(url: string, token: string): Promise<void> {
        if (this.client) return;
        const client = new GameClient({
            url,
            token,
            reconnect: { enabled: true },
            requestTimeoutMs: 30000,
        });
        await client.connect();
        this.client = client;
    }

    /* ===== Requests ===== */

    public async getRoomList(payload: RoomListRequest): Promise<RoomListResponse> {
        try {
            return await this.request(Opcodes.Room.List, payload);
        } catch (error) {
            throw this.createRequestError(Opcodes.Room.List, error);
        }
    }

    public async getRoomJoin(payload: JoinRoomMessage): Promise<JoinRoomResponse> {
        try {
            return await this.request(Opcodes.Room.Join, payload);
        } catch (error) {
            throw this.createRequestError(Opcodes.Room.Join, error);
        }
    }

    public async getRoomLeave(payload: LeaveRoomMessage): Promise<LeaveRoomResponse> {
        try {
            return await this.request(Opcodes.Room.Leave, payload);
        } catch (error) {
            throw this.createRequestError(Opcodes.Room.Leave, error);
        }
    }

    public async getGameInit(payload: GameInitMessage): Promise<GameInitResponse> {
        try {
            return await this.request(Opcodes.Game.Init, payload);
        } catch (error) {
            throw this.createRequestError(Opcodes.Game.Init, error);
        }
    }

    public async getWalletBalance(payload: WalletBalanceRequest): Promise<BalanceResponse> {
        try {
            return await this.request(Opcodes.Wallet.Balance, payload);
        } catch (error) {
            throw this.createRequestError(Opcodes.Wallet.Balance, error);
        }
    }

    public async sendCrashBet(instanceId: string, payload: CrashBetRequestPayload): Promise<CrashBetPayload> {
        try {
            return await this.gameAction(GameActionOpcodes.CrashBet, instanceId, payload);
        } catch (error) {
            throw this.createRequestError(GameActionOpcodes.CrashBet, error);
        }
    }

    public async sendCrashCashout(instanceId: string, payload: CrashCashoutRequestPayload): Promise<CrashCashoutPayload> {
        try {
            return await this.gameAction(GameActionOpcodes.CrashCashout, instanceId, payload);
        } catch (error) {
            throw this.createRequestError(GameActionOpcodes.CrashCashout, error);
        }
    }

    public async getCrashRoundHistory(instanceId: string, payload: Record<string, never>): Promise<CrashHistoryPayload> {
        try {
            return await this.gameAction(GameActionOpcodes.CrashRoundHistory, instanceId, payload);
        } catch (error) {
            throw this.createRequestError(GameActionOpcodes.CrashRoundHistory, error);
        }
    }

    public async getCrashReconnect(instanceId: string, payload: Record<string, never>): Promise<CrashReconnectPayload> {
        try {
            return await this.gameAction(GameActionOpcodes.CrashReconnect, instanceId, payload);
        } catch (error) {
            throw this.createRequestError(GameActionOpcodes.CrashReconnect, error);
        }
    }

    public async getCrashBets(instanceId: string, payload: Record<string, never>): Promise<CrashBetsPayload> {
        try {
            return await this.gameAction(GameActionOpcodes.CrashBets, instanceId, payload);
        } catch (error) {
            throw this.createRequestError(GameActionOpcodes.CrashBets, error);
        }
    }

    /* ===== Pushes ===== */

    public onRoomRoundState(handler: (data: CrashRoundStatePush) => void, target?: any): Disposable {
        return this.on(OpcodesRoomRound.State, handler, target);
    }

    public onRoomRoundStarted(handler: (data: CrashRoundStartedPush) => void, target?: any): Disposable {
        return this.on(OpcodesRoomRound.Started, handler, target);
    }

    public onRoomRoundEnded(handler: (data: CrashRoundEndedPush) => void, target?: any): Disposable {
        return this.on(OpcodesRoomRound.Ended, handler, target);
    }

    public onCrashState(handler: (payload: CrashStatePayload) => void, target?: any): Disposable {
        return this.onGameAction(GameActionOpcodes.CrashState, handler, target);
    }

    public onCrashRoundHistory(handler: (payload: CrashHistoryPayload) => void, target?: any): Disposable {
        return this.onGameAction(GameActionOpcodes.CrashRoundHistory, handler, target);
    }

    public async close(): Promise<void> {
        this.disposables.forEach((d) => d.dispose());
        this.disposables.length = 0;
        const client = this.client;
        this.client = null;
        if (client) await client.close();
    }

    /* ===== Internal ===== */

    private async gameAction<M extends keyof GameActionRequestPayloadMap & keyof GameActionPayloadMap>(
        method: M,
        instanceId: string,
        payload: GameActionRequestPayloadMap[M],
    ): Promise<GameActionPayloadFor<M>> {
        const response = await this.request(Opcodes.Game.Action, { instanceId, method, payload });
        return response.payload as GameActionPayloadFor<M>;
    }

    private onGameAction<M extends keyof GameActionPayloadMap>(
        method: M,
        handler: (payload: GameActionPayloadFor<M>) => void,
        target?: any,
    ): Disposable {
        const bound = target ? handler.bind(target) : handler;
        return this.on(Opcodes.Game.Action, (data: GameActionResponse) => {
            if (data.method !== method) return;
            const payload = data.payload as GameActionPayloadFor<M>;
            bound(payload);
        });
    }

    private on<TOp extends keyof WsResponseMap>(
        op: TOp,
        handler: (data: WsResponseMap[TOp]) => void,
        target?: any,
    ): Disposable {
        if (!this.client) {
            throw new Error('[WebSocketManager] on() before connect');
        }
        const bound = target ? handler.bind(target) : handler;
        const disposable = this.client.on(op, (data) => bound(data as WsResponseMap[TOp])) as Disposable;
        this.disposables.push(disposable);
        return disposable;
    }

    /**
     * 統一 error 處理：接口任何錯誤都在這裡 log + 吞掉，回傳 null。
     * 上層 (caller) 用 null-check 判斷失敗，不需要再 throw/catch。
     */
    private request<T extends keyof WsRequestMap & keyof WsResponseMap>(
        op: T,
        data: WsRequestMap[T],
    ): Promise<WsResponseMap[T]> {
        if (!this.client) {
            return Promise.reject(new Error('[WebSocketManager] request before connect'));
        }
        return this.client.request(op, data) as Promise<WsResponseMap[T]>;
    }

    private createRequestError(op: string, error: unknown): Error {
        const detail = error instanceof Error ? error.message : String(error);
        const wrapped = new Error(`[WebSocketManager] ${op} failed: ${detail}`);
        (wrapped as any).op = op;
        (wrapped as any).error = error;
        return wrapped;
    }
}
