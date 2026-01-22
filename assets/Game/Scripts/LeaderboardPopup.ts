import { _decorator, Component, Node, Label, Sprite, Color, SpriteFrame } from 'cc';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * 玩家盈利資訊
 */
interface PlayerProfit {
    playerId: string;
    playerName: string;
    avatar: SpriteFrame | null;
    profit: number;
}

/**
 * 盈利榜/虧損榜彈窗
 */
@ccclass('LeaderboardPopup')
export class LeaderboardPopup extends Component {
    @property(Node)
    profitTab: Node = null;

    @property(Node)
    lossTab: Node = null;

    @property(Node)
    leaderboardContainer: Node = null;

    @property(Node)
    leaderboardItemPrefab: Node = null;

    @property(Node)
    selfRankContainer: Node = null;

    @property(Label)
    selfRankLabel: Label = null;

    @property(Sprite)
    selfAvatarSprite: Sprite = null;

    @property(Label)
    selfNameLabel: Label = null;

    @property(Label)
    selfProfitLabel: Label = null;

    // 顏色配置
    private readonly COLOR_PROFIT = new Color(0, 255, 100);
    private readonly COLOR_LOSS = new Color(255, 80, 80);
    private readonly COLOR_RANK_GOLD = new Color(255, 215, 0);
    private readonly COLOR_RANK_SILVER = new Color(192, 192, 192);
    private readonly COLOR_RANK_BRONZE = new Color(205, 127, 50);

    private _showingProfit: boolean = true;
    private _mockProfitData: PlayerProfit[] = [];
    private _mockLossData: PlayerProfit[] = [];
    private _selfProfit: number = 0;

    onLoad() {
        // 生成模擬數據
        this.generateMockData();
    }

    onEnable() {
        this.updateDisplay();
    }

    /**
     * 生成模擬數據
     */
    private generateMockData() {
        const mockNames = [
            '移情別戀', '小小莎莉', '地鐵站的M血', 'Cooky', '神希®',
            '博雅股價大跌', '瘋之子', 'Yee Lam', '姜太公釣魚', '快樂小明',
            '大雄', '靜香', '胖虎', '小夫', '哆啦A夢', '野比', '出木杉', '源靜香',
            '技安', '阿福'
        ];

        // 生成盈利榜數據
        this._mockProfitData = [];
        for (let i = 0; i < 20; i++) {
            this._mockProfitData.push({
                playerId: `profit_${i}`,
                playerName: mockNames[i % mockNames.length],
                avatar: null,
                profit: Math.floor(Math.random() * 5000000) + 100000
            });
        }
        this._mockProfitData.sort((a, b) => b.profit - a.profit);

        // 生成虧損榜數據
        this._mockLossData = [];
        for (let i = 0; i < 20; i++) {
            this._mockLossData.push({
                playerId: `loss_${i}`,
                playerName: mockNames[(i + 10) % mockNames.length],
                avatar: null,
                profit: -(Math.floor(Math.random() * 3000000) + 50000)
            });
        }
        this._mockLossData.sort((a, b) => a.profit - b.profit);

        // 自己的盈利/虧損
        this._selfProfit = Math.floor(Math.random() * 200000) - 100000;
    }

    /**
     * 切換到盈利榜
     */
    onProfitTabClick() {
        this._showingProfit = true;
        this.updateTabState();
        this.updateDisplay();
    }

    /**
     * 切換到虧損榜
     */
    onLossTabClick() {
        this._showingProfit = false;
        this.updateTabState();
        this.updateDisplay();
    }

    /**
     * 更新標籤頁狀態
     */
    private updateTabState() {
        if (this.profitTab) {
            // 可以設定高亮狀態
        }
        if (this.lossTab) {
            // 可以設定高亮狀態
        }
    }

    /**
     * 更新顯示
     */
    private updateDisplay() {
        const data = this._showingProfit ? this._mockProfitData : this._mockLossData;

        this.updateLeaderboard(data);
        this.updateSelfRank(data);
    }

    /**
     * 更新排行榜列表
     */
    private updateLeaderboard(data: PlayerProfit[]) {
        if (!this.leaderboardContainer || !this.leaderboardItemPrefab) return;

        // 清空現有項目
        this.leaderboardContainer.removeAllChildren();

        // 顯示前20名
        const displayData = data.slice(0, GameConfig.MAX_LEADERBOARD);

        for (let i = 0; i < displayData.length; i++) {
            const player = displayData[i];
            const item = this.createLeaderboardItem(i + 1, player);
            if (item) {
                this.leaderboardContainer.addChild(item);
            }
        }
    }

    /**
     * 創建排行榜項目
     */
    private createLeaderboardItem(rank: number, player: PlayerProfit): Node {
        if (!this.leaderboardItemPrefab) return null;

        const item = this.leaderboardItemPrefab.clone ?
                     this.leaderboardItemPrefab.clone() :
                     new Node('LeaderboardItem');

        // 排名
        const rankLabel = item.getChildByName('RankLabel')?.getComponent(Label);
        if (rankLabel) {
            rankLabel.string = rank.toString();
            // 前三名特殊顏色
            if (rank === 1) rankLabel.color = this.COLOR_RANK_GOLD;
            else if (rank === 2) rankLabel.color = this.COLOR_RANK_SILVER;
            else if (rank === 3) rankLabel.color = this.COLOR_RANK_BRONZE;
        }

        // 頭像
        const avatarSprite = item.getChildByName('Avatar')?.getComponent(Sprite);
        if (avatarSprite && player.avatar) {
            avatarSprite.spriteFrame = player.avatar;
        }

        // 名稱
        const nameLabel = item.getChildByName('NameLabel')?.getComponent(Label);
        if (nameLabel) {
            nameLabel.string = player.playerName;
        }

        // 盈利/虧損
        const profitLabel = item.getChildByName('ProfitLabel')?.getComponent(Label);
        if (profitLabel) {
            const formatted = this.formatNumber(player.profit);
            if (player.profit >= 0) {
                profitLabel.string = '+' + formatted;
                profitLabel.color = this.COLOR_PROFIT;
            } else {
                profitLabel.string = formatted;
                profitLabel.color = this.COLOR_LOSS;
            }
        }

        item.active = true;
        return item;
    }

    /**
     * 更新自己的排名
     */
    private updateSelfRank(data: PlayerProfit[]) {
        if (!this.selfRankContainer) return;

        // 查找自己的排名
        let selfRank = -1;
        for (let i = 0; i < data.length; i++) {
            // 這裡應該用真實的玩家ID比對
            // 模擬：如果不在榜上，顯示 --
        }

        // 自己不在榜上
        if (this.selfRankLabel) {
            this.selfRankLabel.string = '--';
        }

        if (this.selfNameLabel) {
            this.selfNameLabel.string = '玩家';
        }

        if (this.selfProfitLabel) {
            const formatted = this.formatNumber(this._selfProfit);
            if (this._selfProfit >= 0) {
                this.selfProfitLabel.string = '+' + formatted;
                this.selfProfitLabel.color = this.COLOR_PROFIT;
            } else {
                this.selfProfitLabel.string = formatted;
                this.selfProfitLabel.color = this.COLOR_LOSS;
            }
        }
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

    private formatNumber(num: number): string {
        const absNum = Math.abs(num);
        if (absNum >= 10000) {
            return (num / 10000).toFixed(0) + '萬';
        }
        return num.toLocaleString();
    }
}
