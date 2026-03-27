import { _decorator, Component, log, Node, Prefab, instantiate } from 'cc';
import { GameData, GmaeModel } from '../Model/GameData';
import { LeaderboardItem as LeaderboardItemData } from '../Model/GameModel';
import { LeaderboardItem as LeaderboardItemComp } from './LeaderboardItem';
const { ccclass, property } = _decorator;

@ccclass('LeaderboardView')
export class LeaderboardView extends Component {
    /** LeaderboardItem Prefab（需掛載 LeaderboardItem）。 */
    @property({ type: Prefab, tooltip: 'LeaderboardItem Prefab（需掛載 LeaderboardItem）' })
    private itemPrefab: Prefab = null;
    /** LeaderboardItem 的父節點。 */
    @property({ type: Node, tooltip: 'LeaderboardItem 的父節點' })
    private itemContainer: Node = null;

    /** pool 欄位。 */
    private pool: LeaderboardItemComp[] = [];
    /** maxBetCount 欄位。 */
    private maxBetCount: number = 0;
    /** currentInfoState 欄位。 */
    private currentInfoState: number = 0;

    private static readonly INFO_BETTING = 0;
    private static readonly INFO_RUNNING = 1;
    private static readonly INFO_CRASHED = 2;

    /** start。 */
    start() {
        const gameData = GameData.getInstance();
        gameData.on(GmaeModel.MaxBetCount, this.onMaxBetCount, this);
        gameData.on(GmaeModel.Leaderboard, this.onLeaderboard, this);
        gameData.on(GmaeModel.BettingCountdown, this.onBetting, this);
        gameData.on(GmaeModel.Multiplier, this.onRunning, this);
        gameData.on(GmaeModel.Explode, this.onCrashed, this);
        gameData.on(GmaeModel.Settled, this.onSettled, this);

        this.maxBetCount = gameData.MaxBetCount;
    }

    /** onDestroy。 */
    protected onDestroy(): void {
        this.pool.forEach((obj) => obj.node?.destroy());
        this.pool.length = 0;
    }

    /**
     * onBetting。
     * @param countdown countdown
     */
    private onBetting(countdown: number) {
        log('[LeaderboardView] state:', GameData.getInstance().RoundState, 'countdown:', countdown);
        this.currentInfoState = LeaderboardView.INFO_BETTING;
        this.pool.forEach((obj) => obj.switchInfo(this.currentInfoState));
    }

    /**
     * onRunning。
     * @param multiplier multiplier
     */
    private onRunning(multiplier: number) {
        log('[LeaderboardView] state:', GameData.getInstance().RoundState, 'multiplier:', multiplier);
        this.currentInfoState = LeaderboardView.INFO_RUNNING;
        this.pool.forEach((obj) => {
            obj.switchInfo(this.currentInfoState);
            obj.setMultiplier(multiplier);
        });
    }

    /**
     * onCrashed。
     * @param crashPoint crashPoint
     */
    private onCrashed(crashPoint: number) {
        log('[LeaderboardView] state:', GameData.getInstance().RoundState, 'crashPoint:', crashPoint);
        this.currentInfoState = LeaderboardView.INFO_CRASHED;
        this.pool.forEach((obj) => obj.switchInfo(this.currentInfoState));
    }

    /** onSettled。 */
    private onSettled() {
        log('[LeaderboardView] state:', GameData.getInstance().RoundState);
        this.pool.forEach((obj) => obj.reset());
    }

    /**
     * onMaxBetCount。
     * @param maxBetCount maxBetCount
     */
    private onMaxBetCount(maxBetCount: number) {
        this.maxBetCount = Math.max(0, Math.floor(maxBetCount || 0));
        this.pool.forEach((obj) => obj.buildStatusSlots(this.maxBetCount));
    }

    /**
     * onLeaderboard。
     * @param leaderboard leaderboard
     */
    private onLeaderboard(leaderboard: LeaderboardItemData[]) {
        log('[LeaderboardView] onLeaderboard', 'state:', GameData.getInstance().RoundState, 'count:', leaderboard.length, 'infoState:', this.currentInfoState, leaderboard.map(i => ({ rank: i.rank, playerId: i.playerId, totalBet: i.totalBet, profit: i.profit })));
        this.pool.forEach((obj) => obj.reset());

        const container = this.itemContainer ?? this.node;
        for (let i = 0; i < leaderboard.length; i++) {
            const obj = this.getItem(container);
            obj.init(leaderboard[i]);
            obj.switchInfo(this.currentInfoState);
        }
    }

    /**
     * getItem。
     * @param container container
     * @returns getItem 回傳值
     */
    private getItem(container: Node): LeaderboardItemComp {
        const idle = this.pool.find((obj) => !obj.node.active);
        if (idle) return idle;

        const node = instantiate(this.itemPrefab);
        const obj = node.getComponent(LeaderboardItemComp);
        obj.buildStatusSlots(this.maxBetCount);
        container.addChild(node);
        this.pool.push(obj);
        return obj;
    }
}
