import { _decorator, Component, Node, EventTarget, log } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { CashoutPayload, CrashBetPayload, ExistingBet, ExistingBetStatus, GmaeModel, GmaeModelMap, LeaderboardItem, MultiplierCurvePoint } from './GameModel';
import { ClientOp, RoomList } from './WebsocketModel';
import { WebsocketManager } from './WebsocketManager';

export { GmaeModel, type GmaeModelMap } from './GameModel';
export class GameData extends BaseModel.GameEvent<GmaeModel, GmaeModelMap> {
    /** constructor。 */
    private constructor() {
        super();
    }
    private static instance: GameData = null;
    /** lobbyId 欄位。 */
    private lobbyId: string = '';
    /** roomId 欄位。 */
    private roomId: string = '';
    /** playerId 欄位。 */
    private playerId: string = '';
    /** balance 欄位。 */
    private balance: number = 0;
    /** leaderboard 欄位。 */
    private leaderboard: LeaderboardItem[] = [];
    /** betOptions 欄位。 */
    private betOptions: number[] = [];
    /** maxBetCount 欄位。 */
    private maxBetCount: number = 0;
    /** roundHistory 欄位。 */
    private roundHistory: number[] = [];
    /** existingBets 欄位。 */
    private existingBets: ExistingBet[] = [];
    /** betIndex 欄位。 */
    private betIndex: number = 0;
    /** multiplierCurve 欄位。 */
    private multiplierCurve: MultiplierCurvePoint[] = [];
    /** runningElapsed 欄位。 */
    private runningElapsed: number = 0;
    /** roundState 欄位。 */
    private roundState: 'Betting' | 'Running' | 'Crashed' | 'Settled' | '' = '';

    /**
     * 取得 RoundState。
     * @returns RoundState 值
     */
    public get RoundState(): string { return this.roundState; }

    /**
     * 取得 LobbyId。
     * @returns LobbyId 值
     */
    public get LobbyId(): string { return this.lobbyId; }
    /**
     * 設定 LobbyId。
     * @param lobbyId lobbyId
     */
    public set LobbyId(lobbyId: string) { this.lobbyId = lobbyId; }

    /**
     * 取得 RoomId。
     * @returns RoomId 值
     */
    public get RoomId(): string { return this.roomId; }
    /**
     * 設定 RoomId。
     * @param roomId roomId
     */
    public set RoomId(roomId: string) { this.roomId = roomId; }

    /** RoomListCache 欄位。 */
    public RoomListCache: RoomList = null;

    /**
     * 取得 PlayerId。
     * @returns PlayerId 值
     */
    public get PlayerId(): string { return this.playerId; }
    /**
     * 設定 PlayerId。
     * @param playerId playerId
     */
    public set PlayerId(playerId: string) {
        this.eventTarget.emit(GmaeModel.PlayerId, playerId);
        this.playerId = playerId;
    }

    /**
     * 取得 Balance。
     * @returns Balance 值
     */
    public get Balance(): number { return this.balance; }
    /**
     * 設定 Balance。
     * @param balance balance
     */
    public set Balance(balance: number) {
        this.eventTarget.emit(GmaeModel.Balance, balance);
        this.balance = balance;
    }

    /**
     * 取得 Leaderboard。
     * @returns Leaderboard 值
     */
    public get Leaderboard(): LeaderboardItem[] { return this.leaderboard; }
    /**
     * 設定 Leaderboard。
     * @param leaderboard leaderboard
     */
    public set Leaderboard(leaderboard: LeaderboardItem[]) {
        const sorted = [...(leaderboard ?? [])].sort((a, b) => a.rank - b.rank);
        this.leaderboard = sorted;
        this.eventTarget.emit(GmaeModel.Leaderboard, [...sorted]);
    }

    /**
     * 取得 BetOptions。
     * @returns BetOptions 值
     */
    public get BetOptions(): number[] { return this.betOptions; }
    /**
     * 設定 BetOptions。
     * @param betOptions betOptions
     */
    public set BetOptions(betOptions: number[]) {
        this.eventTarget.emit(GmaeModel.BetOptions, betOptions);
        this.betOptions = betOptions;
    }

