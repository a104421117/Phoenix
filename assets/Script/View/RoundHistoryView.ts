import { _decorator, Component, Button, Node, Prefab, instantiate, tween, Vec3 } from 'cc';
import { GameData, GmaeModel } from '../Model/GameData';
import { RecentHistoryItem } from './RecentHistoryItem';
import { FullHistoryItem } from './FullHistoryItem';
const { ccclass, property } = _decorator;

@ccclass('RoundHistoryView')
export class RoundHistoryView extends Component {
    /** 常駐（只有倍數） */
    @property({ type: Prefab })
    private recentPrefab: Prefab = null;
    /** 欄位設定。 */
    @property({ type: Node })
    private recentLayout: Node = null;
    /** 緩動時間（秒）。 */
    @property({ tooltip: '緩動時間（秒）' })
    private tweenDuration: number = 0.3;

    /** 面板（局數編號 + 倍數） */
    @property({ type: Prefab })
    private fullPrefab: Prefab = null;
    /** 欄位設定。 */
    @property({ type: Node })
    private fullPanel: Node = null;
    /** 欄位設定。 */
    @property({ type: Node })
    private fullLayout: Node = null;
    /** 欄位設定。 */
    @property({ type: Button })
    private openBtn: Button = null;
    /** 欄位設定。 */
    @property({ type: Button })
    private closeBtn: Button = null;

    private static readonly MIN_X = -273;
    private static readonly MAX_X = 273;
    /** 顯示 8 個 + 右邊 1 個待命 = 9 個 */
    private static readonly VISIBLE_COUNT = 8;
    private static readonly TOTAL_COUNT = 9;

    /** recentItems 欄位。 */
    private recentItems: RecentHistoryItem[] = [];
    /** fullItems 欄位。 */
    private fullItems: FullHistoryItem[] = [];
    /** itemStep 欄位。 */
    private itemStep: number = 0;
    /** lastHistoryLength 欄位。 */
    private lastHistoryLength: number = 0;
    /** isAnimating 欄位。 */
    private isAnimating: boolean = false;

    /** start。 */
    start() {
        this.itemStep = (RoundHistoryView.MAX_X - RoundHistoryView.MIN_X) / (RoundHistoryView.VISIBLE_COUNT - 1);
        this.initRecentItems();
        this.initFullItems(100);
        this.fullPanel.active = false;

        this.openBtn.node.on(Button.EventType.CLICK, this.onOpen, this);
        this.closeBtn.node.on(Button.EventType.CLICK, this.onClose, this);

        const gameData = GameData.getInstance();
        gameData.on(GmaeModel.RoundHistory, this.onRoundHistory, this);
        this.onRoundHistory(gameData.RoundHistory);
    }

    /** initRecentItems。 */
    private initRecentItems() {
        for (let i = 0; i < RoundHistoryView.TOTAL_COUNT; i++) {
            const node = instantiate(this.recentPrefab);
            const item = node.getComponent(RecentHistoryItem);
            item.MultipleHistory = 0;
            /** 0~7 是顯示區（index 0~7），8 是右邊待命位（index 8） */
            node.setPosition(this.getItemX(i), 0, 0);
            this.recentItems.push(item);
            this.recentLayout.addChild(node);
        }
    }

    /**
     * initFullItems。
     * @param count count
     */
    private initFullItems(count: number) {
        for (let i = 0; i < count; i++) {
            const node = instantiate(this.fullPrefab);
            const obj = node.getComponent(FullHistoryItem);
            obj.Index = i + 1;
            this.fullItems.push(obj);
            this.fullLayout.addChild(node);
        }
    }

    /**
     * getItemX。
     * @param index index
     * @returns getItemX 回傳值
     */
    private getItemX(index: number): number {
        return RoundHistoryView.MIN_X + index * this.itemStep;
    }

    /**
     * onRoundHistory。
     * @param history history
     */
    private onRoundHistory(history: number[]) {
        const isNewRound = history.length > this.lastHistoryLength && this.lastHistoryLength > 0;
        this.lastHistoryLength = history.length;

        if (isNewRound && !this.isAnimating) {
            this.animateNewItem(history);
        } else {
            this.setRecentItems(history);
        }

        /** 面板（無動畫） */
        const full = history.slice(-100);
        this.fullItems.forEach((item, i) => {
            item.MultipleHistory = i < full.length ? full[full.length - 1 - i] : 0;
        });
    }

    /** 無動畫直接設定（初始化 / 非新回合更新） */
    private setRecentItems(history: number[]) {
        const recent = history.slice(-RoundHistoryView.VISIBLE_COUNT);
        /** 設定 0~7 顯示資料，最新在右 */
        for (let i = 0; i < RoundHistoryView.VISIBLE_COUNT; i++) {
            const item = this.recentItems[i];
            const dataIndex = i - (RoundHistoryView.VISIBLE_COUNT - recent.length);
            item.MultipleHistory = dataIndex >= 0 ? recent[dataIndex] : 0;
            item.node.setPosition(this.getItemX(i), 0, 0);
        }
        /** 第 9 個（index 8）待命位，清空 */
        const standby = this.recentItems[RoundHistoryView.VISIBLE_COUNT];
        standby.MultipleHistory = 0;
        standby.node.setPosition(this.getItemX(RoundHistoryView.VISIBLE_COUNT), 0, 0);
    }

    /** 新倍數：設定待命位資料 → 全部往左移一格 → 最左邊移到最右邊待命 */
    private animateNewItem(history: number[]) {
        this.isAnimating = true;

        /** 待命位（最右邊）設定新倍數 */
        const standby = this.recentItems[RoundHistoryView.VISIBLE_COUNT];
        standby.MultipleHistory = history[history.length - 1];

        /** 9 個全部同時往左移一格 */
        let doneCount = 0;
        this.recentItems.forEach((item, i) => {
            tween(item.node)
                .to(this.tweenDuration, { position: new Vec3(this.getItemX(i - 1), 0, 0) })
                .call(() => {
                    doneCount++;
                    if (doneCount >= RoundHistoryView.TOTAL_COUNT) {
                        this.onAnimateComplete(history);
                    }
                })
                .start();
        });
    }

    /** 緩動完成：最左邊的移到最右邊待命位 */
    private onAnimateComplete(history: number[]) {
        /** 最左邊的 item 移到陣列最後，成為新的待命位 */
        const first = this.recentItems.shift();
        this.recentItems.push(first);

        /** 清空並移到待命位 */
        first.MultipleHistory = 0;
        first.node.setPosition(this.getItemX(RoundHistoryView.VISIBLE_COUNT), 0, 0);

        this.isAnimating = false;
    }

    /** onOpen。 */
    private onOpen() {
        this.fullPanel.active = true;
    }

    /** onClose。 */
    private onClose() {
        this.fullPanel.active = false;
    }
}
