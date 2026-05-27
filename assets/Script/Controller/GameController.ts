import { BUILD } from 'cc/env';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { GameData } from '../Model/GameData';
import {
    decodeBalance,
    decodeBetLevels,
    decodeExistingBets,
    decodeMultiplier,
    decodeMultiplierCurve,
    encodeAutoCashoutMultiplier,
    encodeMoney,
} from '../Model/WebsocketSerializer';
import {
    encodeCrashBet,
    encodeCrashCashout,
    encodeGameInit,
    encodeRoomJoin,
    encodeRoomLeave,
    encodeRoomList,
    encodeWalletBalance,
} from '../Model/WebsocketModel';
import {
    WebSocketManager,
    type BalanceResponse,
    type CrashBetItemContract,
    type CrashBetPayload,
    type CrashBetRequestItem,
    type CrashCashoutPayload,
    type CrashHistoryDistributionItemContract,
    type CrashHistoryPayload,
    type CrashInitPayload,
    type CrashLeaderboardItemContract,
    type CrashRoundEndPayload,
    type CrashRoundEndedPush,
    type CrashRoundHistoryContract,
    type CrashRoundStartedPush,
    type CrashRoundStatePush,
    type GameInitResponse,
    type JoinRoomResponse,
    type LeaveRoomResponse,
    type RoomListResponse,
} from '../Model/WebsocketManager';
import {
    ExistingBet,
    ExistingBetStatus,
    GameErrorPrompt,
    GmaeModel,
    RoundState,
} from '../Model/GameData';

type RoundHistoryUpdateSource = 'sync' | 'push';

/**
 * 全域業務邏輯層（Singleton，永久存活）：
 *   - 連線完成後透過 WebSocketManager.on 訂閱 server pushes，將 payload 翻譯成 GameData 狀態變更
 *   - 對外提供玩家動作（sendBet / sendCashout / selectBetUnits / ...），request 會回 Promise 並在 resolve 後同步更新 gameState
 *   - 透過 update* helper 寫入 GameData 後 emit gameState 通知 view
 *   - 自身不持有遊戲資料；GameData 是純 get/set，無 emit 無 cascade
 */
export class GameController extends BaseModel.Singleton {
    /** server runningElapsed 從毫秒轉成秒的縮放係數。 */
    private static readonly RUNNING_ELAPSED_SCALE = 0.001;

    private pendingBetUnits: number = 0;
    private serverPushBound = false;

    /**
     * 建立 WebSocketManager 連線後直接訂閱 server pushes。
     *   - wsUrl / token：BUILD 模式從 window.GAME_CONFIG，dev 從 GameData
     *   - 失敗時直接 throw，讓 caller（LoadSceneManager 等）自己決定 UX（重試 / 顯示錯誤）
     */
    public async connect(): Promise<void> {
        if (WebSocketManager.getInstance().IsConnected) return;
        const config = this.resolveWsConfig();
        if (!config) throw new Error('[GameController] WS config not available');
        await WebSocketManager.getInstance().connect(config.wsUrl, config.token);
        this.bindServerPushes();
    }

    public get PlayerToken(): string {
        return this.resolveWsConfig()?.token ?? '';
    }

    /** 訂閱所有 server push opcodes；request 的回應由各 send* 方法直接 await 處理，不走這條路徑。 */
    private bindServerPushes() {
        if (this.serverPushBound) return;
        const socket = WebSocketManager.getInstance();
        socket.onCrashState(this.applyRoundStateByEnum, this);
        socket.onCrashRoundEnd(this.onCrashRoundEndPush, this);
        socket.onRoomRoundState(this.onRoomRoundStatePush, this);
        socket.onRoomRoundStarted(this.onRoomRoundStartedPush, this);
        socket.onRoomRoundEnded(this.onRoomRoundEndedPush, this);
        this.serverPushBound = true;
    }

