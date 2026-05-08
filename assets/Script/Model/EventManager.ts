import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { ClientOp, ClientOpMap, CrashAction, ServerOp, ServerOpMap } from './WebsocketModel';
import { GmaeModel, GmaeModelMap } from './GameModel';
import { AudioModel, AudioModelMap } from './AudioModel';

/**
 * 事件中樞與 client↔server 轉發層：
 *   - clientSend：Client → Server 送出（WebsocketManager 訂閱後 ws.send）
 *   - serverPush：Server → Client 推播（WebsocketManager onmessage 發出）
 *   - gameState：客戶端遊戲狀態事件（GameData 翻譯 Server*，View / GameData 發 Request*）
 *
 * 流程：GameData（emit gameState Request*）→ EventManager（純轉發為 clientSend）→ WebsocketManager（ws.send）
 *      ws.onmessage（emit serverPush）→ EventManager（純轉發為 gameState Server*）→ GameData（更新狀態）
 *
 * 本類不持有任何遊戲資料；roomId / instanceId 等業務狀態由 GameData 負責，並隨 Request* payload 一起傳入。
 */
export class EventManager extends BaseModel.Singleton {
    public readonly clientSend = new BaseModel.GameEvent<ClientOp, ClientOpMap>();
    public readonly serverPush = new BaseModel.GameEvent<ServerOp, ServerOpMap>();
    public readonly gameState = new BaseModel.GameEvent<GmaeModel, GmaeModelMap>();
    public readonly audio = new BaseModel.GameEvent<AudioModel, AudioModelMap>();

    constructor() {
        super();
        this.bindServerPush();
        this.bindGameStateRequests();
    }

    private bindServerPush() {
        this.serverPush.on(ServerOp.RoomList, this.onRoomListPush, this);
        this.serverPush.on(ServerOp.RoomJoin, this.onRoomJoinPush, this);
        this.serverPush.on(ServerOp.RoomLeave, this.onRoomLeavePush, this);
        this.serverPush.on(ServerOp.RoomRoundStarted, this.onRoomRoundStartedPush, this);
        this.serverPush.on(ServerOp.RoomRoundState, this.onRoomRoundStatePush, this);
        this.serverPush.on(ServerOp.RoomRoundEnded, this.onRoomRoundEndedPush, this);
        this.serverPush.on(ServerOp.RoomBetPlaced, this.onRoomBetPlacedPush, this);
        this.serverPush.on(ServerOp.RoomCashoutDone, this.onRoomCashoutDonePush, this);
        this.serverPush.on(ServerOp.GameInit, this.onGameInitPush, this);
        this.serverPush.on(ServerOp.GameBalance, this.onGameBalancePush, this);
        this.serverPush.on(ServerOp.GameAction, this.onGameActionPush, this);
    }

    private bindGameStateRequests() {
        this.gameState.on(GmaeModel.RequestGameInit, this.onRequestGameInit, this);
        this.gameState.on(GmaeModel.RequestRoomList, this.onRequestRoomList, this);
        this.gameState.on(GmaeModel.RequestJoinRoom, this.onRequestJoinRoom, this);
        this.gameState.on(GmaeModel.RequestLeaveRoom, this.onRequestLeaveRoom, this);
        this.gameState.on(GmaeModel.RequestReconnect, this.onRequestReconnect, this);
        this.gameState.on(GmaeModel.RequestRoundHistory, this.onRequestRoundHistory, this);
        this.gameState.on(GmaeModel.RequestGameBalance, this.onRequestGameBalance, this);
        this.gameState.on(GmaeModel.RequestBet, this.onRequestBet, this);
        this.gameState.on(GmaeModel.RequestCashout, this.onRequestCashout, this);
    }

    /* ===== serverPush → gameState（Server*）===== */

    private onRoomListPush(data: ServerOpMap[ServerOp.RoomList]) {
        this.gameState.emit(GmaeModel.ServerRoomList, data);
    }

    private onRoomJoinPush(data: ServerOpMap[ServerOp.RoomJoin]) {
        this.gameState.emit(GmaeModel.ServerRoomJoin, data);
    }

