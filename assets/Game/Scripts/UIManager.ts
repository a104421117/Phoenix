import { _decorator, Component, Node, Label, Button, Sprite, Color, Toggle, SpriteFrame, ProgressBar, instantiate } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, gameEvents, GameEvent, RoundHistory } from './GameManager';
import { BetManager, BetEvent } from './BetManager';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    // === 頂部 UI ===
    @property(Node)
    historyContainer: Node = null;

    @property(Node)
    historyItemPrefab: Node = null;

    // === 中央 UI ===
    @property(Label)
    stateLabel: Label = null;

    @property(Label)
    countdownLabel: Label = null;

    @property(Label)
    multiplierLabel: Label = null;

    // === 左側排行榜 ===
    @property(Node)
    rankContainer: Node = null;

    @property(Node)
    rankItemPrefab: Node = null;

    @property(Label)
    onlineCountLabel: Label = null;

    // === 右側玩家押注列表 ===
    @property(Node)
    betListContainer: Node = null;

    @property(Node)
    betItemPrefab: Node = null;

    @property(Label)
    roundProfitLabel: Label = null;

    // === 底部 UI ===
    @property(Label)
    playerNameLabel: Label = null;

    @property(Label)
    balanceLabel: Label = null;

    @property(Label)
    betAmountLabel: Label = null;

    @property(Button)
    minusButton: Button = null;

    @property(Button)
    plusButton: Button = null;

    @property(Button)
    betButton: Button = null;

    @property(Label)
    betButtonLabel: Label = null;

    @property(Toggle)
    autoCashoutToggle: Toggle = null;

    @property(Label)
    autoCashoutLabel: Label = null;

    @property(Button)
    repeatLastButton: Button = null;

    // === 彈窗 ===
    @property(Node)
    autoCashoutPopup: Node = null;

    @property(Node)
    afkPopup: Node = null;  // 【1.9新增】掛機設定彈窗

    @property(Node)
    historyPopup: Node = null;

    @property(Node)
    leaderboardPopup: Node = null;

    @property(Node)
    settingsPopup: Node = null;

    // 顏色配置
    private readonly COLORS = {
        GRAY: new Color(128, 128, 128),
        GREEN: new Color(0, 200, 0),
        BLUE: new Color(0, 150, 255),
        YELLOW: new Color(255, 200, 0),
        RED: new Color(255, 50, 50),
        WIN: new Color(0, 255, 100),
        LOSE: new Color(255, 80, 80)
    };

    private betManager: BetManager = null;

    onLoad() {
        // 監聽遊戲事件
        gameEvents.on(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.on(GameEvent.MULTIPLIER_UPDATED, this.onMultiplierUpdated, this);
        gameEvents.on(GameEvent.COUNTDOWN_UPDATED, this.onCountdownUpdated, this);
        gameEvents.on(GameEvent.HISTORY_UPDATED, this.onHistoryUpdated, this);
        gameEvents.on(GameEvent.ROUND_END, this.onRoundEnd, this);

        // 監聽押注事件
        gameEvents.on(BetEvent.BET_AMOUNT_CHANGED, this.onBetAmountChanged, this);
        gameEvents.on(BetEvent.BET_LIST_CHANGED, this.onBetListChanged, this);
        gameEvents.on(BetEvent.BALANCE_CHANGED, this.onBalanceChanged, this);
        gameEvents.on(BetEvent.AUTO_CASHOUT_CHANGED, this.onAutoCashoutChanged, this);
        gameEvents.on(BetEvent.ROUND_RESULT, this.onRoundResult, this);

        // 初始化 UI
        this.initUI();
    }

    onDestroy() {
        gameEvents.off(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.off(GameEvent.MULTIPLIER_UPDATED, this.onMultiplierUpdated, this);
        gameEvents.off(GameEvent.COUNTDOWN_UPDATED, this.onCountdownUpdated, this);
        gameEvents.off(GameEvent.HISTORY_UPDATED, this.onHistoryUpdated, this);
        gameEvents.off(GameEvent.ROUND_END, this.onRoundEnd, this);
        gameEvents.off(BetEvent.BET_AMOUNT_CHANGED, this.onBetAmountChanged, this);
        gameEvents.off(BetEvent.BET_LIST_CHANGED, this.onBetListChanged, this);
        gameEvents.off(BetEvent.BALANCE_CHANGED, this.onBalanceChanged, this);
        gameEvents.off(BetEvent.AUTO_CASHOUT_CHANGED, this.onAutoCashoutChanged, this);
        gameEvents.off(BetEvent.ROUND_RESULT, this.onRoundResult, this);
    }

    start() {
        this.betManager = GameManager.instance?.betManager;
        this.updateAllUI();
    }

    private initUI() {
        // 隱藏所有彈窗
        if (this.autoCashoutPopup) this.autoCashoutPopup.active = false;
        if (this.historyPopup) this.historyPopup.active = false;
        if (this.leaderboardPopup) this.leaderboardPopup.active = false;
        if (this.settingsPopup) this.settingsPopup.active = false;

        // 設定玩家資訊
        if (this.playerNameLabel) {
            this.playerNameLabel.string = '玩家';
        }
    }

    private updateAllUI() {
        if (!this.betManager) return;

        this.onBalanceChanged(this.betManager.balance);
        this.onBetAmountChanged(this.betManager.currentBetAmount);
        this.onAutoCashoutChanged({
            enabled: this.betManager.autoCashoutEnabled,
            multiplier: this.betManager.autoCashoutMultiplier
        });

        if (GameManager.instance) {
            this.onHistoryUpdated(GameManager.instance.history);
        }
    }

    // === 事件處理 ===

    private onGameStateChanged(state: number) {
        this.updateStateUI(state);
        this.updateBetButtonState();
        this.updateRepeatButtonState();
    }

    private onMultiplierUpdated(multiplier: number) {
        if (this.multiplierLabel) {
            this.multiplierLabel.string = multiplier.toFixed(2) + 'x';

            // 根據倍數設定顏色
            const colorType = GameConfig.getMultiplierColorType(multiplier);
            this.multiplierLabel.color = this.COLORS[colorType];
        }

        // 更新押注按鈕顯示可取出金額
        this.updateCashoutButtonAmount();
    }

    private onCountdownUpdated(countdown: number) {
        if (this.countdownLabel) {
            this.countdownLabel.string = Math.ceil(countdown) + 's';
        }
    }

    private onHistoryUpdated(history: RoundHistory[]) {
        this.updateHistoryDisplay(history);
    }

    private onRoundEnd(crashMultiplier: number) {
        // 更新顯示
        if (this.stateLabel) {
            this.stateLabel.string = '開局倒數';
        }
    }

    private onBetAmountChanged(amount: number) {
        if (this.betAmountLabel) {
            this.betAmountLabel.string = this.formatNumber(amount);
        }
    }

    private onBetListChanged(bets: any[]) {
        this.updateBetList(bets);
        this.updateBetButtonState();
    }

    private onBalanceChanged(balance: number) {
        if (this.balanceLabel) {
            this.balanceLabel.string = this.formatNumber(balance);
        }
    }

    private onAutoCashoutChanged(data: { enabled: boolean; multiplier: number }) {
        if (this.autoCashoutToggle) {
            this.autoCashoutToggle.isChecked = data.enabled;
        }
        if (this.autoCashoutLabel) {
            this.autoCashoutLabel.string = data.multiplier.toFixed(2) + 'x';
        }
    }

    private onRoundResult(result: any) {
        if (this.roundProfitLabel) {
            const profit = result.totalProfit;
            if (profit > 0) {
                this.roundProfitLabel.string = '本局+' + this.formatNumber(profit);
                this.roundProfitLabel.color = this.COLORS.WIN;
            } else if (profit < 0) {
                this.roundProfitLabel.string = '本局' + this.formatNumber(profit);
                this.roundProfitLabel.color = this.COLORS.LOSE;
            } else {
                this.roundProfitLabel.string = '';
            }
        }
    }

    // === UI 更新方法 ===

    private updateStateUI(state: number) {
        if (!this.stateLabel) return;

        switch (state) {
            case GameConfig.STATE_BETTING:
                this.stateLabel.string = '押注倒數';
                if (this.multiplierLabel) {
                    this.multiplierLabel.string = '';
                }
                if (this.roundProfitLabel) {
                    this.roundProfitLabel.string = '';
                }
                break;
            case GameConfig.STATE_FLYING:
                this.stateLabel.string = '當前倍數';
                break;
            case GameConfig.STATE_CRASHED:
                this.stateLabel.string = '開局倒數';
                break;
        }
    }

    private updateBetButtonState() {
        if (!this.betButton || !this.betButtonLabel) return;

        const state = GameManager.instance?.gameState;
        const bets = this.betManager?.bets || [];

        if (state === GameConfig.STATE_BETTING) {
            // 押注階段
            if (bets.length >= GameConfig.MAX_BET_COUNT) {
                this.betButtonLabel.string = '已押完';
                this.betButton.interactable = false;
            } else {
                this.betButtonLabel.string = '押注';
                this.betButton.interactable = true;
            }
        } else if (state === GameConfig.STATE_FLYING) {
            // 飛行階段 - 顯示全部取出
            const activeBets = bets.filter(b => !b.cashedOut).length;
            if (activeBets > 0) {
                this.betButtonLabel.string = '全部取出';
                this.betButton.interactable = true;
            } else {
                this.betButtonLabel.string = '已取出';
                this.betButton.interactable = false;
            }
        } else {
            this.betButtonLabel.string = '等待中';
            this.betButton.interactable = false;
        }
    }

    private updateCashoutButtonAmount() {
        if (!this.betManager || !this.betButtonLabel) return;

        const state = GameManager.instance?.gameState;
        if (state !== GameConfig.STATE_FLYING) return;

        const totalAmount = this.betManager.getTotalCashoutAmount();
        if (totalAmount > 0) {
            this.betButtonLabel.string = this.formatNumber(totalAmount) + '\n全部取出';
        }
    }

    private updateRepeatButtonState() {
        if (!this.repeatLastButton) return;

        const canRepeat = this.betManager?.hasLastRoundBets &&
                         GameManager.instance?.gameState === GameConfig.STATE_BETTING;
        this.repeatLastButton.node.active = canRepeat;
    }

    private updateHistoryDisplay(history: RoundHistory[]) {
        if (!this.historyContainer || !this.historyItemPrefab) return;

        // 清空現有項目
        this.historyContainer.removeAllChildren();

        // 只顯示前8局
        const displayHistory = history.slice(0, GameConfig.MAX_HISTORY_DISPLAY);

        for (const record of displayHistory) {
            const item = this.createHistoryItem(record);
            if (item) {
                this.historyContainer.addChild(item);
            }
        }
    }

    private createHistoryItem(record: RoundHistory): Node {
        if (!this.historyItemPrefab) return null;

        const item = instantiate(this.historyItemPrefab);

        const label = item.getComponentInChildren(Label);
        if (label) {
            label.string = record.crashMultiplier.toFixed(2);
            const colorType = GameConfig.getMultiplierColorType(record.crashMultiplier);
            label.color = this.COLORS[colorType];
        }

        item.active = true;
        return item;
    }

    private updateBetList(bets: any[]) {
        if (!this.betListContainer || !this.betItemPrefab) return;

        // 清空現有項目
        this.betListContainer.removeAllChildren();

        for (let i = 0; i < bets.length; i++) {
            const bet = bets[i];
            const item = this.createBetItem(bet, i);
            if (item) {
                this.betListContainer.addChild(item);
            }
        }
    }

    private createBetItem(bet: any, index: number): Node {
        if (!this.betItemPrefab) return null;

        const item = instantiate(this.betItemPrefab);

        // 這裡需要配合 BetItem 組件來設定顯示
        // 簡化版本：只更新 Label
        const amountLabel = item.getChildByName('AmountLabel')?.getComponent(Label);
        const statusLabel = item.getChildByName('StatusLabel')?.getComponent(Label);
        const multiplierLabel = item.getChildByName('MultiplierLabel')?.getComponent(Label);

        if (amountLabel) {
            if (bet.cashedOut) {
                amountLabel.string = '+' + this.formatNumber(bet.profit + bet.amount);
                amountLabel.color = this.COLORS.WIN;
            } else if (bet.profit < 0) {
                amountLabel.string = this.formatNumber(bet.profit);
                amountLabel.color = this.COLORS.LOSE;
            } else {
                amountLabel.string = this.formatNumber(bet.amount);
                amountLabel.color = Color.WHITE;
            }
        }

        if (statusLabel) {
            if (bet.cashedOut) {
                statusLabel.string = bet.cashoutMultiplier.toFixed(2) + 'x';
                statusLabel.color = this.COLORS.WIN;
            } else if (GameManager.instance?.gameState === GameConfig.STATE_FLYING) {
                statusLabel.string = '取';
            } else {
                statusLabel.string = '';
            }
        }

        item.active = true;
        return item;
    }

    // === 按鈕事件 ===

    onMinusClick() {
        this.betManager?.decreaseBetAmount();
    }

    onPlusClick() {
        this.betManager?.increaseBetAmount();
    }

    onBetClick() {
        const state = GameManager.instance?.gameState;

        if (state === GameConfig.STATE_BETTING) {
            this.betManager?.placeBet();
        } else if (state === GameConfig.STATE_FLYING) {
            this.betManager?.cashoutAll();
        }
    }

    onRepeatLastClick() {
        this.betManager?.repeatLastBets();
    }

    onAutoCashoutToggle(toggle: Toggle) {
        this.betManager?.setAutoCashout(toggle.isChecked);
    }

    onAutoCashoutLabelClick() {
        if (this.autoCashoutPopup) {
            this.autoCashoutPopup.active = true;
        }
    }

    onHistoryClick() {
        if (this.historyPopup) {
            this.historyPopup.active = true;
        }
    }

    onLeaderboardClick() {
        if (this.leaderboardPopup) {
            this.leaderboardPopup.active = true;
        }
    }

    onSettingsClick() {
        if (this.settingsPopup) {
            this.settingsPopup.active = true;
        }
    }

    // 【1.9新增】掛機功能按鈕
    onAFKClick() {
        if (this.afkPopup) {
            this.afkPopup.active = true;
        }
    }

    onClosePopup(popup: Node) {
        if (popup) {
            popup.active = false;
        }
    }

    // === 工具方法 ===

    private formatNumber(num: number): string {
        if (Math.abs(num) >= 10000) {
            return (num / 10000).toFixed(2) + '萬';
        }
        return num.toLocaleString();
    }
}
