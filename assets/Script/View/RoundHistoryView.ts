import { _decorator, Component, Label, Node, Prefab, UITransform, Vec3, instantiate, tween } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { GameData } from '../Model/GameData';
import { GmaeModel } from '../Model/GameModel';
import { EventManager } from '../Model/EventManager';
import { FullHistoryItem } from './FullHistoryItem';
import { RecentHistoryItem } from './RecentHistoryItem';
const { ccclass, property } = _decorator;

@ccclass('RoundHistoryView')
export class RoundHistoryView extends Component {
    @property({ type: Prefab })
    private recentPrefab: Prefab = null;
    @property({ type: Node })
    private recentLayout: Node = null;
    @property({ tooltip: 'New round slide animation duration' })
    private tweenDuration: number = 0.3;

    @property({ type: Prefab })
    private fullPrefab: Prefab = null;
    @property({ type: Node })
    private fullPanel: Node = null;
    @property({ type: Node })
    private fullLayout: Node = null;

    /** distribution ????Label嚗???distribution ???嚗?摨?摰? */
    @property({ type: [Label] })
    private distributionLabels: Label[] = [];
    @property({ type: Label })
    private historyMaxCrashPointLabel: Label = null;
    @property({ type: Label })
    private todayMaxCrashPointLabel: Label = null;

    private static readonly MIN_X = -273;
    private static readonly MAX_X = 273;
    private static readonly VISIBLE_COUNT = 8;
    private static readonly TOTAL_COUNT = 9;

    private recentItems: RecentHistoryItem[] = [];
    private fullItems: FullHistoryItem[] = [];
    private itemStep: number = 0;
    private lastHistorySnapshot: number[] = [];
    private isAnimating: boolean = false;

    private summaryRoot: Node = null;
    private runtimeDistributionLabels: Label[] = [];
    private runtimeHistoryMaxCrashPointLabel: Label = null;
    private runtimeTodayMaxCrashPointLabel: Label = null;

    start() {
        this.itemStep = (RoundHistoryView.MAX_X - RoundHistoryView.MIN_X) / (RoundHistoryView.VISIBLE_COUNT - 1);
        this.initRecentItems();
        this.initFullItems(100);
        this.ensureSummaryLabels();

        const gameData = GameData.getInstance();
        EventManager.getInstance().gameState.on(GmaeModel.RoundHistory, this.onRoundHistory, this);
        this.onRoundHistory(gameData.RoundHistory);
    }

    protected onDestroy(): void {
        EventManager.getInstance().gameState.off(GmaeModel.RoundHistory, this.onRoundHistory, this);
    }

    private initRecentItems() {
        for (let i = 0; i < RoundHistoryView.TOTAL_COUNT; i++) {
            const node = instantiate(this.recentPrefab);
            const item = node.getComponent(RecentHistoryItem);
            item.MultipleHistory = 0;
            node.setPosition(this.getItemX(i), 0, 0);
            this.recentItems.push(item);
            this.recentLayout.addChild(node);
        }
    }

    private initFullItems(count: number) {
        for (let i = 0; i < count; i++) {
            const node = instantiate(this.fullPrefab);
            const obj = node.getComponent(FullHistoryItem);
            obj.Index = i + 1;
            this.fullItems.push(obj);
            this.fullLayout.addChild(node);
        }
    }

    private getItemX(index: number): number {
        return RoundHistoryView.MIN_X + index * this.itemStep;
    }

    private onRoundHistory(history: number[]) {
        const prevHistory = this.lastHistorySnapshot;
        const tailValue = history.length > 0 ? history[history.length - 1] : NaN;
        const hasValidTailValue = Number.isFinite(tailValue) && tailValue > 0;
        const gameData = GameData.getInstance();
        const isPushUpdate = gameData.LastRoundHistoryUpdateSource === 'push';
        const isNewRound = isPushUpdate && this.shouldAnimateNewRound(prevHistory, history, hasValidTailValue);

        if (isNewRound && !this.isAnimating) {
            this.animateNewItem(history);
        } else {
            this.setRecentItems(history);
        }

        const full = history.slice(-100);
        this.fullItems.forEach((item, i) => {
            item.MultipleHistory = i < full.length ? full[full.length - 1 - i] : 0;
        });

        this.refreshSummary();
        this.lastHistorySnapshot = history.slice();
    }

    private shouldAnimateNewRound(prevHistory: number[], nextHistory: number[], hasValidTailValue: boolean): boolean {
        if (!hasValidTailValue || prevHistory.length <= 0 || nextHistory.length <= 0) {
            return false;
        }

        // Normal case: history has not reached max size yet, so length increases by 1.
        if (nextHistory.length === prevHistory.length + 1) {
            return this.areSlicesEqual(prevHistory, 0, nextHistory, 0, prevHistory.length);
        }

        // Sliding-window case at 100 rounds: same length, oldest removed, newest appended.
        if (nextHistory.length === prevHistory.length) {
            return this.areSlicesEqual(prevHistory, 1, nextHistory, 0, nextHistory.length - 1);
        }

        return false;
    }