    /**
     * 取得 MaxBetCount。
     * @returns MaxBetCount 值
     */
    public get MaxBetCount(): number { return this.maxBetCount; }
    /**
     * 設定 MaxBetCount。
     * @param maxBetCount maxBetCount
     */
    public set MaxBetCount(maxBetCount: number) {
        this.eventTarget.emit(GmaeModel.MaxBetCount, maxBetCount);
        this.maxBetCount = maxBetCount;
    }

    /**
     * 取得 RoundHistory。
     * @returns RoundHistory 值
     */
    public get RoundHistory(): number[] { return this.roundHistory; }
    /**
     * 設定 RoundHistory。
     * @param roundHistory roundHistory
     */
    public set RoundHistory(roundHistory: number[]) {
        this.eventTarget.emit(GmaeModel.RoundHistory, roundHistory);
        this.roundHistory = roundHistory;
    }

    /**
     * 取得 ExistingBets。
     * @returns ExistingBets 值
     */
    public get ExistingBets(): ExistingBet[] { return this.existingBets; }
    /**
     * 設定 ExistingBets。
     * @param existingBets existingBets
     */
    public set ExistingBets(existingBets: ExistingBet[]) {
        const sorted = [...(existingBets ?? [])].sort((a, b) => a.betIndex - b.betIndex);
        this.existingBets = sorted;
        this.betIndex = this.getNextBetIndex();
        this.eventTarget.emit(GmaeModel.ExistingBets, [...sorted]);
    }

    /**
     * 取得 MultiplierCurve。
     * @returns MultiplierCurve 值
     */
    public get MultiplierCurve(): MultiplierCurvePoint[] { return this.multiplierCurve; }
    /**
     * 設定 MultiplierCurve。
     * @param curve curve
     */
    public set MultiplierCurve(curve: MultiplierCurvePoint[]) {
        const normalized = this.normalizeMultiplierCurve(curve);
        this.multiplierCurve = normalized;
        this.eventTarget.emit(GmaeModel.MultiplierCurve, [...normalized]);
    }

    /**
     * 取得 RunningElapsed。
     * @returns RunningElapsed 值
     */
    public get RunningElapsed(): number { return this.runningElapsed; }
    /**
     * 設定 RunningElapsed。
     * @param elapsed elapsed
     */
    public set RunningElapsed(elapsed: number) {
        const normalized = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
        this.runningElapsed = normalized;
        this.eventTarget.emit(GmaeModel.RunningElapsed, normalized);
    }

    public static getInstance(): GameData {
        if (!this.instance) this.instance = new GameData();
        return this.instance;
    }

    /** Betting 狀態：server 持續推送倒數秒數 */
    public onBetting(bettingCountdown: number) {
        if (this.roundState === 'Running' || this.roundState === 'Crashed' || this.roundState === 'Settled') {
            this.ExistingBets = [];
        }
        this.roundState = 'Betting';
        this.RunningElapsed = 0;
        this.eventTarget.emit(GmaeModel.BettingCountdown, bettingCountdown);
        this.isCrashed = false;
        this.betIndex = this.getNextBetIndex();
    }

    /** Running 狀態：server 持續推送倍率 */
    public onRunning(currentMultiplier: number, runningElapsed?: number) {
        if (this.roundState === 'Settled') return;
        this.roundState = 'Running';
        if (Number.isFinite(runningElapsed)) {
            this.RunningElapsed = runningElapsed;
        }
        this.eventTarget.emit(GmaeModel.Multiplier, currentMultiplier);
    }

    /** isCrashed 欄位。 */
    private isCrashed: boolean = false;

    /** Crashed 狀態：揭露 crashPoint + 展示倒數 */
    public onCrashed(crashPoint: number, crashedCountdown: number, runningElapsed?: number) {
        if (this.roundState === 'Settled') return;
        this.roundState = 'Crashed';
        if (Number.isFinite(runningElapsed)) {
            this.RunningElapsed = runningElapsed;
        }
        this.eventTarget.emit(GmaeModel.Explode, crashPoint);
        this.eventTarget.emit(GmaeModel.CrashedCountdown, crashedCountdown);
        if (!this.isCrashed) {
            this.isCrashed = true;
            this.roundHistory.push(crashPoint);
            this.eventTarget.emit(GmaeModel.RoundHistory, this.roundHistory);
        }
    }