    private resolveWsConfig(): { wsUrl: string; token: string } | null {
        if (BUILD && typeof window !== 'undefined') {
            const config = (window as any).GAME_CONFIG ?? {};
            const wsUrl = typeof config.wsUrl === 'string' ? config.wsUrl.trim() : '';
            const token = typeof config.token === 'string' ? config.token.trim() : '';
            if (!wsUrl || !token) {
                console.error('[GameController] BUILD mode requires window.GAME_CONFIG.wsUrl and window.GAME_CONFIG.token');
                return null;
            }
            return { wsUrl, token };
        }
        const gameData = GameData.getInstance();
        return { wsUrl: gameData.FallbackWsUrl, token: gameData.DevToken };
    }

    /* ===== Server* push handlers ===== */


    private onRoomRoundStatePush(data: CrashRoundStatePush) {
        const state = String(data.state ?? '').toLowerCase();
        switch (state) {
            case 'betting':
                this.handleBetting(data.bettingCountdown ?? 0);
                break;
            case 'running':
                this.handleRunning(data.currentMultiplier ?? 1, data.runningElapsed ?? undefined);
                break;
            case 'crashed':
                this.handleCrashed(
                    data.crashPoint ?? 0,
                    data.crashedCountdown ?? 0,
                    data.runningElapsed ?? undefined,
                );
                break;
        }
        if (GameData.getInstance().RoundState !== RoundState.Settled) {
            this.handleLeaderboard(data.leaderboard);
        }
    }

    private onRoomRoundStartedPush(data: CrashRoundStartedPush) {
        this.onRoomRoundStatePush({ ...data, leaderboard: null });
    }

    private onRoomRoundEndedPush(data: CrashRoundEndedPush) {
        const state = String(data.state ?? '').toLowerCase();
        if (state === 'crashed') {
            this.handleCrashed(data.crashPoint ?? 0, 0);
            return;
        }

        this.handleSettled();
    }

    private onCrashRoundEndPush(payload: CrashRoundEndPayload) {
        this.applyCurrencyScale(payload.currencyScale);
        this.handleCrashed(payload.crashPoint, 0);
        this.handleRoundHistory(payload, 'push');
        this.handleCashout({
            cashouts: payload.cashouts ?? [],
            totalPayout: payload.totalPayout,
            balance: payload.balance,
            currencyScale: payload.currencyScale,
        });
        this.handleLostBets(payload.losts);
    }

    /* ===== State change handlers ===== */

    private handleBetting(bettingCountdown: number) {
        const gameData = GameData.getInstance();
        const state = gameData.RoundState;
        if (state === RoundState.Running || state === RoundState.Crashed || state === RoundState.Settled) {
            this.updateExistingBets([]);
        }
        this.pendingBetUnits = 0;
        this.updateRoundState(RoundState.Betting);
        this.updateRunningElapsed(0);
        this.updateMultiplier(1);
        GameData.getInstance().emitGameState(GmaeModel.BettingCountdown, bettingCountdown);
        gameData.IsCrashed = false;
        gameData.BetIndex = this.getNextBetIndex();
    }

    private handleRunning(currentMultiplier: number | string, runningElapsed?: number) {
        const gameData = GameData.getInstance();
        if (gameData.RoundState === RoundState.Settled) return;
        this.updateRoundState(RoundState.Running);
        const elapsed = Number(runningElapsed);
        if (Number.isFinite(elapsed)) {
            this.updateRunningElapsed(Math.max(0, elapsed));
        }
        this.updateMultiplier(Number(currentMultiplier));
    }

    private handleCrashed(crashPoint: number | string, crashedCountdown: number, runningElapsed?: number) {
        const gameData = GameData.getInstance();
        const normalizedCrashPoint = Number(crashPoint);
        if (!Number.isFinite(normalizedCrashPoint) || normalizedCrashPoint <= 0) return;
        if (gameData.RoundState === RoundState.Settled) return;
        this.updateRoundState(RoundState.Crashed);
        const elapsed = Number(runningElapsed);
        if (Number.isFinite(elapsed)) {
            this.updateRunningElapsed(Math.max(0, elapsed));
        }
        // 接口層精度校正：crashPoint 走 updateMultiplier 進 model，外部派發也統一用 rounded 值。
        const roundedCrashPoint = BaseModel.getPrecise(normalizedCrashPoint, 2);
        this.updateMultiplier(roundedCrashPoint);
        GameData.getInstance().emitGameState(GmaeModel.CrashedCountdown, crashedCountdown);
        if (!gameData.IsCrashed) {
            gameData.IsCrashed = true;
            GameData.getInstance().emitGameState(GmaeModel.Explode, roundedCrashPoint);
        }
    }

