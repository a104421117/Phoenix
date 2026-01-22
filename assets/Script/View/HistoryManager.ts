import { _decorator, Node, Prefab, instantiate, Color, Label, Sprite } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents } from '../Lib/Constants';
import { ModelManager } from '../Model/ModelManager';
import { HistoryRecord } from '../Model/HistoryModel';

const { ccclass, property } = _decorator;

/**
 * 歷史記錄管理器
 */
@ccclass('HistoryManager')
export class HistoryManager extends BaseManager {
    private static _inst: HistoryManager;
    public static get instance(): HistoryManager {
        return HistoryManager._inst;
    }

    @property(Node)
    private historyContainer: Node = null;

    @property(Prefab)
    private historyItemPrefab: Prefab = null;

    @property
    private maxDisplayCount: number = 10;

    // 顏色配置
    private readonly COLORS: { [key: string]: Color } = {
        'red': new Color(255, 77, 77),
        'yellow': new Color(255, 193, 7),
        'green': new Color(76, 175, 80),
        'blue': new Color(33, 150, 243)
    };

    protected onManagerLoad(): void {
        HistoryManager._inst = this;
    }

    public init(): void {
        this._registerEvents();
    }

    public reset(): void {
        this._clearItems();
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.GAME_CRASH, this._onGameCrash, this);
        EventManager.instance.on(GameEvents.GAME_SETTLE, this._onGameSettle, this);
    }

    private _onGameCrash(data: { roundId: string; crashPoint: number }): void {
        // 在 GAME_SETTLE 中處理，避免重複添加
    }

    private _onGameSettle(data: { roundId: string; crashPoint: number }): void {
        const record: HistoryRecord = {
            roundId: data.roundId,
            crashPoint: data.crashPoint,
            timestamp: Date.now()
        };

        this._addHistoryItem(record);
    }

    private _addHistoryItem(record: HistoryRecord): void {
        if (!this.historyContainer) return;

        let item: Node;

        if (this.historyItemPrefab) {
            item = instantiate(this.historyItemPrefab);
        } else {
            // 如果沒有預製件，創建簡單的 Label
            item = new Node('HistoryItem');
            const label = item.addComponent(Label);
            label.string = record.crashPoint.toFixed(2) + 'x';
            label.fontSize = 20;
        }

        // 設置內容
        const label = item.getComponentInChildren(Label);
        if (label) {
            label.string = record.crashPoint.toFixed(2) + 'x';

            // 設置顏色
            const colorType = ModelManager.instance.historyModel.getColorType(record.crashPoint);
            label.color = this.COLORS[colorType] || this.COLORS['yellow'];
        }

        // 嘗試設置背景顏色（如果有 Sprite 組件）
        const sprite = item.getComponent(Sprite);
        if (sprite) {
            const colorType = ModelManager.instance.historyModel.getColorType(record.crashPoint);
            sprite.color = this.COLORS[colorType] || this.COLORS['yellow'];
        }

        // 插入到最前面
        this.historyContainer.insertChild(item, 0);

        // 限制數量
        while (this.historyContainer.children.length > this.maxDisplayCount) {
            const lastChild = this.historyContainer.children[this.historyContainer.children.length - 1];
            lastChild.destroy();
        }
    }

    private _clearItems(): void {
        if (this.historyContainer) {
            this.historyContainer.removeAllChildren();
        }
    }

    /**
     * 刷新顯示（從模型重新加載）
     */
    public refreshDisplay(): void {
        this._clearItems();
        const records = ModelManager.instance.historyModel.recentRecords;

        // 反向添加，使最新的在前面
        for (let i = records.length - 1; i >= 0; i--) {
            this._addHistoryItem(records[i]);
        }
    }

    /**
     * 獲取顏色
     */
    public getColorForCrashPoint(crashPoint: number): Color {
        const colorType = ModelManager.instance.historyModel.getColorType(crashPoint);
        return this.COLORS[colorType] || this.COLORS['yellow'];
    }
}