    private onRoomLeavePush(data: ServerOpMap[ServerOp.RoomLeave]) {
        this.gameState.emit(GmaeModel.ServerRoomLeave, data);
    }

    private onRoomRoundStartedPush(data: ServerOpMap[ServerOp.RoomRoundStarted]) {
        this.gameState.emit(GmaeModel.ServerRoomRoundStarted, data);
    }

    private onRoomRoundStatePush(data: ServerOpMap[ServerOp.RoomRoundState]) {
        this.gameState.emit(GmaeModel.ServerRoomRoundState, data);
    }

    private onRoomRoundEndedPush(data: ServerOpMap[ServerOp.RoomRoundEnded]) {
        this.gameState.emit(GmaeModel.ServerRoomRoundEnded, data);
    }

    private onRoomBetPlacedPush(data: ServerOpMap[ServerOp.RoomBetPlaced]) {
        this.gameState.emit(GmaeModel.ServerRoomBetPlaced, data);
    }

    private onRoomCashoutDonePush(data: ServerOpMap[ServerOp.RoomCashoutDone]) {
        this.gameState.emit(GmaeModel.ServerRoomCashoutDone, data);
    }

    private onGameInitPush(data: ServerOpMap[ServerOp.GameInit]) {
        this.gameState.emit(GmaeModel.ServerGameInit, data);
    }

    private onGameBalancePush(data: ServerOpMap[ServerOp.GameBalance]) {
        this.gameState.emit(GmaeModel.ServerGameBalance, data);
    }

    private onGameActionPush(data: ServerOpMap[ServerOp.GameAction]) {
        this.gameState.emit(GmaeModel.ServerGameAction, data);
    }

    /* ===== gameState（Request*）→ clientSend ===== */

    private onRequestGameInit(payload: GmaeModelMap[GmaeModel.RequestGameInit]) {
        this.clientSend.emit(ClientOp.GameInit, payload);
    }

    private onRequestRoomList() {
        this.clientSend.emit(ClientOp.RoomList, { status: 'open', limit: 50 });
    }

    private onRequestJoinRoom(payload: GmaeModelMap[GmaeModel.RequestJoinRoom]) {
        this.clientSend.emit(ClientOp.RoomJoin, payload);
    }

    private onRequestLeaveRoom(payload: GmaeModelMap[GmaeModel.RequestLeaveRoom]) {
        this.clientSend.emit(ClientOp.RoomLeave, payload);
    }

    private onRequestReconnect(payload: GmaeModelMap[GmaeModel.RequestReconnect]) {
        this.sendCrashAction(payload.instanceId, CrashAction.Reconnect, {});
    }

    private onRequestRoundHistory(payload: GmaeModelMap[GmaeModel.RequestRoundHistory]) {
        this.sendCrashAction(payload.instanceId, CrashAction.RoundHistory, {});
    }

    private onRequestGameBalance(payload: GmaeModelMap[GmaeModel.RequestGameBalance]) {
        this.clientSend.emit(ClientOp.GameBalance, payload);
    }

    private onRequestBet(payload: GmaeModelMap[GmaeModel.RequestBet]) {
        this.sendCrashAction(payload.instanceId, CrashAction.Bet, {
            bets: payload.betIndexes.map((betIndex) => ({
                betUnits: payload.betUnits,
                autoCashoutMultiplier: payload.autoCashoutMultiplier,
                betIndex,
            })),
        });
    }

    private onRequestCashout(payload: GmaeModelMap[GmaeModel.RequestCashout]) {
        this.sendCrashAction(payload.instanceId, CrashAction.Cashout, { betIndexes: payload.betIndexes });
    }

    private sendCrashAction<M extends CrashAction>(
        instanceId: string,
        method: M,
        payload: Extract<ClientOpMap[ClientOp.GameAction], { method: M }>['payload'],
    ) {
        this.clientSend.emit(ClientOp.GameAction, {
            instanceId,
            method,
            payload,
        } as ClientOpMap[ClientOp.GameAction]);
    }
}
