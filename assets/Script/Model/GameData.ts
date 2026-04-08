import { log } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import {
    CashoutBatchPayload,
    CashoutPayload,
    CrashBetBatchPayload,
    CrashBetPayload,
    ExistingBet,
    ExistingBetStatus,
    GmaeModel,
    GmaeModelMap,
    LeaderboardItem,
    MultiplierCurvePoint,
} from './GameModel';
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

    /** crash.bet 回傳成功（支援單筆 / 批次 payload.bets） */
    public onCrashBet(payload: CrashBetPayload | CrashBetBatchPayload | any) {
        const bets = this.extractCrashBetPayloads(payload);
        if (bets.length <= 0) {
            return;
        }
        log("crash.bet", payload);
        bets.forEach((bet) => {
            this.betIndex = Math.max(this.betIndex, bet.betIndex + 1);
            this.upsertExistingBet({
                betId: bet.betId,
                betIndex: bet.betIndex,
                betAmount: bet.betAmount,
                status: 'Pending',
                autoCashoutMultiplier: bet.autoCashoutMultiplier ?? null,
            });
            this.eventTarget.emit(GmaeModel.CrashBet, bet);
        });
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    /** crash.cashout 回傳成功（支援單筆 / 批次 payload.cashouts） */
    public onCashout(payload: CashoutPayload | CashoutBatchPayload | any) {
        const cashouts = this.extractCashoutPayloads(payload);
        if (cashouts.length <= 0) {
            return;
        }
        log("Cashout", payload);
        cashouts.forEach((cashout) => {
            this.upsertExistingBet({
                betIndex: cashout.betIndex,
                betAmount: this.existingBets.find((b) => b.betIndex === cashout.betIndex)?.betAmount ?? 0,
                status: 'CashedOut',
                cashoutMultiplier: cashout.cashoutMultiplier,
                payoutGross: cashout.payoutGross,
                serviceFee: cashout.serviceFee,
                payoutNet: cashout.payoutNet,
            });
            this.eventTarget.emit(GmaeModel.Cashout, cashout);
        });
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    /** crash.roundHistory 回傳（最多 100 筆） */
    public onRoundHistory(payload: {
        history?: number[] | { roundId: string; crashPoint: number; crashedAt: string | null }[];
        items?: { roundId: string; crashPoint: number; crashedAt: string | null }[];
    }) {
        const rawHistory = payload?.history;
        if (Array.isArray(rawHistory) && rawHistory.every((item) => Number.isFinite(Number(item)))) {
            this.RoundHistory = rawHistory
                .map((item) => Number(item))
                .filter((item) => Number.isFinite(item));
            return;
        }

        const rawItems = Array.isArray(payload?.items)
            ? payload.items
            : (Array.isArray(rawHistory) ? rawHistory : []);
        const history = rawItems
            .map((item: any) => Number(item?.crashPoint))
            .filter((item) => Number.isFinite(item));
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
        const rawBets = this.extractRawBets(payload);
        if (this.hasBets(payload)) {
            this.setExistingBets(rawBets);
        }
        this.onCashout(payload);
        this.syncBalanceUnits(payload?.balanceUnits);
    }

    /** crash.state 回傳：依 state(enum) 同步前端狀態 */
    public onCrashState(payload: any) {
        this.applyRoundStateByEnum(payload);
    }

    /** crash.reconnect 回傳：同步狀態 + 注單 + 已兌現資料 */
    public onReconnect(payload: any) {
        this.applyRoundStateByEnum(payload);
        if (this.hasBets(payload)) {
            this.setExistingBets(this.extractRawBets(payload));
        }
        this.onCashout(payload);
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
            instanceId: this.roomId,
            method: 'crash.bet',
            payload: {
                bets: [
                    {
                        betUnits,
                        autoCashoutMultiplier: null,
                        betIndex: this.betIndex,
                    },
                ],
            },
        });
    }

    /** 發送兌現 */
    public sendCashout(betIndex: number) {
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            instanceId: this.roomId,
            method: 'crash.cashout',
            payload: { betIndexes: [betIndex] },
        });
    }

    /** 取得最近回合歷史 */
    public sendRoundHistory() {
        if (!this.roomId) return;
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            instanceId: this.roomId,
            method: 'crash.roundHistory',
            payload: {},
        });
    }

    /** reconnect：同步目前回合狀態與注單 */
    public sendReconnect() {
        if (!this.roomId) return;
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            instanceId: this.roomId,
            method: 'crash.reconnect',
            payload: {},
        });
    }

    /** 主動刷新餘額 */
    public sendGameBalance() {
        if (!this.roomId) return;
        WebsocketManager.getInstance().send(ClientOp.GameBalance, {
            instanceId: this.roomId,
        });
    }

    /** 拉取玩家本回合下注明細 */
    public sendCrashBets() {
        if (!this.roomId) return;
        WebsocketManager.getInstance().send(ClientOp.GameAction, {
            instanceId: this.roomId,
            method: 'crash.bets',
            payload: {},
        });
    }

    /**
     * extractRawBets。
     * @param payload payload
     * @returns extractRawBets 回傳值
     */
    private extractRawBets(payload: any): any[] {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.existingBets)) return payload.existingBets;
        if (Array.isArray(payload?.bets)) return payload.bets;
        if (Array.isArray(payload?.items)) return payload.items;
        return [];
    }

    /**
     * hasBets。
     * @param payload payload
     * @returns hasBets 回傳值
     */
    private hasBets(payload: any): boolean {
        return Array.isArray(payload)
            || Array.isArray(payload?.existingBets)
            || Array.isArray(payload?.bets)
            || Array.isArray(payload?.items);
    }

    /**
     * extractCrashBetPayloads。
     * @param payload payload
     * @returns extractCrashBetPayloads 回傳值
     */
    private extractCrashBetPayloads(payload: any): CrashBetPayload[] {
        const rawBets = Array.isArray(payload?.bets)
            ? payload.bets
            : (Array.isArray(payload) ? payload : [payload]);

        return rawBets
            .map((raw) => this.normalizeCrashBetPayload(raw))
            .filter((item): item is CrashBetPayload => item !== null);
    }

    /**
     * extractCashoutPayloads。
     * @param payload payload
     * @returns extractCashoutPayloads 回傳值
     */
    private extractCashoutPayloads(payload: any): CashoutPayload[] {
        const rawCashouts = Array.isArray(payload?.cashouts)
            ? payload.cashouts
            : (Array.isArray(payload) ? payload : [payload]);

        return rawCashouts
            .map((raw) => this.normalizeCashoutPayload(raw))
            .filter((item): item is CashoutPayload => item !== null);
    }

    /**
     * normalizeCrashBetPayload。
     * @param raw raw
     * @returns normalizeCrashBetPayload 回傳值
     */
    private normalizeCrashBetPayload(raw: any): CrashBetPayload | null {
        const betIndex = Number(raw?.betIndex);
        const betAmount = Number(raw?.betAmount ?? raw?.betUnits);
        if (!Number.isInteger(betIndex) || !Number.isFinite(betAmount)) {
            return null;
        }

        const autoCashoutMultiplier = this.parseNullableNum(raw?.autoCashoutMultiplier);
        return {
            betId: typeof raw?.betId === 'string' ? raw.betId : undefined,
            betIndex,
            betAmount,
            autoCashoutMultiplier,
        };
    }

    /**
     * normalizeCashoutPayload。
     * @param raw raw
     * @returns normalizeCashoutPayload 回傳值
     */
    private normalizeCashoutPayload(raw: any): CashoutPayload | null {
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
        ) {
            return null;
        }

        const payout = this.parseNullableNum(raw?.payout);
        return {
            betIndex,
            cashoutMultiplier,
            payoutGross,
            serviceFee,
            payoutNet,
            payout: payout ?? undefined,
        };
    }

    /**
     * applyRoundStateByEnum。
     * @param payload payload
     */
    private applyRoundStateByEnum(payload: any) {
        const state = Number(payload?.state);
        if (!Number.isInteger(state)) {
            return;
        }

        switch (state) {
            case 0: {
                const bettingCountdown = Number(payload?.bettingCountdown);
                this.onBetting(Number.isFinite(bettingCountdown) ? bettingCountdown : 0);
                break;
            }
            case 1: {
                const multiplier = Number(payload?.currentMultiplier);
                const runningElapsed = Number(payload?.runningElapsed);
                this.onRunning(
                    Number.isFinite(multiplier) ? multiplier : 1,
                    Number.isFinite(runningElapsed) ? runningElapsed : undefined,
                );
                break;
            }
            case 2: {
                const crashPoint = Number(payload?.crashPoint ?? payload?.currentMultiplier);
                const crashedCountdown = Number(payload?.crashedCountdown);
                const runningElapsed = Number(payload?.runningElapsed);
                this.onCrashed(
                    Number.isFinite(crashPoint) ? crashPoint : 1,
                    Number.isFinite(crashedCountdown) ? crashedCountdown : 0,
                    Number.isFinite(runningElapsed) ? runningElapsed : undefined,
                );
                break;
            }
            case 3:
                this.onSettled();
                break;
        }
    }

    /** 從 WS 的 balanceUnits 同步餘額（支援 number / string） */
    private syncBalanceUnits(balanceUnits?: number | string) {
        if (balanceUnits === null || balanceUnits === undefined) return;
        const nextBalance = typeof balanceUnits === 'number' ? balanceUnits : parseFloat(balanceUnits);
        if (!Number.isFinite(nextBalance)) return;
        this.Balance = nextBalance;
    }

    /**
     * parseNullableNum。
     * @param value value
     * @returns parseNullableNum 回傳值
     */
    private parseNullableNum(value: any): number | null {
        if (value === null || value === undefined) return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
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
