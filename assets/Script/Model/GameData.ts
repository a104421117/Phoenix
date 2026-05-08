import { BUILD } from 'cc/env';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import {
    ExistingBet,
    LeaderboardItem,
    MultiplierCurvePoint,
} from './GameModel';
import {
    CrashHistoryDistributionItemContract,
} from './WebsocketModel';

type RoundHistoryUpdateSource = 'sync' | 'push';

export { GmaeModel, type GmaeModelMap } from './GameModel';

/**
 * 純資料容器：所有欄位 private，對外只有 get/set。
 * 業務邏輯（含 gameState 通知、normalize、cascade）一律寫在 GameController；
 * 本檔的 setter 只負責「把值寫進欄位」，不做任何副作用。
 */
export class GameData extends BaseModel.Singleton {
    private static readonly BET_HISTORY_URL_DEV: string = 'http://127.0.0.1:5500/';
    // private static readonly FALLBACK_WS_URL_DEV: string = 'ws://localhost:20001/connect';
    private static readonly FALLBACK_WS_URL_DEV: string = 'wss://dev-game.jutechs.com/connect';
    private static readonly DEV_TOKEN: string = 'phoenix-test-e15bcb2770924204b8fc643b99af560d';

    private lobbyId: string = '';
    private roomId: string = '';
    private roomJoinHasGameState: boolean = false;
    private roomJoinHasBalance: boolean = false;
    private playerId: string = '';
    private balance: number = 0;
    private leaderboard: LeaderboardItem[] = [];
    private betOptions: number[] = [];
    private maxBetCount: number = 0;
    private roundHistory: number[] = [];
    private roundHistoryDistribution: CrashHistoryDistributionItemContract[] = [];
    private historyMaxCrashPoint: number | null = null;
    private todayMaxCrashPoint: number | null = null;
    private existingBets: ExistingBet[] = [];
    private betIndex: number = 0;
    private selectedBetUnits: number = 0;
    private multiplierCurve: MultiplierCurvePoint[] = [];
    private runningElapsed: number = 0;
    private roundState: 'Betting' | 'Running' | 'Crashed' | 'Settled' | '' = '';
    private isCrashed: boolean = false;
    private lastRoundHistoryUpdateSource: RoundHistoryUpdateSource = 'sync';
    private currencyScale: number = 2;

    /* ===== Config（讀取編譯期設定，純讀取）===== */

    public get BetHistoryUrl(): string {
        if (BUILD && typeof window !== 'undefined') {
            const config = (window as any).GAME_CONFIG ?? {};
            const configUrl = typeof config.betHistoryUrl === 'string' ? config.betHistoryUrl.trim() : '';
            if (configUrl) return configUrl;
        }
        return GameData.BET_HISTORY_URL_DEV;
    }

    public get FallbackWsUrl(): string { return GameData.FALLBACK_WS_URL_DEV; }
    public get DevToken(): string { return GameData.DEV_TOKEN; }

    /* ===== State get/set（純儲存）===== */

    public get LobbyId(): string { return this.lobbyId; }
    public set LobbyId(value: string) { this.lobbyId = value; }

    public get RoomId(): string { return this.roomId; }
    public set RoomId(value: string) { this.roomId = value; }

    public get RoomJoinHasGameState(): boolean { return this.roomJoinHasGameState; }
    public set RoomJoinHasGameState(value: boolean) { this.roomJoinHasGameState = value; }

    public get RoomJoinHasBalance(): boolean { return this.roomJoinHasBalance; }
    public set RoomJoinHasBalance(value: boolean) { this.roomJoinHasBalance = value; }

    public get PlayerId(): string { return this.playerId; }
    public set PlayerId(value: string) { this.playerId = value; }

    public get Balance(): number { return this.balance; }
    public set Balance(value: number) { this.balance = value; }

    public get Leaderboard(): LeaderboardItem[] { return this.leaderboard; }
    public set Leaderboard(value: LeaderboardItem[]) { this.leaderboard = value; }

    public get BetOptions(): number[] { return this.betOptions; }
    public set BetOptions(value: number[]) { this.betOptions = value; }

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

    public get MultiplierCurve(): MultiplierCurvePoint[] { return this.multiplierCurve; }
    public set MultiplierCurve(value: MultiplierCurvePoint[]) { this.multiplierCurve = value; }

    public get RunningElapsed(): number { return this.runningElapsed; }
    public set RunningElapsed(value: number) { this.runningElapsed = value; }

    public get RoundState(): 'Betting' | 'Running' | 'Crashed' | 'Settled' | '' { return this.roundState; }
    public set RoundState(value: 'Betting' | 'Running' | 'Crashed' | 'Settled' | '') { this.roundState = value; }

    public get IsCrashed(): boolean { return this.isCrashed; }
    public set IsCrashed(value: boolean) { this.isCrashed = value; }

    public get LastRoundHistoryUpdateSource(): RoundHistoryUpdateSource { return this.lastRoundHistoryUpdateSource; }
    public set LastRoundHistoryUpdateSource(value: RoundHistoryUpdateSource) { this.lastRoundHistoryUpdateSource = value; }

    public get CurrencyScale(): number { return this.currencyScale; }
    public set CurrencyScale(value: number) { this.currencyScale = value; }
}
