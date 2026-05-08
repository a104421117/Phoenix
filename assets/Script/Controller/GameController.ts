import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { EventManager } from '../Model/EventManager';
import { GameData } from '../Model/GameData';
import {
    ExistingBet,
    ExistingBetStatus,
    GameErrorPrompt,
    GmaeModel,
    LeaderboardItem,
    MultiplierCurvePoint,
} from '../Model/GameModel';
import {
    CrashAction,
    CrashBetItemContract,
    CrashBetPayload,
    CrashBetPlacedPush,
    CrashCashoutDonePush,
    CrashCashoutItemContract,
    CrashCashoutPayload,
    CrashHistoryDistributionItemContract,
    CrashHistoryPayload,
    CrashInitBalanceContract,
    CrashRoundEndedPush,
    CrashRoundHistoryContract,
    CrashRoundStartedPush,
    CrashRoundStatePush,
    GameInit,
    RoomJoinResponse,
    RoomLeaveResponse,
    RoomList,
    ServerOpGameAction,
} from '../Model/WebsocketModel';

type RoundHistoryUpdateSource = 'sync' | 'push';

/**
 * 全域業務邏輯層（Singleton，永久存活）：
 *   - 訂閱 gameState 上的 Server* 事件，將 server payload 翻譯成 GameData 狀態變更
 *   - 對外提供玩家動作（sendBet / sendCashout / selectBetUnits / ...）
 *   - 透過 update* helper 寫入 GameData 後 emit gameState 通知 view
 *   - 自身不持有遊戲資料；GameData 是純 get/set，無 emit 無 cascade
 */
export class GameController extends BaseModel.Singleton {
    private pendingBetUnits: number = 0;

    constructor() {
        super();
        this.bindGameStateServerEvents();
    }

    private bindGameStateServerEvents() {
        const bus = EventManager.getInstance().gameState;
        bus.on(GmaeModel.ServerRoomList, this.onRoomListPush, this);
        bus.on(GmaeModel.ServerRoomLeave, this.onRoomLeavePush, this);
        bus.on(GmaeModel.ServerRoomJoin, this.onRoomJoinPush, this);
        bus.on(GmaeModel.ServerRoomRoundStarted, this.onRoomRoundStartedPush, this);
        bus.on(GmaeModel.ServerRoomRoundState, this.onRoomRoundStatePush, this);
        bus.on(GmaeModel.ServerRoomRoundEnded, this.onRoomRoundEndedPush, this);
        bus.on(GmaeModel.ServerRoomBetPlaced, this.onRoomBetPlacedPush, this);
        bus.on(GmaeModel.ServerRoomCashoutDone, this.onRoomCashoutDonePush, this);
        bus.on(GmaeModel.ServerGameInit, this.onGameInitPush, this);
        bus.on(GmaeModel.ServerGameBalance, this.onGameBalancePush, this);
        bus.on(GmaeModel.ServerGameAction, this.onGameActionPush, this);
    }

    /* ===== Server* push handlers ===== */

    private onRoomListPush(data: RoomList) {
        EventManager.getInstance().gameState.emit(GmaeModel.Rooms, data);
    }

    private onRoomLeavePush(data: RoomLeaveResponse) {
        if (data.roomId === GameData.getInstance().RoomId) {
            this.updateRoomId('');
        }
        if (Array.isArray(data?.rooms)) {
            EventManager.getInstance().gameState.emit(GmaeModel.Rooms, { rooms: data.rooms });
        }
    }

    private onRoomJoinPush(data: RoomJoinResponse) {
        const gameData = GameData.getInstance();
        this.updateRoomId(data.roomId);
        this.updatePlayerId(data.playerId);
        const init = data.gameState;
        const hasGameState = init !== null && init !== undefined;
        if (init) {
            this.applyCurrencyScale(init.currencyScale);
            this.updateBetOptions(this.normalizeBetOptions(init.betOptions));
            this.updateMaxBetCount(init.maxBetsPerPlayer ?? init.betOptions?.length ?? 0);
            this.applyExistingBets(init.existingBets);
            this.applyMultiplierCurve(init.multiplierCurve);
        } else {
            this.applyExistingBets([]);
            this.applyMultiplierCurve([]);
        }
        const balance = init?.balance ?? data.balance;
        const hasBalance = this.applyBalanceUnits(balance);
        if (hasBalance && gameData.Balance < 1) {
            this.showError(GameErrorPrompt.InsufficientBalanceWithPeriod);
        }
        gameData.RoomJoinHasGameState = hasGameState;
        gameData.RoomJoinHasBalance = hasBalance;
        const roundHistory = init?.roundHistory ?? data.roundHistory;
        this.handleRoundHistory(roundHistory ?? [], 'sync');
        EventManager.getInstance().gameState.emit(GmaeModel.RoomJoined, data);
    }