    private handleSettled() {
        this.pendingBetUnits = 0;
        this.updateRoundState(RoundState.Settled);
        this.updateMultiplier(1);
        this.updateLeaderboard([]);
        GameData.getInstance().emitGameState(GmaeModel.Settled);
    }

    private handleCrashBet(payload: CrashBetPayload) {
        if (payload.bets.length <= 0) return;
        const gameData = GameData.getInstance();
        this.releasePendingBetUnits(payload.bets);
        payload.bets.forEach((bet) => {
            gameData.BetIndex = Math.max(gameData.BetIndex, bet.betIndex + 1);
            this.upsertExistingBet({
                betIndex: bet.betIndex,
                betAmount: Number(bet.betAmount),
                status: ExistingBetStatus.Pending,
            });
        });
        this.syncBalance(payload.balance);
    }

    private handleCashout(payload: CrashCashoutPayload) {
        this.applyCurrencyScale(payload.currencyScale);
        this.emitCashoutTotalPayout(payload.totalPayout);
        if (payload.cashouts.length <= 0) {
            this.syncBalance(payload.balance);
            return;
        }
        const gameData = GameData.getInstance();
        payload.cashouts.forEach((cashout) => {
            this.upsertExistingBet({
                betIndex: cashout.betIndex,
                betAmount: gameData.ExistingBets.find((b) => b.betIndex === cashout.betIndex)?.betAmount ?? 0,
                status: ExistingBetStatus.CashedOut,
                cashoutMultiplier: cashout.cashoutMultiplier,
                payoutGross: Number(cashout.payoutGross),
                payoutNet: Number(cashout.payoutNet),
            });
        });
        this.syncBalance(payload.balance);
    }

    private handleLostBets(losts: number[] | null | undefined) {
        if (!Array.isArray(losts) || losts.length <= 0) return;
        const gameData = GameData.getInstance();
        const lostIndexes = [...new Set(losts
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0))];