    /** Settled 狀態：回合結算完成 */
    public onSettled() {
        this.roundState = 'Settled';
        this.Leaderboard = [];
        this.eventTarget.emit(GmaeModel.Settled);
    }

    /** crash.bet 回傳成功 */
    public onCrashBet(payload: CrashBetPayload) {
        if (typeof payload?.betAmount !== 'number' || typeof payload?.betIndex !== 'number') {
            return;
        }
        log("crash.bet", payload);
        this.betIndex = payload.betIndex + 1;
        this.upsertExistingBet({
            betId: payload.betId,
            betIndex: payload.betIndex,
            betAmount: payload.betAmount,
            status: 'Pending',
            autoCashoutMultiplier: payload.autoCashoutMultiplier,
        });
        this.syncBalanceUnits(payload.balanceUnits);
        this.eventTarget.emit(GmaeModel.CrashBet, payload);
    }

    /** crash.cashout 回傳成功 */
    public onCashout(payload: CashoutPayload) {
        log("Cashout", payload);
        this.upsertExistingBet({
            betIndex: payload.betIndex,
            betAmount: this.existingBets.find((b) => b.betIndex === payload.betIndex)?.betAmount ?? 0,
            status: 'CashedOut',
            cashoutMultiplier: payload.cashoutMultiplier,
            payoutGross: payload.payoutGross,
            serviceFee: payload.serviceFee,
            payoutNet: payload.payoutNet,
        });
        this.syncBalanceUnits(payload.balanceUnits);
        this.eventTarget.emit(GmaeModel.Cashout, payload);
    }