    private onRoomRoundStatePush(data: CrashRoundStatePush) {
        switch (data.state) {
            case 'Betting':
                this.handleBetting(data.bettingCountdown ?? 0);
                break;
            case 'Running':
                this.handleRunning(data.currentMultiplier ?? 1, data.runningElapsed ?? undefined);
                break;
            case 'Crashed':
                this.handleCrashed(data.crashPoint ?? 0, data.crashedCountdown ?? 0, data.runningElapsed ?? undefined);
                break;
        }
        if (GameData.getInstance().RoundState !== 'Settled') {
            this.handleLeaderboard(data.leaderboard);
        }
    }

    private onRoomRoundStartedPush(data: CrashRoundStartedPush) {
        this.onRoomRoundStatePush({ ...data, leaderboard: null });
    }

    private onRoomRoundEndedPush(_data: CrashRoundEndedPush) {
        this.handleSettled();
    }

    private onRoomBetPlacedPush(data: CrashBetPlacedPush) {
        this.handleCrashBet(data);
    }

    private onRoomCashoutDonePush(data: CrashCashoutDonePush) {
        this.handleCashout(data);
    }

    private onGameInitPush(data: GameInit) {
        this.updateRoomId(data.roomId);
        const init = data?.gameState;
        if (!init) return;
        this.applyCurrencyScale(init.currencyScale);
        this.updateBetOptions(this.normalizeBetOptions(init.betOptions ?? []));
        this.updateMaxBetCount(init.maxBetsPerPlayer ?? init.betOptions?.length ?? 0);
        this.applyExistingBets(init.existingBets);
        this.applyMultiplierCurve(init.multiplierCurve);
        if (this.applyBalanceUnits(init.balance) && GameData.getInstance().Balance < 1) {
            this.showError(GameErrorPrompt.InsufficientBalanceWithPeriod);
        }
        if (init.roundHistory !== null && init.roundHistory !== undefined) {
            this.handleRoundHistory(init.roundHistory, 'sync');
        }
    }

    private onGameBalancePush(data: CrashInitBalanceContract) {
        this.applyBalanceUnits(data);
    }

    private onGameActionPush(data: ServerOpGameAction) {
        switch (data.method) {
            case CrashAction.Bet:
                this.handleCrashBet(data.payload ?? data);
                break;
            case CrashAction.Cashout:
                this.handleCashout(data.payload ?? data);
                break;
            case CrashAction.State:
                this.applyRoundStateByEnum(data.payload ?? data);
                break;
            case CrashAction.Reconnect:
                this.handleReconnect(data.payload ?? data);
                break;
            case CrashAction.RoundHistory:
                this.handleRoundHistory(data.payload, 'push');
                break;
            case CrashAction.Bets:
                this.handleCrashBets(data.payload ?? data);
                break;
        }
    }

    /* ===== State change handlers ===== */

    private handleBetting(bettingCountdown: number) {
        const gameData = GameData.getInstance();
        const state = gameData.RoundState;
        if (state === 'Running' || state === 'Crashed' || state === 'Settled') {
            this.updateExistingBets([]);
        }
        this.pendingBetUnits = 0;
        gameData.RoundState = 'Betting';
        this.updateRunningElapsed(0);
        EventManager.getInstance().gameState.emit(GmaeModel.BettingCountdown, bettingCountdown);
        gameData.IsCrashed = false;
        gameData.BetIndex = this.getNextBetIndex();
    }

    private handleRunning(currentMultiplier: number, runningElapsed?: number) {
        const gameData = GameData.getInstance();
        if (gameData.RoundState === 'Settled') return;
        gameData.RoundState = 'Running';
        if (Number.isFinite(runningElapsed)) {
            this.updateRunningElapsed(Math.max(0, runningElapsed!));
        }
        EventManager.getInstance().gameState.emit(GmaeModel.Multiplier, currentMultiplier);
    }

    private handleCrashed(crashPoint: number, crashedCountdown: number, runningElapsed?: number) {
        const gameData = GameData.getInstance();
        if (!Number.isFinite(crashPoint) || crashPoint <= 0) return;
        if (gameData.RoundState === 'Settled') return;
        gameData.RoundState = 'Crashed';
        if (Number.isFinite(runningElapsed)) {
            this.updateRunningElapsed(Math.max(0, runningElapsed!));
        }
        EventManager.getInstance().gameState.emit(GmaeModel.CrashedCountdown, crashedCountdown);
        if (!gameData.IsCrashed) {
            gameData.IsCrashed = true;
            EventManager.getInstance().gameState.emit(GmaeModel.Explode, crashPoint);
        }
    }

