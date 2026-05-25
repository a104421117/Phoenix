import { _decorator, Component, Label, Node, Prefab, instantiate } from 'cc';
import { NodeSwitcher } from '../../Game.Client.Common/NodeSwitcher';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { type CrashLeaderboardItemContract } from '../Model/WebSocketManager';
const { ccclass, property } = _decorator;

@ccclass('LeaderboardItem')
export class LeaderboardItem extends Component {
    /** 欄位設定。 */
    @property({ type: Label })
    private rankLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private playerIdLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private totalBetLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private profitLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private crashedProfitLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private multiplierLabel: Label = null;

    /** 欄位設定。 */
    @property({ type: NodeSwitcher })
    private rankSwitcher: NodeSwitcher = null;
    /** Betting(0) totalBet / Running(1) profit+multiplier / Crashed(2) profit。 */
    @property({ type: NodeSwitcher, tooltip: 'Betting(0) totalBet / Running(1) profit+multiplier / Crashed(2) profit' })
    private infoSwitcher: NodeSwitcher = null;

    /** betStatus 的 Prefab（需掛載 NodeSwitcher）。 */
    @property({ type: Prefab, tooltip: 'betStatus 的 Prefab（需掛載 NodeSwitcher）' })
    private betStatusPrefab: Prefab = null;
    /** betStatus Prefab 的父節點。 */
    @property({ type: Node, tooltip: 'betStatus Prefab 的父節點' })
    private betStatusContainer: Node = null;

    /** generatedStatusNodes 欄位。 */
    private generatedStatusNodes: Node[] = [];
    /** statusSwitchers 欄位。 */
    private statusSwitchers: NodeSwitcher[] = [];

    /** 切換 infoSwitcher 顯示狀態 */
    public switchInfo(index: number) {
        this.infoSwitcher?.switch(index);
    }

    /** 更新倍數顯示 */
    public setMultiplier(multiplier: number | null | undefined) {
        if (typeof multiplier === 'number' && Number.isFinite(multiplier)) {
            this.multiplierLabel.string = `${BaseModel.getFloorStr(multiplier, 2)}x`;
            return;
        }
        this.multiplierLabel.string = '';
    }

    /** 依 maxBetsPerPlayer 生成 betStatus 物件 */
    public buildStatusSlots(count: number) {
        this.clearStatusNodes();
        if (!this.betStatusPrefab || !this.betStatusContainer || count <= 0) return;

        for (let i = 0; i < count; i++) {
            const node = instantiate(this.betStatusPrefab);
            node.name = `BetStatus_${i}`;
            const switcher = node.getComponent(NodeSwitcher);
            this.betStatusContainer.addChild(node);
            this.generatedStatusNodes.push(node);
            this.statusSwitchers.push(switcher);
        }
    }

    /** 套用 LeaderboardItem 資料 */
    public init(item: CrashLeaderboardItemContract) {
        this.rankLabel.string = `${item.rank}`;
        this.rankSwitcher?.switch(item.rank % 2 === 0 ? 1 : 0);
        this.playerIdLabel.string = item.playerId;
        // SDK wire type：totalBet / profit 是 MoneyDecimal 字串，View 端 Number() 後再 format
        this.totalBetLabel.string = BaseModel.getFloorStr(Number(item.totalBet), 2);
        const profitStr = BaseModel.getFloorStr(Number(item.profit), 2);
        this.profitLabel.string = profitStr;
        this.crashedProfitLabel.string = profitStr;
        this.setMultiplier(item.cashoutMultiplier);

        for (let i = 0; i < this.statusSwitchers.length; i++) {
            const switcher = this.statusSwitchers[i];
            if (!switcher) continue;
            if (i < item.betStatuses.length) {
                this.generatedStatusNodes[i].active = true;
                switcher.switch(item.betStatuses[i]);
            } else {
                this.generatedStatusNodes[i].active = false;
            }
        }

        this.node.active = true;
    }

    /** 重置為隱藏狀態 */
    public reset() {
        this.node.active = false;
    }

    /** clearStatusNodes。 */
    private clearStatusNodes() {
        this.generatedStatusNodes.forEach((node) => node?.destroy());
        this.generatedStatusNodes.length = 0;
        this.statusSwitchers.length = 0;
    }

    /** onDestroy。 */
    protected onDestroy(): void {
        this.clearStatusNodes();
    }
}
