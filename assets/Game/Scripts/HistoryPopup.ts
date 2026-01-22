import { _decorator, Component, Node, Label, Color, Prefab, instantiate } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, RoundHistory } from './GameManager';

const { ccclass, property } = _decorator;

/**
 * 歷史記錄彈窗
 * 顯示最近100局統計結果
 */
@ccclass('HistoryPopup')
export class HistoryPopup extends Component {
    @property(Node)
    historyGrid: Node = null;

    @property(Node)
    historyItemPrefab: Node = null;

    @property(Label)
    historyHighestLabel: Label = null;

    @property(Label)
    todayHighestLabel: Label = null;

    // 統計標籤
    @property(Label)
    stat0to1Label: Label = null;

    @property(Label)
    stat1to2Label: Label = null;

    @property(Label)
    stat2to5Label: Label = null;

    @property(Label)
    stat5to20Label: Label = null;

    @property(Label)
    stat20to1000Label: Label = null;

    // 顏色配置
    private readonly COLORS = {
        GRAY: new Color(128, 128, 128),
        GREEN: new Color(0, 200, 0),
        BLUE: new Color(0, 150, 255),
        YELLOW: new Color(255, 200, 0),
        RED: new Color(255, 50, 50)
    };

    onEnable() {
        this.updateDisplay();
    }

    /**
     * 更新顯示
     */
    private updateDisplay() {
        const gameManager = GameManager.instance;
        if (!gameManager) return;

        const history = gameManager.history;

        // 更新最高倍數
        if (this.historyHighestLabel) {
            this.historyHighestLabel.string = gameManager.historyHighest.toFixed(2) + 'x';
        }
        if (this.todayHighestLabel) {
            this.todayHighestLabel.string = gameManager.todayHighest.toFixed(2) + 'x';
        }

        // 計算統計
        const stats = {
            '0-1': 0,
            '1.01-2': 0,
            '2.01-5': 0,
            '5.01-20': 0,
            '20.01-1000': 0
        };

        for (const record of history) {
            const mult = record.crashMultiplier;
            if (mult <= 1) stats['0-1']++;
            else if (mult <= 2) stats['1.01-2']++;
            else if (mult <= 5) stats['2.01-5']++;
            else if (mult <= 20) stats['5.01-20']++;
            else stats['20.01-1000']++;
        }

        // 更新統計標籤
        if (this.stat0to1Label) this.stat0to1Label.string = stats['0-1'] + '次';
        if (this.stat1to2Label) this.stat1to2Label.string = stats['1.01-2'] + '次';
        if (this.stat2to5Label) this.stat2to5Label.string = stats['2.01-5'] + '次';
        if (this.stat5to20Label) this.stat5to20Label.string = stats['5.01-20'] + '次';
        if (this.stat20to1000Label) this.stat20to1000Label.string = stats['20.01-1000'] + '次';

        // 更新歷史列表
        this.updateHistoryGrid(history);
    }

    /**
     * 更新歷史記錄網格
     */
    private updateHistoryGrid(history: RoundHistory[]) {
        if (!this.historyGrid || !this.historyItemPrefab) return;

        // 清空現有項目
        this.historyGrid.removeAllChildren();

        // 顯示最近100局
        const displayHistory = history.slice(0, GameConfig.MAX_HISTORY_RECORD);

        for (let i = 0; i < displayHistory.length; i++) {
            const record = displayHistory[i];
            const item = this.createHistoryItem(i + 1, record);
            if (item) {
                this.historyGrid.addChild(item);
            }
        }
    }

    /**
     * 創建歷史項目
     */
    private createHistoryItem(roundNum: number, record: RoundHistory): Node {
        if (!this.historyItemPrefab) return null;

        const item = this.historyItemPrefab.clone ?
                     this.historyItemPrefab.clone() :
                     new Node('HistoryItem');

        // 設定局數
        const roundLabel = item.getChildByName('RoundLabel')?.getComponent(Label);
        if (roundLabel) {
            roundLabel.string = roundNum.toString();
        }

        // 設定倍數
        const multiplierLabel = item.getChildByName('MultiplierLabel')?.getComponent(Label);
        if (multiplierLabel) {
            multiplierLabel.string = record.crashMultiplier.toFixed(2);

            // 根據倍數設定顏色
            const colorType = GameConfig.getMultiplierColorType(record.crashMultiplier);
            multiplierLabel.color = this.COLORS[colorType];
        }

        item.active = true;
        return item;
    }

    /**
     * 關閉彈窗
     */
    onCloseClick() {
        this.node.active = false;
    }

    /**
     * 點擊背景關閉
     */
    onBackgroundClick() {
        this.node.active = false;
    }
}