    private handleSettled() {
        this.pendingBetUnits = 0;
        GameData.getInstance().RoundState = 'Settled';
        this.updateLeaderboard([]);
        EventManager.getInstance().gameState.emit(GmaeModel.Settled);
    }

    private handleCrashBet(payload: CrashBetPayload | CrashBetItemContract | any) {
        const gameData = GameData.getInstance();
        const bets = this.extractCrashBetPayloads(payload);
        if (bets.length <= 0) return;
        this.releasePendingBetUnits(bets);
        bets.forEach((bet) => {
            gameData.BetIndex = Math.max(gameData.BetIndex, bet.betIndex + 1);
            this.upsertExistingBet({
                betIndex: bet.betIndex,
                betAmount: bet.betAmount as unknown as number,
                status: ExistingBetStatus.Pending,
                autoCashoutMultiplier: bet.autoCashoutMultiplier ?? null,
            });
            EventManager.getInstance().gameState.emit(GmaeModel.CrashBet, bet);
        });
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    private handleCashout(payload: CrashCashoutPayload | CrashCashoutItemContract | any) {
        const gameData = GameData.getInstance();
        const cashouts = this.extractCashoutPayloads(payload);
        const totalPayout = this.parseNullableNum(payload?.totalPayout);
        if (totalPayout !== null) {
            EventManager.getInstance().gameState.emit(GmaeModel.CashoutTotalPayout, totalPayout);
        }
        if (cashouts.length <= 0) {
            this.syncBalanceUnits(payload?.balanceUnits);
            return;
        }
        cashouts.forEach((cashout) => {
            this.upsertExistingBet({
                betIndex: cashout.betIndex,
                betAmount: gameData.ExistingBets.find((b) => b.betIndex === cashout.betIndex)?.betAmount ?? 0,
                status: ExistingBetStatus.CashedOut,
                cashoutMultiplier: cashout.cashoutMultiplier,
                payout: cashout.payout as unknown as number,
                payoutGross: cashout.payoutGross as unknown as number,
                serviceFee: cashout.serviceFee as unknown as number,
                payoutNet: cashout.payoutNet as unknown as number,
            });
            EventManager.getInstance().gameState.emit(GmaeModel.Cashout, cashout);
        });
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    private handleRoundHistory(
        payload: CrashHistoryPayload | CrashRoundHistoryContract | number[] | null | undefined,
        source: RoundHistoryUpdateSource = 'sync',
    ) {
        const gameData = GameData.getInstance();
        const normalizedHistory = this.normalizeRoundHistory(payload);
        this.applyRoundHistorySummary(payload, normalizedHistory);
        const isDuplicatePush = source === 'push' && this.isSameRoundHistory(gameData.RoundHistory, normalizedHistory);
        gameData.LastRoundHistoryUpdateSource = isDuplicatePush ? 'sync' : source;
        this.updateRoundHistory(normalizedHistory);
    }

    private handleLeaderboard(rawLeaderboard: any[] | null | undefined) {
        if (!Array.isArray(rawLeaderboard)) return;
        const sorted = rawLeaderboard
            .map((item) => this.normalizeLeaderboardItem(item))
            .filter((item): item is LeaderboardItem => item !== null)
            .sort((a, b) => a.rank - b.rank);
        this.updateLeaderboard(sorted);
    }

    private handleCrashBets(payload: any) {
        if (this.hasBets(payload)) {
            this.applyExistingBets(this.extractRawBets(payload));
        }
        this.handleCashout(payload);
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    private handleReconnect(payload: any) {
        this.applyRoundStateByEnum(payload);
        if (this.hasBets(payload)) {
            this.applyExistingBets(this.extractRawBets(payload));
        }
        this.handleCashout(payload);
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    private applyExistingBets(rawExistingBets: any[] | null | undefined) {
        const bets = Array.isArray(rawExistingBets)
            ? rawExistingBets
                .map((item) => this.normalizeExistingBet(item))
                .filter((item): item is ExistingBet => item !== null)
            : [];
        const sorted = [...bets].sort((a, b) => a.betIndex - b.betIndex);
        this.updateExistingBets(sorted);
        GameData.getInstance().BetIndex = this.getNextBetIndex();
    }

    private applyMultiplierCurve(rawMultiplierCurve: any[] | null | undefined) {
        const curve = Array.isArray(rawMultiplierCurve)
            ? rawMultiplierCurve
                .map((item) => ({ t: Number(item?.t), m: Number(item?.m) }))
                .filter((item) => Number.isFinite(item.t) && Number.isFinite(item.m))
            : [];
        this.updateMultiplierCurve(this.normalizeMultiplierCurve(curve));
    }

    private applyBalanceUnits(payload: { balanceUnits?: string | number } | null | undefined): boolean {
        if (!payload) return false;
        const balance = Number(payload.balanceUnits);
        if (!Number.isFinite(balance)) return false;
        this.updateBalance(balance);
        return true;
    }

    /** 從 server 收到的 currencyScale 寫回 GameData（僅供顯示參考，不再做 scale 轉換）。 */
    private applyCurrencyScale(scale: number | null | undefined) {
        if (typeof scale !== 'number' || !Number.isInteger(scale) || scale < 0) return;
        GameData.getInstance().CurrencyScale = scale;
    }

    /* ===== Player actions (Request*) ===== */

    public sendBet() {
        this.sendBets(this.resolveSelectedBetUnits(), 1, null);
    }

    public canAffordBets(betUnits: number, count: number): boolean {
        const normalizedBetUnits = Number(betUnits);
        const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
        if (!Number.isFinite(normalizedBetUnits) || normalizedBetUnits <= 0 || normalizedCount <= 0) return false;
        return this.hasEnoughBalance(normalizedBetUnits * normalizedCount);
    }

    public sendBets(betUnits: number, count: number, autoCashoutMultiplier: number | null = null): number[] {
        const gameData = GameData.getInstance();
        if (!gameData.RoomId) return [];
        const normalizedBetUnits = Number(betUnits);
        const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
        if (!Number.isFinite(normalizedBetUnits) || normalizedBetUnits <= 0 || normalizedCount <= 0) return [];
        if (gameData.RoundState !== 'Betting') {
            this.showError(GameErrorPrompt.RoundRunningWait);
            return [];
        }
        if (this.isBetCountReached()) {
            this.showError(GameErrorPrompt.MaxBetCountReached);
            return [];
        }

        const indexes = this.computeBetIndexes(normalizedBetUnits, normalizedCount);
        if (indexes.length <= 0) {
            if (this.isBetCountReached()) {
                this.showError(GameErrorPrompt.MaxBetCountReached);
            }
            return [];
        }

        const requiredBetUnits = normalizedBetUnits * indexes.length;
        if (!this.hasEnoughBalance(requiredBetUnits)) {
            this.showError(GameErrorPrompt.InsufficientBalance);
            return [];
        }

        EventManager.getInstance().gameState.emit(GmaeModel.RequestBet, {
            instanceId: gameData.RoomId,
            betUnits: normalizedBetUnits,
            betIndexes: indexes,
            autoCashoutMultiplier: this.normalizeAutoCashoutMultiplier(autoCashoutMultiplier),
        });
        this.pendingBetUnits += requiredBetUnits;
        gameData.BetIndex = indexes[indexes.length - 1] + 1;
        return indexes;
    }

    public sendCashout(betIndex: number) {
        this.sendCashoutAll([betIndex]);
    }

    public sendCashoutAll(betIndexes: number[]) {
        const gameData = GameData.getInstance();
        if (!gameData.RoomId || !Array.isArray(betIndexes)) return;
        const dedupedIndexes = [...new Set(betIndexes
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0))];
        if (dedupedIndexes.length <= 0) return;
        EventManager.getInstance().gameState.emit(GmaeModel.RequestCashout, {
            instanceId: gameData.RoomId,
            betIndexes: dedupedIndexes,
        });
    }

    public sendRoundHistory() {
        const roomId = GameData.getInstance().RoomId;
        if (!roomId) return;
        EventManager.getInstance().gameState.emit(GmaeModel.RequestRoundHistory, { instanceId: roomId });
    }

    public sendReconnect() {
        const roomId = GameData.getInstance().RoomId;
        if (!roomId) return;
        EventManager.getInstance().gameState.emit(GmaeModel.RequestReconnect, { instanceId: roomId });
    }

    public sendGameBalance() {
        const roomId = GameData.getInstance().RoomId;
        if (!roomId) return;
        EventManager.getInstance().gameState.emit(GmaeModel.RequestGameBalance, { instanceId: roomId });
    }

    /** 拉房間列表。 */
    public requestRoomList() {
        EventManager.getInstance().gameState.emit(GmaeModel.RequestRoomList);
    }

    /** 加入房間。 */
    public joinRoom(roomId: string) {
        if (!roomId) return;
        EventManager.getInstance().gameState.emit(GmaeModel.RequestJoinRoom, { roomId });
    }

    /** 進房後請 server 重送 game.init。 */
    public sendGameInit(roomId: string) {
        if (!roomId) return;
        EventManager.getInstance().gameState.emit(GmaeModel.RequestGameInit, { roomId });
    }

    /** 進入 GameScene 時的 bootstrap：依 GameData 狀態補抓缺失的資料。 */
    public bootstrapGame() {
        const gameData = GameData.getInstance();
        if (!gameData.RoomId) return;
        if (!gameData.RoomJoinHasGameState) {
            this.sendGameInit(gameData.RoomId);
        } else if (!gameData.RoomJoinHasBalance) {
            this.sendGameBalance();
        }
        // crash.reconnect 介面保留但前端暫不呼叫（如需，呼叫 this.sendReconnect()）。
    }

    public canLeaveRoom(): boolean {
        if (!this.hasActiveBet()) {
            return true;
        }

        const roundState = GameData.getInstance().RoundState;
        this.showError(roundState === 'Running' || roundState === 'Crashed'
            ? GameErrorPrompt.LeaveWhileSettling
            : GameErrorPrompt.LeaveWithActiveBet);
        return false;
    }

    public leaveRoom() {
        const roomId = GameData.getInstance().RoomId;
        this.updateRoomId('');
        if (roomId) {
            EventManager.getInstance().gameState.emit(GmaeModel.RequestLeaveRoom, { roomId });
        }
    }

    /** view 端選注額：驗證後寫入 GameData。 */
    public selectBetUnits(value: number) {
        const gameData = GameData.getInstance();
        if (!Number.isFinite(value) || value <= 0) {
            gameData.SelectedBetUnits = gameData.BetOptions.length > 0 ? gameData.BetOptions[0] : 0;
            return;
        }
        if (gameData.BetOptions.length > 0 && gameData.BetOptions.indexOf(value) < 0) {
            gameData.SelectedBetUnits = gameData.BetOptions[0];
            return;
        }
        gameData.SelectedBetUnits = value;
    }

    /* ===== Update helpers（寫入 GameData + emit gameState 通知 view）===== */

    private updateRoomId(value: string) {
        const gameData = GameData.getInstance();
        gameData.RoomId = value;
        if (!value) {
            gameData.RoomJoinHasGameState = false;
            gameData.RoomJoinHasBalance = false;
        }
    }

    private updatePlayerId(value: string) {
        GameData.getInstance().PlayerId = value;
        EventManager.getInstance().gameState.emit(GmaeModel.PlayerId, value);
    }

    private updateBalance(value: number) {
        GameData.getInstance().Balance = value;
        EventManager.getInstance().gameState.emit(GmaeModel.Balance, value);
    }

    private updateLeaderboard(value: LeaderboardItem[]) {
        GameData.getInstance().Leaderboard = value;
        EventManager.getInstance().gameState.emit(GmaeModel.Leaderboard, [...value]);
    }

    private updateBetOptions(value: number[]) {
        const gameData = GameData.getInstance();
        gameData.BetOptions = value;
        if (value.length <= 0) {
            gameData.SelectedBetUnits = 0;
        } else if (value.indexOf(gameData.SelectedBetUnits) < 0) {
            gameData.SelectedBetUnits = value[0];
        }
        EventManager.getInstance().gameState.emit(GmaeModel.BetOptions, [...value]);
    }

    private updateMaxBetCount(value: number) {
        GameData.getInstance().MaxBetCount = value;
        EventManager.getInstance().gameState.emit(GmaeModel.MaxBetCount, value);
    }

    private updateRoundHistory(value: number[]) {
        GameData.getInstance().RoundHistory = value;
        EventManager.getInstance().gameState.emit(GmaeModel.RoundHistory, value);
    }

    private updateExistingBets(value: ExistingBet[]) {
        GameData.getInstance().ExistingBets = value;
        EventManager.getInstance().gameState.emit(GmaeModel.ExistingBets, [...value]);
    }

    private updateMultiplierCurve(value: MultiplierCurvePoint[]) {
        GameData.getInstance().MultiplierCurve = value;
        EventManager.getInstance().gameState.emit(GmaeModel.MultiplierCurve, [...value]);
    }

    private updateRunningElapsed(value: number) {
        GameData.getInstance().RunningElapsed = value;
        EventManager.getInstance().gameState.emit(GmaeModel.RunningElapsed, value);
    }

    /* ===== Private helpers ===== */

    private showError(message: GameErrorPrompt | string) {
        EventManager.getInstance().gameState.emit(GmaeModel.ShowError, { message });
    }

    private hasEnoughBalance(requiredBetUnits: number): boolean {
        const required = Number(requiredBetUnits);
        if (!Number.isFinite(required) || required <= 0) return false;
        return this.getAvailableBetBalance() >= required;
    }

    private getAvailableBetBalance(): number {
        const balance = Number(GameData.getInstance().Balance);
        if (!Number.isFinite(balance)) return 0;
        return Math.max(0, balance - this.pendingBetUnits);
    }

    private releasePendingBetUnits(bets: CrashBetItemContract[]) {
        const confirmedBetUnits = bets.reduce((sum, bet) => {
            const betAmount = Number(bet?.betAmount);
            return Number.isFinite(betAmount) && betAmount > 0 ? sum + betAmount : sum;
        }, 0);
        this.pendingBetUnits = Math.max(0, this.pendingBetUnits - confirmedBetUnits);
    }

    private isBetCountReached(): boolean {
        const gameData = GameData.getInstance();
        return gameData.MaxBetCount > 0 && Math.max(gameData.BetIndex, this.getNextBetIndex()) >= gameData.MaxBetCount;
    }

    private hasActiveBet(): boolean {
        return (GameData.getInstance().ExistingBets ?? []).some((bet) => this.isActiveBet(bet));
    }

    private isActiveBet(bet: ExistingBet): boolean {
        const status = bet?.status ?? ExistingBetStatus.Pending;
        return status !== ExistingBetStatus.CashedOut
            && status !== ExistingBetStatus.CashoutPending
            && status !== ExistingBetStatus.Lost
            && typeof bet?.cashoutMultiplier !== 'number';
    }

    private computeBetIndexes(betUnits: number, count: number): number[] {
        const gameData = GameData.getInstance();
        if (!gameData.RoomId) return [];
        const normalizedBetUnits = Number(betUnits);
        const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
        if (!Number.isFinite(normalizedBetUnits) || normalizedBetUnits <= 0 || normalizedCount <= 0) return [];

        const startIndex = Math.max(gameData.BetIndex, this.getNextBetIndex());
        const availableCount = gameData.MaxBetCount > 0
            ? Math.max(0, gameData.MaxBetCount - startIndex)
            : normalizedCount;
        const betCount = Math.min(normalizedCount, availableCount);
        if (betCount <= 0) return [];

        return Array.from({ length: betCount }, (_, offset) => startIndex + offset);
    }

    private resolveSelectedBetUnits(): number {
        const gameData = GameData.getInstance();
        if (gameData.SelectedBetUnits > 0) return gameData.SelectedBetUnits;
        const options = gameData.BetOptions;
        if (options.length > 0) return options[0];
        return 0;
    }

    private normalizeAutoCashoutMultiplier(value: number | null | undefined): number | null {
        const multiplier = Number(value);
        if (!Number.isFinite(multiplier) || multiplier <= 1) return null;
        return Math.round(multiplier * 100) / 100;
    }

    private normalizeBetOptions(betOptions: any): number[] {
        return Array.isArray(betOptions)
            ? betOptions
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0)
            : [];
    }

    private getNextBetIndex(): number {
        const bets = GameData.getInstance().ExistingBets;
        if (bets.length <= 0) return 0;
        return Math.max(...bets.map((b) => b.betIndex)) + 1;
    }

    private upsertExistingBet(next: ExistingBet) {
        if (typeof next?.betIndex !== 'number') return;
        const gameData = GameData.getInstance();
        const list = gameData.ExistingBets;
        const idx = list.findIndex((b) => b.betIndex === next.betIndex);
        if (idx < 0) {
            const updated = [...list, next].sort((a, b) => a.betIndex - b.betIndex);
            this.updateExistingBets(updated);
            gameData.BetIndex = this.getNextBetIndex();
            return;
        }
        const current = list[idx];
        const merged: ExistingBet = {
            ...current,
            ...next,
            betAmount: (typeof next.betAmount === 'number' && next.betAmount > 0) ? next.betAmount : current.betAmount,
        };
        const updated = [...list];
        updated[idx] = merged;
        this.updateExistingBets(updated);
        gameData.BetIndex = this.getNextBetIndex();
    }

    private extractRawBets(payload: any): any[] {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.existingBets)) return payload.existingBets;
        if (Array.isArray(payload?.bets)) return payload.bets;
        if (Array.isArray(payload?.items)) return payload.items;
        return [];
    }