    private areSlicesEqual(
        left: number[],
        leftStart: number,
        right: number[],
        rightStart: number,
        count: number,
    ): boolean {
        if (count < 0) return false;
        if (leftStart < 0 || rightStart < 0) return false;
        if (leftStart + count > left.length || rightStart + count > right.length) return false;

        for (let i = 0; i < count; i++) {
            if (!this.isNearlyEqual(left[leftStart + i], right[rightStart + i])) {
                return false;
            }
        }
        return true;
    }

    private isNearlyEqual(a: number, b: number): boolean {
        return Math.abs(a - b) <= 0.01;
    }

    private setRecentItems(history: number[]) {
        const recent = history.slice(-RoundHistoryView.VISIBLE_COUNT);
        for (let i = 0; i < RoundHistoryView.VISIBLE_COUNT; i++) {
            const item = this.recentItems[i];
            const dataIndex = i - (RoundHistoryView.VISIBLE_COUNT - recent.length);
            item.MultipleHistory = dataIndex >= 0 ? recent[dataIndex] : 0;
            item.node.setPosition(this.getItemX(i), 0, 0);
        }

        const standby = this.recentItems[RoundHistoryView.VISIBLE_COUNT];
        standby.MultipleHistory = 0;
        standby.node.setPosition(this.getItemX(RoundHistoryView.VISIBLE_COUNT), 0, 0);
    }

    private animateNewItem(history: number[]) {
        this.isAnimating = true;

        const standby = this.recentItems[RoundHistoryView.VISIBLE_COUNT];
        standby.MultipleHistory = history[history.length - 1];

        let doneCount = 0;
        this.recentItems.forEach((item, i) => {
            tween(item.node)
                .to(this.tweenDuration, { position: new Vec3(this.getItemX(i - 1), 0, 0) })
                .call(() => {
                    doneCount++;
                    if (doneCount >= RoundHistoryView.TOTAL_COUNT) {
                        this.onAnimateComplete();
                    }
                })
                .start();
        });
    }

    private onAnimateComplete() {
        const first = this.recentItems.shift();
        this.recentItems.push(first);

        first.MultipleHistory = 0;
        first.node.setPosition(this.getItemX(RoundHistoryView.VISIBLE_COUNT), 0, 0);

        this.isAnimating = false;
    }

    /** distribution ?身????*/
    private static readonly DISTRIBUTION_COUNT = 5;

    private ensureSummaryLabels() {
        if (this.distributionLabels.length > 0 && this.historyMaxCrashPointLabel && this.todayMaxCrashPointLabel) {
            return;
        }
        if (!this.fullPanel || this.summaryRoot) {
            return;
        }

        this.summaryRoot = new Node('RoundHistorySummary');
        this.summaryRoot.layer = this.fullPanel.layer;
        this.fullPanel.addChild(this.summaryRoot);
        this.summaryRoot.setPosition(-10, 75, 0);

        const rootTransform = this.summaryRoot.addComponent(UITransform);
        rootTransform.setContentSize(840, 130);

        this.runtimeHistoryMaxCrashPointLabel = this.createSummaryLabel(
            this.summaryRoot,
            '-',
            -390,
            50,
            360,
            26,
            18,
        );
        this.runtimeTodayMaxCrashPointLabel = this.createSummaryLabel(
            this.summaryRoot,
            '-',
            20,
            50,
            360,
            26,
            18,
        );

        const labelWidth = 150;
        for (let i = 0; i < RoundHistoryView.DISTRIBUTION_COUNT; i++) {
            const label = this.createSummaryLabel(
                this.summaryRoot,
                '-',
                -390 + i * labelWidth,
                10,
                labelWidth,
                26,
                16,
            );
            this.runtimeDistributionLabels.push(label);
        }
    }

    private createSummaryLabel(
        parent: Node,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
    ): Label {
        const node = new Node('SummaryLabel');
        node.layer = parent.layer;
        parent.addChild(node);
        node.setPosition(x, y, 0);

        const transform = node.addComponent(UITransform);
        transform.setAnchorPoint(0, 1);
        transform.setContentSize(width, height);

        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.enableWrapText = true;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.TOP;
        return label;
    }

    private refreshSummary() {
        const distLabels = this.distributionLabels.length > 0 ? this.distributionLabels : this.runtimeDistributionLabels;
        const historyMaxLabel = this.historyMaxCrashPointLabel ?? this.runtimeHistoryMaxCrashPointLabel;
        const todayMaxLabel = this.todayMaxCrashPointLabel ?? this.runtimeTodayMaxCrashPointLabel;

        const gameData = GameData.getInstance();

        if (historyMaxLabel) {
            historyMaxLabel.string = this.formatCrashPoint(gameData.HistoryMaxCrashPoint);
        }
        if (todayMaxLabel) {
            todayMaxLabel.string = this.formatCrashPoint(gameData.TodayMaxCrashPoint);
        }

        const distribution = gameData.RoundHistoryDistribution ?? [];
        for (let i = 0; i < distLabels.length; i++) {
            if (i < distribution.length) {
                distLabels[i].string = `${distribution[i].count}`;
            } else {
                distLabels[i].string = '-';
            }
        }
    }

    private formatCrashPoint(value: number | null): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return '-';
        }
        return BaseModel.getRoundToStr(value, 2);
    }

}
