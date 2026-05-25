import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { GameData } from '../Model/GameData';
import { GmaeModel } from '../Model/GameData';
import { type CrashLeaderboardItemContract } from '../Model/WebSocketManager';
import { LeaderboardItem } from './LeaderboardItem';
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
    private pool: LeaderboardItem[] = [];
    /** maxBetCount 欄位。 */
    private maxBetCount: number = 0;
    /** currentInfoState 欄位。 */
    private currentInfoState: number = 0;

    private static readonly INFO_BETTING = 0;
    private static readonly INFO_RUNNING = 1;
    private static readonly INFO_CRASHED = 2;
    private static readonly MAX_DISPLAY_COUNT = 6;

    /** start。 */
    start() {
        const gameData = GameData.getInstance();
        GameData.getInstance().onGameState(GmaeModel.MaxBetCount, this.onMaxBetCount, this);
        GameData.getInstance().onGameState(GmaeModel.Leaderboard, this.onLeaderboard, this);
        GameData.getInstance().onGameState(GmaeModel.BettingCountdown, this.onBetting, this);
        GameData.getInstance().onGameState(GmaeModel.Multiplier, this.onRunning, this);
        GameData.getInstance().onGameState(GmaeModel.Explode, this.onCrashed, this);
        GameData.getInstance().onGameState(GmaeModel.Settled, this.onSettled, this);

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
        this.currentInfoState = LeaderboardView.INFO_BETTING;
        this.pool.forEach((obj) => obj.switchInfo(this.currentInfoState));
    }

    /**
     * onRunning。
     * @param multiplier multiplier
     */
    private onRunning(multiplier: number) {
        this.currentInfoState = LeaderboardView.INFO_RUNNING;
        this.pool.forEach((obj) => obj.switchInfo(this.currentInfoState));
    }

    /**
     * onCrashed。
     * @param crashPoint crashPoint
     */
    private onCrashed(crashPoint: number) {
        this.currentInfoState = LeaderboardView.INFO_CRASHED;
        this.pool.forEach((obj) => obj.switchInfo(this.currentInfoState));
    }

    /** onSettled。 */
    private onSettled() {
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
    private onLeaderboard(leaderboard: CrashLeaderboardItemContract[]) {
        const source = Array.isArray(leaderboard) ? leaderboard : [];
        const topLeaderboard = source.slice(0, LeaderboardView.MAX_DISPLAY_COUNT);
        this.pool.forEach((obj) => obj.reset());

        const container = this.itemContainer ?? this.node;
        for (let i = 0; i < topLeaderboard.length; i++) {
            const obj = this.getItem(container);
            obj.init(topLeaderboard[i]);
            obj.switchInfo(this.currentInfoState);
        }
    }

    /**
     * getItem。
     * @param container container
     * @returns getItem 回傳值
     */
    private getItem(container: Node): LeaderboardItem {
        const idle = this.pool.find((obj) => !obj.node.active);
        if (idle) return idle;

        const node = instantiate(this.itemPrefab);
        const obj = node.getComponent(LeaderboardItem);
        obj.buildStatusSlots(this.maxBetCount);
        container.addChild(node);
        this.pool.push(obj);
        return obj;
    }
}