    private hasBets(payload: any): boolean {
        return Array.isArray(payload)
            || Array.isArray(payload?.existingBets)
            || Array.isArray(payload?.bets)
            || Array.isArray(payload?.items);
    }

    private extractCrashBetPayloads(payload: any): CrashBetItemContract[] {
        const rawBets = Array.isArray(payload?.bets)
            ? payload.bets
            : (Array.isArray(payload) ? payload : [payload]);
        return rawBets
            .map((raw: any) => this.normalizeCrashBetPayload(raw))
            .filter((item: any): item is CrashBetItemContract => item !== null);
    }

    private extractCashoutPayloads(payload: any): CrashCashoutItemContract[] {
        const rawCashouts = Array.isArray(payload?.cashouts)
            ? payload.cashouts
            : (Array.isArray(payload) ? payload : [payload]);
        return rawCashouts
            .map((raw: any) => this.normalizeCashoutPayload(raw))
            .filter((item: any): item is CrashCashoutItemContract => item !== null);
    }

    private normalizeCrashBetPayload(raw: any): CrashBetItemContract | null {
        const betIndex = Number(raw?.betIndex ?? raw?.betSeq);
        const betAmount = Number(raw?.betAmount ?? raw?.betUnits);
        if (!Number.isInteger(betIndex) || !Number.isFinite(betAmount)) return null;
        return {
            betIndex,
            betAmount: betAmount as unknown as CrashBetItemContract['betAmount'],
            autoCashoutMultiplier: this.parseNullableNum(raw?.autoCashoutMultiplier),
        };
    }