    /** crash.roundHistory 回傳（最多 100 筆） */
    public onRoundHistory(payload: {
        history?: { roundId: string; crashPoint: number; crashedAt: string | null }[];
        items?: { roundId: string; crashPoint: number; crashedAt: string | null }[];
    }) {
        const raw = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload?.history) ? payload.history : []);
        const history = raw.map((item) => item.crashPoint);
        this.RoundHistory = history;
    }

    /** room.round.state 內的 leaderboard */
    public onLeaderboard(rawLeaderboard: any[] | null | undefined) {
        if (!Array.isArray(rawLeaderboard)) return;
        const leaderboard = rawLeaderboard
            .map((item) => this.normalizeLeaderboardItem(item))
            .filter((item): item is LeaderboardItem => item !== null);
        this.Leaderboard = leaderboard;
    }

    /** crash.bets 回傳：同步玩家本回合各注狀態 */
    public onCrashBets(payload: any) {
        const rawBets = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.existingBets)
                ? payload.existingBets
                : Array.isArray(payload?.bets)
                    ? payload.bets
                    : Array.isArray(payload?.items)
                        ? payload.items
                        : [];
        this.setExistingBets(rawBets);
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    /** 從 room.join/game.init 的 existingBets 還原當前注單 */
    public setExistingBets(rawExistingBets: any[] | null | undefined) {
        const bets = Array.isArray(rawExistingBets)
            ? rawExistingBets
                .map((item) => this.normalizeExistingBet(item))
                .filter((item): item is ExistingBet => item !== null)
            : [];
        this.ExistingBets = bets;
    }

    /** 從 game.init 設定倍率曲線（t: 秒, m: 倍率） */
    public setMultiplierCurve(rawMultiplierCurve: any[] | null | undefined) {
        this.MultiplierCurve = Array.isArray(rawMultiplierCurve)
            ? rawMultiplierCurve
                .map((item) => ({
                    t: Number(item?.t),
                    m: Number(item?.m),
                }))
                .filter((item) => Number.isFinite(item.t) && Number.isFinite(item.m))
            : [];
    }

    /** 依序發送押注（使用 betOptions 作為押注列表） */
    public sendBet() {
        if (this.betIndex >= this.betOptions.length) return;
        const betUnits = this.betOptions[this.betIndex];
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            roomId: this.roomId,
            method: 'crash.bet',
            payload: { betUnits, autoCashoutMultiplier: null, betIndex: this.betIndex },
        });
    }

    /** 發送兌現 */
    public sendCashout(betIndex: number) {
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            roomId: this.roomId,
            method: 'crash.cashout',
            payload: { betIndex },
        });
    }

    /** 取得最近回合歷史 */
    public sendRoundHistory() {
        if (!this.roomId) return;
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            roomId: this.roomId,
            method: 'crash.roundHistory',
            payload: {},
        });
    }

    /** 拉取玩家本回合下注明細 */
    public sendCrashBets() {
        if (!this.roomId) return;
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            roomId: this.roomId,
            method: 'crash.bets',
            payload: {},
        });
    }

    /** 從 WS 的 balanceUnits 同步餘額（支援 number / string） */
    private syncBalanceUnits(balanceUnits?: number | string) {
        if (balanceUnits === null || balanceUnits === undefined) return;
        const nextBalance = typeof balanceUnits === 'number' ? balanceUnits : parseFloat(balanceUnits);
        if (!Number.isFinite(nextBalance)) return;
        this.Balance = nextBalance;
    }

    /**
     * getNextBetIndex。
     * @returns getNextBetIndex 回傳值
     */
    private getNextBetIndex(): number {
        if (this.existingBets.length <= 0) return 0;
        return Math.max(...this.existingBets.map((b) => b.betIndex)) + 1;
    }

    /**
     * upsertExistingBet。
     * @param next next
     */
    private upsertExistingBet(next: ExistingBet) {
        if (typeof next?.betIndex !== 'number') return;
        const idx = this.existingBets.findIndex((b) => b.betIndex === next.betIndex);
        if (idx < 0) {
            this.ExistingBets = [...this.existingBets, next];
            return;
        }
        const current = this.existingBets[idx];
        const merged: ExistingBet = {
            ...current,
            ...next,
            /** 若新資料沒帶 betAmount，保留舊值 */
            betAmount: (typeof next.betAmount === 'number' && next.betAmount > 0) ? next.betAmount : current.betAmount,
        };
        const list = [...this.existingBets];
        list[idx] = merged;
        this.ExistingBets = list;
    }

    /**
     * normalizeExistingBet。
     * @param raw raw
     * @returns normalizeExistingBet 回傳值
     */
    private normalizeExistingBet(raw: any): ExistingBet | null {
        const betIndex = Number(raw?.betIndex);
        const betAmount = Number(raw?.betAmount);
        if (!Number.isInteger(betIndex) || !Number.isFinite(betAmount)) {
            return null;
        }
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
            payoutGross: parseNum(raw?.payoutGross),
            serviceFee: parseNum(raw?.serviceFee),
            payoutNet: parseNum(raw?.payoutNet),
            currentProfit: parseNum(raw?.currentProfit),
            cashoutAtUtc: raw?.cashoutAtUtc ?? null,
        };
    }

    /**
     * normalizeLeaderboardItem。
     * @param raw raw
     * @returns normalizeLeaderboardItem 回傳值
     */
    private normalizeLeaderboardItem(raw: any): LeaderboardItem | null {
        const playerId = typeof raw?.playerId === 'string' ? raw.playerId : '';
        const rank = Number(raw?.rank);
        if (!playerId || !Number.isFinite(rank)) {
            return null;
        }
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

    /**
     * normalizeMultiplierCurve。
     * @param curve curve
     * @returns normalizeMultiplierCurve 回傳值
     */
    private normalizeMultiplierCurve(curve: MultiplierCurvePoint[] | null | undefined): MultiplierCurvePoint[] {
        if (!Array.isArray(curve)) return [];

        return curve
            .filter((item) => Number.isFinite(item?.t) && Number.isFinite(item?.m))
            .map((item) => ({ t: Number(item.t), m: Number(item.m) }))
            .filter((item) => item.t >= 0 && item.m > 0)
            .sort((a, b) => a.t - b.t);
    }
}
