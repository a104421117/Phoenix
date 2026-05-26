import { BaseModel } from '../../Game.Client.Common/BaseModel';
import type {
    CrashHistoryDistributionItemContract,
    CrashLeaderboardItemContract,
    CrashMultiplierCurvePointContract,
    RoomSummary,
} from './WebsocketManager';
import type { AudioModel, AudioModelMap } from './AudioModel';

type RoundHistoryUpdateSource = 'sync' | 'push';

export enum GmaeModel {
    PlayerId = 'PlayerId',
    Wallet = 'Wallet',
    Leaderboard = 'Leaderboard',
    BetLevels = 'BetLevels',
    MaxBetCount = 'MaxBetCount',
    RoundHistory = 'RoundHistory',
    BettingCountdown = 'BettingCountdown',
    Multiplier = 'Multiplier',
    RunningElapsed = 'RunningElapsed',
    MultiplierCurve = 'MultiplierCurve',
    Explode = 'Explode',
    CrashedCountdown = 'CrashedCountdown',
    Settled = 'Settled',
    CrashBet = 'crash.bet',
    Cashout = 'Cashout',
    CashoutTotalPayout = 'CashoutTotalPayout',
    ExistingBets = 'ExistingBets',
    Rooms = 'Rooms',
    RoomJoined = 'RoomJoined',
    ShowError = 'ShowError',
}

export enum GameErrorPrompt {
    InsufficientBalance = '餘額不足',
    InsufficientBalanceWithPeriod = '餘額不足。',
    MaxBetCountReached = '已達本局投注次數上限',
    IdleKicked = '閒置時間過長，請重新進入遊戲',
    RoundRunningWait = '本局已開始，請等待下一局',
    NetworkReconnecting = '網路連線異常，重新連線中...',
    RoomBetLimitReached = '房間投注已達上限',
    LeaveWithActiveBet = '目前有未結算投注，無法離開房間',
    LeaveWhileSettling = '回合結算中，請稍候',
    AfkLeaveConfirm = '自動模式進行中，離開將停止自動投注，是否離開？',
    AfkActionBlocked = '自動模式進行中，無法調整設定',
}

export enum ExistingBetStatus {
    WalletPending = 'WalletPending',
    Pending = 'Pending',
    CashoutPending = 'CashoutPending',
    CashedOut = 'CashedOut',
    Lost = 'Lost',
}

export const RoundState = {
    None: '',
    Betting: 'Betting',
    Running: 'Running',
    Crashed: 'Crashed',
    Settled: 'Settled',
} as const;
export type RoundState = typeof RoundState[keyof typeof RoundState];

export type ExistingBet = {
    betIndex: number;
    betAmount: number;
    status: ExistingBetStatus;
    cashoutMultiplier: number | null;
    payoutGross: number | null;
    payoutNet: number | null;
    currentProfit: number | null;
};

export type GmaeModelMap = {
    [GmaeModel.ShowError]: { message: string };
};

type TypedGameState = keyof GmaeModelMap;
type UntypedGameState = Exclude<GmaeModel, TypedGameState>;
type GameStateEventMap = Record<GmaeModel, any> & GmaeModelMap;

export class GameData extends BaseModel.Singleton {
    // private static readonly FALLBACK_WS_URL_DEV: string = 'ws://localhost:20001/connect';
    private static readonly FALLBACK_WS_URL_DEV: string = 'wss://dev-game.jutechs.com/connect';
    private static readonly DEV_TOKEN: string = 'phoenix-test-e15bcb2770924204b8fc643b99af560d';

    private readonly gameState = new BaseModel.GameEvent<GmaeModel, GameStateEventMap>();
    private readonly audio = new BaseModel.GameEvent<AudioModel, AudioModelMap>();

    private lobbyId: string = '';
    private rooms: RoomSummary[] = [];
    private multiplierCurve: CrashMultiplierCurvePointContract[] = [];
    private roomId: string = '';
    private playerId: string = '';
    private wallet: number = 0;
    private leaderboard: CrashLeaderboardItemContract[] = [];
    private betLevels: number[] = [];
    private maxBetCount: number = 0;
    private roundHistory: number[] = [];
    private roundHistoryDistribution: CrashHistoryDistributionItemContract[] = [];
    private historyMaxCrashPoint: number | null = null;
    private todayMaxCrashPoint: number | null = null;
    private existingBets: ExistingBet[] = [];
    private betIndex: number = 0;
    private selectedBetUnits: number = 0;
    private multiplier: number = 1;
    private runningElapsed: number = 0;
    private roundState: RoundState = RoundState.None;
    private isCrashed: boolean = false;
    private lastRoundHistoryUpdateSource: RoundHistoryUpdateSource = 'sync';
    private currencyScale: number = 2;

    public get FallbackWsUrl(): string { return GameData.FALLBACK_WS_URL_DEV; }
    public get DevToken(): string { return GameData.DEV_TOKEN; }

    public get LobbyId(): string { return this.lobbyId; }
    public set LobbyId(value: string) { this.lobbyId = value; }

    public get Rooms(): RoomSummary[] { return this.rooms; }
    public set Rooms(value: RoomSummary[]) { this.rooms = value; }