        lostIndexes.forEach((betIndex) => {
            const bet = gameData.ExistingBets.find((item) => item.betIndex === betIndex);
            if (!bet || bet.status === ExistingBetStatus.CashedOut || bet.cashoutMultiplier !== null) return;
            this.upsertExistingBet({
                betIndex,
                betAmount: bet.betAmount,
                status: ExistingBetStatus.Lost,
                cashoutMultiplier: null,
                payoutGross: null,
                payoutNet: null,
                currentProfit: null,
            });
        });
    }

    private handleRoundHistory(
        payload: CrashHistoryPayload | CrashRoundHistoryContract | CrashRoundEndPayload | number[] | null | undefined,
        source: RoundHistoryUpdateSource = 'sync',
    ) {
        const gameData = GameData.getInstance();
        const normalizedHistory = this.normalizeRoundHistory(payload);
        this.applyRoundHistorySummary(payload, normalizedHistory);
        const isDuplicatePush = source === 'push' && this.isSameRoundHistory(gameData.RoundHistory, normalizedHistory);
        gameData.LastRoundHistoryUpdateSource = isDuplicatePush ? 'sync' : source;
        this.updateRoundHistory(normalizedHistory);
    }

    private handleLeaderboard(rawLeaderboard: CrashLeaderboardItemContract[] | null | undefined) {
        if (!Array.isArray(rawLeaderboard)) return;
        const sorted = [...rawLeaderboard].sort((a, b) => a.rank - b.rank);
        this.updateLeaderboard(sorted);
    }

    private applyExistingBets(rawExistingBets: unknown) {
        this.updateExistingBets(decodeExistingBets(rawExistingBets));
        GameData.getInstance().BetIndex = this.getNextBetIndex();
    }

    private applyMultiplierCurve(rawMultiplierCurve: unknown) {
        GameData.getInstance().MultiplierCurve = decodeMultiplierCurve(rawMultiplierCurve);
    }

    private applyBalanceUnits(balance: string | number): void {
        const scale = GameData.getInstance().CurrencyScale;
        this.updateWallet(decodeBalance(balance, scale));
    }

    /** 從 server 收到的 currencyScale 寫回 GameData（send 系列 wire 轉換時直接讀 GameData）。 */
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
        const validated = this.validateBetRequest(betUnits, count);
        if (!validated) return [];

        const indexes = this.computeBetIndexes(validated.betUnits, validated.count);
        if (indexes.length <= 0) return [];

        const requiredBetUnits = validated.betUnits * indexes.length;
        if (!this.hasEnoughBalance(requiredBetUnits)) {
            this.showError(GameErrorPrompt.InsufficientBalance);
            return [];
        }

        this.dispatchBetRequest(indexes, validated.betUnits, autoCashoutMultiplier);
        this.reservePendingBet(requiredBetUnits, indexes);
        return indexes;
    }

    /** 前置驗證：房間、參數、回合狀態、投注上限。錯誤一律走 showError，回 null 表示中止。 */
    private validateBetRequest(betUnits: number, count: number): { betUnits: number; count: number } | null {
        const gameData = GameData.getInstance();
        if (!gameData.RoomId) return null;

        const normalizedBetUnits = Number(betUnits);
        const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
        if (!Number.isFinite(normalizedBetUnits) || normalizedBetUnits <= 0 || normalizedCount <= 0) return null;

        if (gameData.RoundState !== RoundState.Betting) {
            this.showError(GameErrorPrompt.RoundRunningWait);
            return null;
        }
        if (this.isBetCountReached()) {
            this.showError(GameErrorPrompt.MaxBetCountReached);
            return null;
        }
        return { betUnits: normalizedBetUnits, count: normalizedCount };
    }

    /** 組 wire 物件後 fire-and-forget；回應/錯誤分別走 handleCrashBet / console.error。 */
    private dispatchBetRequest(indexes: number[], betUnits: number, autoCashoutMultiplier: number | null) {
        const gameData = GameData.getInstance();
        const scale = gameData.CurrencyScale;
        const bets = indexes.map((betIndex) => ({
            betAmount: encodeMoney(betUnits, scale),
            autoCashoutMultiplier: encodeAutoCashoutMultiplier(autoCashoutMultiplier),
            betIndex,
        })) as unknown as CrashBetRequestItem[];
        WebSocketManager.getInstance()
            .sendCrashBet(gameData.RoomId, encodeCrashBet(bets, this.generateRequestId('bet')))
            .then((payload) => this.handleCrashBet(payload))
            .catch((err) => console.error('[GameController.sendBets] sendCrashBet failed', err));
    }

    /** Optimistic 鎖定：先扣 pending 額度與推進 BetIndex，等 server 回應再 release / 校正。 */
    private reservePendingBet(requiredBetUnits: number, indexes: number[]) {
        this.pendingBetUnits += requiredBetUnits;
        GameData.getInstance().BetIndex = indexes[indexes.length - 1] + 1;
    }

    /** 為 client→server 請求產生冪等鍵（server 用來去重）。 */
    private generateRequestId(prefix: string): string {
        const rand = globalThis.crypto?.randomUUID?.();
        if (rand) return `${prefix}-${rand}`;
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
        WebSocketManager.getInstance().sendCrashCashout(gameData.RoomId, encodeCrashCashout(dedupedIndexes))
            .then((payload) => this.handleCashout(payload))
            .catch((err) => console.error('[GameController] sendCashout failed', err));
    }

    public async roomList(status: string = 'open', limit: number = 50): Promise<RoomListResponse> {
        const data = await WebSocketManager.getInstance().getRoomList(encodeRoomList(status, limit));
        this.applyRoomList(data);
        return data;
    }

    /** 解構 RoomListResponse 並寫入 GameData。 */
    private applyRoomList(data: RoomListResponse) {
        GameData.getInstance().Rooms = data.rooms;
    }

    public async walletBalance(): Promise<BalanceResponse> {
        const data = await WebSocketManager.getInstance().getWalletBalance(encodeWalletBalance());
        this.applyCurrencyScale(data.currencyScale);
        this.applyBalanceUnits(data.balance);
        return data;
    }

    public async gameInit(roomId: string): Promise<GameInitResponse> {
        const data = await WebSocketManager.getInstance().getGameInit(encodeGameInit(roomId));
        this.applyGameInit(data);
        return data;
    }

    /** 解構 GameInitResponse 並寫入 GameData。 */
    private applyGameInit(data: GameInitResponse) {
        this.applyGameState(data.gameInit as CrashInitPayload);
    }

    /** 加入房間：餘額不足顯示提示並 throw，caller 不會繼續跳場景。 */
    public async joinRoom(roomId: string): Promise<JoinRoomResponse> {
        const data = await WebSocketManager.getInstance().getRoomJoin(encodeRoomJoin(roomId));
        this.applyJoinRoom(data);
        return data;
    }

    /** 解構 JoinRoomResponse 並寫入 GameData；餘額不足會顯示提示並 throw。 */
    private applyJoinRoom(data: JoinRoomResponse) {
        const gameData = GameData.getInstance();
        this.updateRoomId(data.roomId);
        this.updatePlayerId(data.playerId);
        const init = data.gameState as CrashInitPayload;
        this.applyGameState(init);
        if (!init.wallet) {
            throw new Error('[GameController.applyJoinRoom] missing wallet info');
        }
        this.applyBalanceUnits(init.wallet.balance);
        if (gameData.Wallet < 1) {
            this.showError(GameErrorPrompt.InsufficientBalanceWithPeriod);
            throw new Error('[GameController.joinRoom] insufficient balance');
        }
        this.handleRoundHistory(init.roundHistory, 'sync');
    }

    /** 解構 CrashInitPayload（join / gameInit response 內的 gameState 巢狀物件）並寫進 GameData。 */
    private applyGameState(init: CrashInitPayload) {
        this.applyCurrencyScale(init.currencyScale);
        const betLevels = decodeBetLevels(init.betLevels);
        this.updateBetLevels(betLevels);
        this.updateMaxBetCount(init.maxBetsPerPlayer ?? betLevels.length);
        this.applyExistingBets(init.existingBets);
        this.applyMultiplierCurve(init.multiplierCurve);
    }


    public canLeaveRoom(): boolean {
        if (!this.hasActiveBet()) {
            return true;
        }

        const state = GameData.getInstance().RoundState;
        this.showError(state === RoundState.Running || state === RoundState.Crashed
            ? GameErrorPrompt.LeaveWhileSettling
            : GameErrorPrompt.LeaveWithActiveBet);
        return false;
    }

    public async leaveRoom(): Promise<LeaveRoomResponse | void> {
        const roomId = GameData.getInstance().RoomId;
        if (!roomId) return;
        const data = await WebSocketManager.getInstance().getRoomLeave(encodeRoomLeave(roomId));
        this.applyLeaveRoom(data);
        return data;
    }

    /** 解構 LeaveRoomResponse 並寫入 GameData，順手清掉房間相關狀態。 */
    private applyLeaveRoom(data: LeaveRoomResponse) {
        GameData.getInstance().Rooms = data.rooms;
        this.clearRoomState();
    }

    /** 離房時清掉所有「房間特定」狀態，跨房保留的（Wallet / PlayerId / Rooms / SelectedBetUnits / CurrencyScale）不動。 */
    private clearRoomState() {
        const gameData = GameData.getInstance();
        gameData.RoomId = '';
        gameData.ExistingBets = [];
        gameData.BetLevels = [];
        gameData.MaxBetCount = 0;
        gameData.RoundHistory = [];
        gameData.RoundHistoryDistribution = [];
        gameData.HistoryMaxCrashPoint = null;
        gameData.TodayMaxCrashPoint = null;
        gameData.Multiplier = 1;
        gameData.RunningElapsed = 0;
        this.updateRoundState(RoundState.None);
        gameData.IsCrashed = false;
        gameData.MultiplierCurve = [];
        gameData.BetIndex = 0;
        gameData.Leaderboard = [];
    }

    /** view 端選注額：驗證後寫入 GameData。 */
    public selectBetUnits(value: number) {
        const gameData = GameData.getInstance();
        if (!Number.isFinite(value) || value <= 0) {
            gameData.SelectedBetUnits = gameData.BetLevels.length > 0 ? gameData.BetLevels[0] : 0;
            return;
        }
        if (gameData.BetLevels.length > 0 && gameData.BetLevels.indexOf(value) < 0) {
            gameData.SelectedBetUnits = gameData.BetLevels[0];
            return;
        }
        gameData.SelectedBetUnits = value;
    }

    /* ===== Update helpers（寫入 GameData + emit gameState 通知 view）===== */

    private updateRoomId(value: string) {
        GameData.getInstance().RoomId = value;
    }

    private updatePlayerId(value: string | null | undefined) {
        GameData.getInstance().PlayerId = value ?? '';
    }

    private updateWallet(value: number) {
        GameData.getInstance().Wallet = value;
    }

    private updateLeaderboard(value: CrashLeaderboardItemContract[]) {
        GameData.getInstance().Leaderboard = value;
        GameData.getInstance().emitGameState(GmaeModel.Leaderboard, [...value]);
    }

    private updateRoundState(value: RoundState) {
        GameData.getInstance().RoundState = value;
        GameData.getInstance().emitGameState(GmaeModel.RoundStateChanged, value);
    }

    private updateBetLevels(value: number[]) {
        const gameData = GameData.getInstance();
        gameData.BetLevels = value;
        if (value.length <= 0) {
            gameData.SelectedBetUnits = 0;
        } else if (value.indexOf(gameData.SelectedBetUnits) < 0) {
            gameData.SelectedBetUnits = value[0];
        }
    }

    private updateMaxBetCount(value: number) {
        GameData.getInstance().MaxBetCount = value;
    }

    private updateRoundHistory(value: number[]) {
        GameData.getInstance().RoundHistory = value;
        GameData.getInstance().emitGameState(GmaeModel.RoundHistory, value);
    }

    private updateExistingBets(value: ExistingBet[]) {
        GameData.getInstance().ExistingBets = value;
        GameData.getInstance().emitGameState(GmaeModel.ExistingBets, value);
    }

    /** normalize 後寫 GameData.Multiplier + 廣播；非法值（NaN / <=0）統一變成 1。 */
    private updateMultiplier(value: number) {
        // 接口層精度處理：倍數最多 2 位小數，這裡 round 一次清掉浮點誤差，View 直接用顯示。
        const normalized = Number.isFinite(value) && value > 0 ? BaseModel.getPrecise(value, 2) : 1;
        GameData.getInstance().Multiplier = normalized;
        GameData.getInstance().emitGameState(GmaeModel.Multiplier, normalized);
    }

    private updateRunningElapsed(value: number) {
        // server runningElapsed 是毫秒，這裡轉成秒後存進 GameData 並廣播；下游一律拿秒數。
        const seconds = value * GameController.RUNNING_ELAPSED_SCALE;
        GameData.getInstance().RunningElapsed = seconds;
        GameData.getInstance().emitGameState(GmaeModel.RunningElapsed, seconds);
    }

    /* ===== Private helpers ===== */

    private showError(message: GameErrorPrompt | string) {
        GameData.getInstance().emitGameState(GmaeModel.ShowError, { message });
    }

    private hasEnoughBalance(requiredBetUnits: number): boolean {
        const required = Number(requiredBetUnits);
        if (!Number.isFinite(required) || required <= 0) return false;
        return this.getAvailableBetBalance() >= required;
    }

    private getAvailableBetBalance(): number {
        const balance = Number(GameData.getInstance().Wallet);
        if (!Number.isFinite(balance)) return 0;
        return Math.max(0, balance - this.pendingBetUnits);
    }

    private releasePendingBetUnits(bets: CrashBetItemContract[]) {
        const confirmedBetUnits = bets.reduce((sum, bet) => {
            const amount = Number(bet.betAmount);
            return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
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
        return bet.status !== ExistingBetStatus.CashedOut
            && bet.status !== ExistingBetStatus.CashoutPending
            && bet.status !== ExistingBetStatus.Lost
            && bet.cashoutMultiplier === null;
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
        const options = gameData.BetLevels;
        if (options.length > 0) return options[0];
        return 0;
    }

    private getNextBetIndex(): number {
        const bets = GameData.getInstance().ExistingBets;
        if (bets.length <= 0) return 0;
        return Math.max(...bets.map((b) => b.betIndex)) + 1;
    }

    /** 部分欄位 patch：betIndex 必填當 identity，其他欄位省略表示「不變」；首次寫入時缺的欄位用預設值補齊。 */
    private upsertExistingBet(next: Partial<ExistingBet> & { betIndex: number }) {
        if (typeof next.betIndex !== 'number') return;
        const gameData = GameData.getInstance();
        const list = gameData.ExistingBets;
        const idx = list.findIndex((b) => b.betIndex === next.betIndex);
        if (idx < 0) {
            const created: ExistingBet = {
                betIndex: next.betIndex,
                betAmount: next.betAmount ?? 0,
                status: next.status ?? ExistingBetStatus.Pending,
                cashoutMultiplier: next.cashoutMultiplier ?? null,
                payoutGross: next.payoutGross ?? null,
                payoutNet: next.payoutNet ?? null,
                currentProfit: next.currentProfit ?? null,
            };
            const updated = [...list, created].sort((a, b) => a.betIndex - b.betIndex);
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

    private syncBalance(balance?: number | string) {
        if (balance === null || balance === undefined) return;
        const nextBalance = typeof balance === 'number' ? balance : Number(balance);
        if (!Number.isFinite(nextBalance)) return;
        this.updateWallet(nextBalance);
    }

    private emitCashoutTotalPayout(totalPayout?: number | string | null) {
        if (totalPayout === null || totalPayout === undefined) return;
        const value = Number(totalPayout);
        if (!Number.isFinite(value)) return;
        GameData.getInstance().emitGameState(
            GmaeModel.CashoutTotalPayout,
            BaseModel.getPrecise(value, GameData.getInstance().CurrencyScale),
        );
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
        // 接口層 multiplier 精度校正：crashPoint 是倍數，這裡 round 到 2 位小數清掉浮點誤差。
        const asNumbers = (list: any[]): number[] => list
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item) && item > 0)
            .map((item) => BaseModel.getPrecise(item, 2));

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
            .filter((item: number) => Number.isFinite(item) && item > 0)
            .map((item: number) => BaseModel.getPrecise(item, 2));
    }

    private applyRoundHistorySummary(payload: any, history: number[]) {
        const gameData = GameData.getInstance();
        const parsedDistribution = this.normalizeRoundHistoryDistribution(payload?.distribution);
        gameData.RoundHistoryDistribution = parsedDistribution.length > 0
            ? parsedDistribution
            : this.buildDefaultRoundHistoryDistribution(history);

        const historyMax = decodeMultiplier(payload?.historyMaxCrashPoint);
        gameData.HistoryMaxCrashPoint = historyMax ?? this.getMaxValue(history);

        const todayMax = decodeMultiplier(payload?.todayMaxCrashPoint);
        gameData.TodayMaxCrashPoint = todayMax ?? this.getMaxValue(history);
    }

    private normalizeRoundHistoryDistribution(rawDistribution: any): CrashHistoryDistributionItemContract[] {
        if (Array.isArray(rawDistribution) && rawDistribution.every((item) => Number.isFinite(Number(item)))) {
            return rawDistribution.map((count, index) => ({
                range: this.getDistributionRangeLabel(index),
                count: Math.max(0, Math.floor(Number(count))),
            }));
        }
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

    private getDistributionRangeLabel(index: number): string {
        const labels = ['0~1', '1.01~2', '2.01~5', '5.01~20', '20.01~'];
        return labels[index] ?? `${index + 1}`;
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

}
