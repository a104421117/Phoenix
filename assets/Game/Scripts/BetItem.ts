import { _decorator, Component, Node, Label, Button, Sprite, Color } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, gameEvents, GameEvent, BetEntry } from './GameManager';
import { BetManager } from './BetManager';

const { ccclass, property } = _decorator;

/**
 * 單筆押注項目組件（1.9優化版）
 * 用於顯示右側玩家自己的押注列表
 *
 * 1.9優化內容：
 * - 修正取出金額計算（含5%服務費）
 * - 已取出顯示含本金的取出金額（綠底黃字）
 * - 未取出爆炸顯示負數（紅字）
 * - 飛行階段未取出不可點擊（下注後）
 */
@ccclass('BetItem')
export class BetItem extends Component {
    @property(Sprite)
    coinIcon: Sprite = null;

    @property(Label)
    amountLabel: Label = null;

    @property(Button)
    cashoutButton: Button = null;

    @property(Label)
    cashoutLabel: Label = null;

    @property(Label)
    multiplierLabel: Label = null;

    @property(Node)
    checkIcon: Node = null;

    @property(Node)
    background: Node = null;

    // 顏色配置
    private readonly BG_PENDING = new Color(200, 150, 50, 255);      // 黃橙色（未取出）
    private readonly BG_SUCCESS = new Color(0, 150, 100, 255);       // 綠色（已取出）
    private readonly BG_FAILED = new Color(80, 80, 80, 255);         // 深灰色（虧損）
    private readonly TEXT_WIN = new Color(0, 255, 100);
    private readonly TEXT_LOSE = new Color(255, 80, 80);
    private readonly TEXT_NORMAL = Color.WHITE;

    private _betIndex: number = -1;
    private _bet: BetEntry = null;
    private _betManager: BetManager = null;

    onLoad() {
        gameEvents.on(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.on(GameEvent.MULTIPLIER_UPDATED, this.onMultiplierUpdated, this);
    }

    onDestroy() {
        gameEvents.off(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.off(GameEvent.MULTIPLIER_UPDATED, this.onMultiplierUpdated, this);
    }

    /**
     * 設定押注資訊
     */
    setBetInfo(index: number, bet: BetEntry, betManager: BetManager) {
        this._betIndex = index;
        this._bet = bet;
        this._betManager = betManager;

        this.updateDisplay();
    }

    /**
     * 更新顯示
     */
    updateDisplay() {
        if (!this._bet) return;

        const state = GameManager.instance?.gameState;
        const currentMultiplier = GameManager.instance?.currentMultiplier || 1;

        // 金額顯示
        if (this.amountLabel) {
            if (this._bet.cashedOut) {
                // 已取出 - 顯示獲利金額
                const winnings = this._bet.profit + this._bet.amount;
                this.amountLabel.string = '+' + this.formatNumber(winnings);
                this.amountLabel.color = this.TEXT_WIN;
            } else if (this._bet.profit < 0) {
                // 虧損
                this.amountLabel.string = this.formatNumber(this._bet.profit);
                this.amountLabel.color = this.TEXT_LOSE;
            } else if (state === GameConfig.STATE_FLYING) {
                // 飛行中 - 顯示當前可取出金額
                const potentialWin = GameConfig.calculateWinnings(this._bet.amount, currentMultiplier);
                this.amountLabel.string = this.formatNumber(potentialWin);
                this.amountLabel.color = this.TEXT_NORMAL;
            } else {
                // 押注金額
                this.amountLabel.string = this.formatNumber(this._bet.amount);
                this.amountLabel.color = this.TEXT_NORMAL;
            }
        }

        // 取出按鈕/狀態
        if (this.cashoutButton && this.cashoutLabel) {
            if (this._bet.cashedOut) {
                // 已取出
                this.cashoutButton.node.active = false;
                if (this.multiplierLabel) {
                    this.multiplierLabel.string = this._bet.cashoutMultiplier.toFixed(2) + 'x';
                    this.multiplierLabel.node.active = true;
                    this.multiplierLabel.color = this.TEXT_WIN;
                }
                if (this.checkIcon) {
                    this.checkIcon.active = true;
                }
            } else if (state === GameConfig.STATE_FLYING) {
                // 可取出
                this.cashoutButton.node.active = true;
                this.cashoutButton.interactable = true;
                this.cashoutLabel.string = '取';
                if (this.multiplierLabel) {
                    this.multiplierLabel.node.active = false;
                }
                if (this.checkIcon) {
                    this.checkIcon.active = false;
                }
            } else {
                // 等待中
                this.cashoutButton.node.active = false;
                if (this.multiplierLabel) {
                    this.multiplierLabel.node.active = false;
                }
                if (this.checkIcon) {
                    this.checkIcon.active = false;
                }
            }
        }

        // 背景顏色
        if (this.background) {
            const sprite = this.background.getComponent(Sprite);
            if (sprite) {
                if (this._bet.cashedOut) {
                    sprite.color = this.BG_SUCCESS;
                } else if (this._bet.profit < 0) {
                    sprite.color = this.BG_FAILED;
                } else {
                    sprite.color = this.BG_PENDING;
                }
            }
        }
    }

    /**
     * 點擊取出按鈕
     */
    onCashoutClick() {
        if (this._betManager && this._betIndex >= 0) {
            this._betManager.cashoutSingle(this._betIndex);
            this.updateDisplay();
        }
    }

    private onGameStateChanged(state: number) {
        this.updateDisplay();
    }

    private onMultiplierUpdated(multiplier: number) {
        // 更新顯示（用於更新潛在獲利）
        if (!this._bet?.cashedOut && GameManager.instance?.gameState === GameConfig.STATE_FLYING) {
            this.updateDisplay();
        }
    }

    private formatNumber(num: number): string {
        if (Math.abs(num) >= 10000) {
            return (num / 10000).toFixed(2) + '萬';
        }
        return num.toLocaleString();
    }
}