    public get MultiplierCurve(): CrashMultiplierCurvePointContract[] { return this.multiplierCurve; }
    public set MultiplierCurve(value: CrashMultiplierCurvePointContract[]) { this.multiplierCurve = value; }

    public get RoomId(): string { return this.roomId; }
    public set RoomId(value: string) { this.roomId = value; }

    public get PlayerId(): string { return this.playerId; }
    public set PlayerId(value: string) { this.playerId = value; }

    public get Wallet(): number { return this.wallet; }
    public set Wallet(value: number) { this.wallet = value; }

    public get Leaderboard(): CrashLeaderboardItemContract[] { return this.leaderboard; }
    public set Leaderboard(value: CrashLeaderboardItemContract[]) { this.leaderboard = value; }

    public get BetLevels(): number[] { return this.betLevels; }
    public set BetLevels(value: number[]) { this.betLevels = value; }

    public get SelectedBetUnits(): number { return this.selectedBetUnits; }
    public set SelectedBetUnits(value: number) { this.selectedBetUnits = value; }

    public get MaxBetCount(): number { return this.maxBetCount; }
    public set MaxBetCount(value: number) { this.maxBetCount = value; }

    public get RoundHistory(): number[] { return this.roundHistory; }
    public set RoundHistory(value: number[]) { this.roundHistory = value; }

    public get RoundHistoryDistribution(): CrashHistoryDistributionItemContract[] { return this.roundHistoryDistribution; }
    public set RoundHistoryDistribution(value: CrashHistoryDistributionItemContract[]) { this.roundHistoryDistribution = value; }

    public get HistoryMaxCrashPoint(): number | null { return this.historyMaxCrashPoint; }
    public set HistoryMaxCrashPoint(value: number | null) { this.historyMaxCrashPoint = value; }

    public get TodayMaxCrashPoint(): number | null { return this.todayMaxCrashPoint; }
    public set TodayMaxCrashPoint(value: number | null) { this.todayMaxCrashPoint = value; }

    public get ExistingBets(): ExistingBet[] { return this.existingBets; }
    public set ExistingBets(value: ExistingBet[]) { this.existingBets = value; }

    public get BetIndex(): number { return this.betIndex; }
    public set BetIndex(value: number) { this.betIndex = value; }

    public get Multiplier(): number { return this.multiplier; }
    public set Multiplier(value: number) { this.multiplier = value; }

    public get RunningElapsed(): number { return this.runningElapsed; }
    public set RunningElapsed(value: number) { this.runningElapsed = value; }

    public get RoundState(): RoundState { return this.roundState; }
    public set RoundState(value: RoundState) { this.roundState = value; }

    public get IsCrashed(): boolean { return this.isCrashed; }
    public set IsCrashed(value: boolean) { this.isCrashed = value; }

    public get LastRoundHistoryUpdateSource(): RoundHistoryUpdateSource { return this.lastRoundHistoryUpdateSource; }
    public set LastRoundHistoryUpdateSource(value: RoundHistoryUpdateSource) { this.lastRoundHistoryUpdateSource = value; }

    public get CurrencyScale(): number { return this.currencyScale; }
    public set CurrencyScale(value: number) { this.currencyScale = value; }

    public onGameState<T extends TypedGameState>(cmd: T, callback: (data: GmaeModelMap[T]) => void, target?: any): void;
    public onGameState<T extends UntypedGameState>(cmd: T, callback: (data: any) => void, target?: any): void;
    public onGameState(cmd: GmaeModel, callback: (data: any) => void, target?: any): void {
        this.gameState.on(cmd, callback, target);
    }

    public offGameState<T extends TypedGameState>(cmd: T, callback?: (data: GmaeModelMap[T]) => void, target?: any): void;
    public offGameState<T extends UntypedGameState>(cmd: T, callback?: (data: any) => void, target?: any): void;
    public offGameState(cmd: GmaeModel, callback?: (data: any) => void, target?: any): void {
        this.gameState.off(cmd, callback, target);
    }

    public onceGameState<T extends TypedGameState>(cmd: T, callback: (data: GmaeModelMap[T]) => void, target?: any): void;
    public onceGameState<T extends UntypedGameState>(cmd: T, callback: (data: any) => void, target?: any): void;
    public onceGameState(cmd: GmaeModel, callback: (data: any) => void, target?: any): void {
        this.gameState.once(cmd, callback, target);
    }

    public emitGameState<T extends TypedGameState>(cmd: T, data: GmaeModelMap[T]): void;
    public emitGameState<T extends UntypedGameState>(cmd: T, data?: any): void;
    public emitGameState(cmd: GmaeModel, data?: any): void {
        (this.gameState.emit as any)(cmd, data);
    }

    public onAudio<T extends AudioModel>(cmd: T, callback: (data: AudioModelMap[T]) => void, target?: any) {
        this.audio.on(cmd, callback, target);
    }

    public offAudio<T extends AudioModel>(cmd: T, callback?: (data: AudioModelMap[T]) => void, target?: any) {
        this.audio.off(cmd, callback, target);
    }

    public emitAudio<T extends AudioModel>(
        cmd: T,
        ...args: AudioModelMap[T] extends void ? [] : [data: AudioModelMap[T]]
    ) {
        (this.audio.emit as any)(cmd, ...args);
    }
}