    private normalizeCashoutPayload(raw: any): CrashCashoutItemContract | null {
        const betIndex = Number(raw?.betIndex);
        const cashoutMultiplier = Number(raw?.cashoutMultiplier);
        const payoutGross = Number(raw?.payoutGross);
        const serviceFee = Number(raw?.serviceFee);
        const payoutNet = Number(raw?.payoutNet);
        if (
            !Number.isInteger(betIndex)
            || !Number.isFinite(cashoutMultiplier)
            || !Number.isFinite(payoutGross)
            || !Number.isFinite(serviceFee)
            || !Number.isFinite(payoutNet)
        ) return null;
        const payout = this.parseNullableNum(raw?.payout) ?? 0;
        type Money = CrashCashoutItemContract['payoutGross'];
        return {
            betIndex,
            cashoutMultiplier,
            payoutGross: payoutGross as unknown as Money,
            serviceFee: serviceFee as unknown as Money,
            payoutNet: payoutNet as unknown as Money,
            payout: payout as unknown as Money,
        };
    }

    private applyRoundStateByEnum(payload: any) {
        const state = Number(payload?.state);
        if (!Number.isInteger(state)) return;
        switch (state) {
            case 0: {
                const bettingCountdown = Number(payload?.bettingCountdown);
                this.handleBetting(Number.isFinite(bettingCountdown) ? bettingCountdown : 0);
                break;
            }
            case 1: {
                const multiplier = Number(payload?.currentMultiplier);
                const runningElapsed = Number(payload?.runningElapsed);
                this.handleRunning(
                    Number.isFinite(multiplier) ? multiplier : 1,
                    Number.isFinite(runningElapsed) ? runningElapsed : undefined,
                );
                break;
            }
            case 2: {
                const crashPoint = Number(payload?.crashPoint ?? payload?.currentMultiplier);
                const crashedCountdown = Number(payload?.crashedCountdown);
                const runningElapsed = Number(payload?.runningElapsed);
                if (!Number.isFinite(crashPoint) || crashPoint <= 0) break;
                this.handleCrashed(
                    crashPoint,
                    Number.isFinite(crashedCountdown) ? crashedCountdown : 0,
                    Number.isFinite(runningElapsed) ? runningElapsed : undefined,
                );
                break;
            }
            case 3:
                this.handleSettled();
                break;
        }
    }

    private syncBalanceUnits(balanceUnits?: number | string) {
        if (balanceUnits === null || balanceUnits === undefined) return;
        const nextBalance = typeof balanceUnits === 'number' ? balanceUnits : Number(balanceUnits);
        if (!Number.isFinite(nextBalance)) return;
        this.updateBalance(nextBalance);
    }

    private parseNullableNum(value: any): number | null {
        if (value === null || value === undefined) return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    private isSameRoundHistory(left: number[], right: number[]): boolean {
        if (left.length !== right.length) return false;
        for (let i = 0; i < left.length; i++) {
            const leftValue = Number(left[i]);
            const rightValue = Number(right[i]);
            if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return false;
            if (Math.abs(leftValue - rightValue) > 0.01) return false;
        }
        return true;
    }

    private normalizeRoundHistory(payload: any): number[] {
        const asNumbers = (list: any[]): number[] => list
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item) && item > 0);

        if (Array.isArray(payload) && payload.every((item) => Number.isFinite(Number(item)))) return asNumbers(payload);

        const rawHistory = payload?.history;
        if (Array.isArray(rawHistory) && rawHistory.every((item: any) => Number.isFinite(Number(item)))) return asNumbers(rawHistory);

        const rawItems = Array.isArray(payload?.items)
            ? payload.items
            : (Array.isArray(rawHistory)
                ? rawHistory
                : (Array.isArray(payload) ? payload : []));
        return rawItems
            .map((item: any) => Number(item?.crashPoint))
            .filter((item: number) => Number.isFinite(item) && item > 0);
    }

    private applyRoundHistorySummary(payload: any, history: number[]) {
        const gameData = GameData.getInstance();
        const parsedDistribution = this.normalizeRoundHistoryDistribution(payload?.distribution);
        gameData.RoundHistoryDistribution = parsedDistribution.length > 0
            ? parsedDistribution
            : this.buildDefaultRoundHistoryDistribution(history);

        const historyMax = this.parseNullableNum(payload?.historyMaxCrashPoint);
        gameData.HistoryMaxCrashPoint = historyMax ?? this.getMaxValue(history);

        const todayMax = this.parseNullableNum(payload?.todayMaxCrashPoint);
        gameData.TodayMaxCrashPoint = todayMax ?? this.getMaxValue(history);
    }

    private normalizeRoundHistoryDistribution(rawDistribution: any): CrashHistoryDistributionItemContract[] {
        if (!Array.isArray(rawDistribution)) return [];
        return rawDistribution
            .map((item) => ({
                range: typeof item?.range === 'string' ? item.range : '',
                count: Number(item?.count),
            }))
            .filter((item) => item.range.length > 0 && Number.isFinite(item.count))
            .map((item) => ({
                range: item.range,
                count: Math.max(0, Math.floor(item.count)),
            }));
    }

    private buildDefaultRoundHistoryDistribution(history: number[]): CrashHistoryDistributionItemContract[] {
        const result: CrashHistoryDistributionItemContract[] = [
            { range: '0~1', count: 0 },
            { range: '1.01~2', count: 0 },
            { range: '2.01~5', count: 0 },
            { range: '5.01~20', count: 0 },
            { range: '20.01~', count: 0 },
        ];
        history.forEach((value) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return;
            if (n <= 1) { result[0].count++; return; }
            if (n <= 2) { result[1].count++; return; }
            if (n <= 5) { result[2].count++; return; }
            if (n <= 20) { result[3].count++; return; }
            result[4].count++;
        });
        return result;
    }

    private getMaxValue(values: number[]): number | null {
        if (!Array.isArray(values) || values.length <= 0) return null;
        const max = Math.max(...values);
        return Number.isFinite(max) ? max : null;
    }

    private normalizeExistingBet(raw: any): ExistingBet | null {
        const betIndex = Number(raw?.betIndex);
        const betAmount = Number(raw?.betAmount);
        if (!Number.isInteger(betIndex) || !Number.isFinite(betAmount)) return null;
        const parseNum = (v: any): number | null => {
            if (v === null || v === undefined) return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        return {
            betId: typeof raw?.betId === 'string' ? raw.betId : undefined,
            betIndex,
            betAmount,
            status: raw?.status as ExistingBetStatus,
            autoCashoutMultiplier: parseNum(raw?.autoCashoutMultiplier),
            cashoutMultiplier: parseNum(raw?.cashoutMultiplier),
            payout: parseNum(raw?.payout),
            payoutGross: parseNum(raw?.payoutGross),
            serviceFee: parseNum(raw?.serviceFee),
            payoutNet: parseNum(raw?.payoutNet),
            currentProfit: parseNum(raw?.currentProfit),
            cashoutAtUtc: raw?.cashoutAtUtc ?? null,
        };
    }

    private normalizeLeaderboardItem(raw: any): LeaderboardItem | null {
        const playerId = typeof raw?.playerId === 'string' ? raw.playerId : '';
        const rank = Number(raw?.rank);
        if (!playerId || !Number.isFinite(rank)) return null;
        const parseNum = (v: any, fallback: number = 0): number => {
            const n = Number(v);
            return Number.isFinite(n) ? n : fallback;
        };
        const parseNullableNum = (v: any): number | null => {
            if (v === null || v === undefined) return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        const betStatuses = Array.isArray(raw?.betStatuses)
            ? raw.betStatuses
                .map((status: any) => Number(status))
                .filter((status: number) => Number.isInteger(status))
            : [];
        return {
            playerId,
            totalBet: parseNum(raw?.totalBet, 0),
            profit: parseNum(raw?.profit, 0),
            cashoutMultiplier: parseNullableNum(raw?.cashoutMultiplier),
            rank: Math.floor(rank),
            betStatuses,
        };
    }

    private normalizeMultiplierCurve(curve: MultiplierCurvePoint[] | null | undefined): MultiplierCurvePoint[] {
        if (!Array.isArray(curve)) return [];
        return curve
            .filter((item) => Number.isFinite(item?.t) && Number.isFinite(item?.m))
            .map((item) => ({ t: Number(item.t), m: Number(item.m) }))
            .filter((item) => item.t >= 0 && item.m > 0)
            .sort((a, b) => a.t - b.t);
    }
}
