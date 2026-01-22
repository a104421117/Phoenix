import { _decorator, Component, Node, Label, Sprite, Color, SpriteFrame, tween, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
import { BetEntry } from './GameManager';

const { ccclass, property } = _decorator;

/**
 * 玩家排行榜項目組件（1.9重新設計）
 *
 * 用於顯示左側投注額前6高玩家
 * 包含：排名、頭像、狀態燈號、金額、倍數
 *
 * 1.9優化內容：
 * - 新增狀態燈號（最多5個，對應5筆押注）
 * - 金額數字跳動顯示
 * - 根據狀態變色（深色/綠色/紅字）
 * - 取出時顯示倍數
 */
@ccclass('PlayerRankItem')
export class PlayerRankItem extends Component {
    @property(Label)
    rankLabel: Label = null;

    @property(Sprite)
    avatarSprite: Sprite = null;

    @property(Label)
    amountLabel: Label = null;

    @property(Label)
    multiplierLabel: Label = null;

    @property(Node)
    background: Node = null;

    // 【1.9新增】狀態燈號容器（包含5個小圓點）
    @property(Node)
    statusLightsContainer: Node = null;

    @property([Node])
    statusLights: Node[] = [];

    // 顏色配置
    private readonly BG_NORMAL = new Color(40, 55, 70, 230);      // 深色底
    private readonly BG_WIN = new Color(30, 100, 50, 230);        // 綠色底
    private readonly TEXT_YELLOW = new Color(255, 215, 0);        // 黃字（獲利）
    private readonly TEXT_RED = new Color(255, 80, 80);           // 紅字（虧損）
    private readonly TEXT_WHITE = Color.WHITE;                     // 白字（正常）
    private readonly RANK_GOLD = new Color(255, 215, 0);          // 排名數字-金色

    private readonly LIGHT_OFF = new Color(80, 80, 80);           // 燈號-灰色
    private readonly LIGHT_GREEN = new Color(50, 255, 100);       // 燈號-綠色
    private readonly LIGHT_RED = new Color(255, 80, 80);          // 燈號-紅色

    private _playerId: string = '';
    private _bets: BetEntry[] = [];
    private _totalBet: number = 0;
    private _isRoundEnded: boolean = false;

    // 動畫相關
    private _displayAmount: number = 0;
    private _targetAmount: number = 0;
    private _isAnimating: boolean = false;

    /**
     * 設定玩家資訊
     */
    setPlayerInfo(
        rank: number,
        playerId: string,
        playerName: string,
        avatar: SpriteFrame | null,
        totalBet: number,
        bets: BetEntry[]
    ) {
        this._playerId = playerId;
        this._bets = bets;
        this._totalBet = totalBet;
        this._isRoundEnded = false;

        // 排名（金色數字）
        if (this.rankLabel) {
            this.rankLabel.string = rank.toString();
            this.rankLabel.color = this.RANK_GOLD;
            this.rankLabel.fontSize = 16;
        }

        // 頭像
        if (this.avatarSprite && avatar) {
            this.avatarSprite.spriteFrame = avatar;
        }

        // 初始化燈號
        this.initStatusLights();

        // 更新顯示
        this.updateDisplay();
    }

    /**
     * 【1.9新增】初始化狀態燈號
     */
    private initStatusLights() {
        const betCount = this._bets.length;

        for (let i = 0; i < this.statusLights.length; i++) {
            const light = this.statusLights[i];
            if (light) {
                // 只顯示對應押注數量的燈
                light.active = i < betCount;

                // 初始為灰色（未領取）
                const sprite = light.getComponent(Sprite);
                if (sprite) {
                    sprite.color = this.LIGHT_OFF;
                }
            }
        }
    }

    /**
     * 【1.9新增】更新狀態燈號
     */
    private updateStatusLights() {
        for (let i = 0; i < this._bets.length && i < this.statusLights.length; i++) {
            const bet = this._bets[i];
            const light = this.statusLights[i];

            if (light) {
                const sprite = light.getComponent(Sprite);
                if (sprite) {
                    if (bet.cashedOut) {
                        // 已取出 - 綠燈
                        sprite.color = this.LIGHT_GREEN;
                    } else if (this._isRoundEnded) {
                        // 局結束但未取出 - 紅燈
                        sprite.color = this.LIGHT_RED;
                    } else {
                        // 尚未取出 - 灰燈
                        sprite.color = this.LIGHT_OFF;
                    }
                }
            }
        }
    }

    /**
     * 更新顯示狀態
     */
    updateDisplay() {
        // 計算狀態
        let totalCashedOutAmount = 0;  // 已取出的總金額（含本金）
        let totalProfit = 0;           // 總利潤
        let allCashedOut = true;
        let anyCashedOut = false;
        let lastCashoutMultiplier = 0;
        let uncashedBetAmount = 0;     // 未取出的押注額

        for (const bet of this._bets) {
            if (bet.cashedOut) {
                // 【1.9修正】含本金的取出金額
                const cashoutAmount = GameConfig.calculateWinnings(bet.amount, bet.cashoutMultiplier);
                totalCashedOutAmount += cashoutAmount;
                totalProfit += bet.profit;
                anyCashedOut = true;
                lastCashoutMultiplier = bet.cashoutMultiplier;
            } else {
                allCashedOut = false;
                uncashedBetAmount += bet.amount;
                if (this._isRoundEnded) {
                    totalProfit -= bet.amount;
                }
            }
        }

        // 更新燈號
        this.updateStatusLights();

        // 根據狀態更新顯示
        this.updateAmountDisplay(
            anyCashedOut,
            allCashedOut,
            totalCashedOutAmount,
            totalProfit,
            uncashedBetAmount,
            lastCashoutMultiplier
        );

        // 更新背景
        this.updateBackground(anyCashedOut, totalProfit);
    }

    /**
     * 【1.9優化】更新金額顯示
     */
    private updateAmountDisplay(
        anyCashedOut: boolean,
        allCashedOut: boolean,
        totalCashedOutAmount: number,
        totalProfit: number,
        uncashedBetAmount: number,
        lastCashoutMultiplier: number
    ) {
        if (!this.amountLabel) return;

        let displayText = '';
        let textColor = this.TEXT_WHITE;

        if (this._isRoundEnded) {
            // 局結束後的顯示
            if (allCashedOut) {
                // 【1.9】各注都領完：綠底黃字，顯示總得分含本金
                displayText = '+' + this.formatNumber(totalCashedOutAmount);
                textColor = this.TEXT_YELLOW;
            } else if (anyCashedOut) {
                // 【1.9】部分領取爆炸：綠底黃字，顯示已領累計總得分
                displayText = '+' + this.formatNumber(totalCashedOutAmount);
                textColor = this.TEXT_YELLOW;
            } else {
                // 【1.9】全部未領爆炸：紅字負數
                displayText = '-' + this.formatNumber(this._totalBet);
                textColor = this.TEXT_RED;
            }
        } else {
            // 遊戲進行中的顯示
            if (anyCashedOut) {
                // 有取出：顯示當前已取出金額 + 倍數
                displayText = '+' + this.formatNumber(totalCashedOutAmount);
                textColor = this.TEXT_YELLOW;
            } else {
                // 未取出：顯示投注金額
                displayText = this.formatNumber(this._totalBet);
                textColor = this.TEXT_WHITE;
            }
        }

        // 【1.9優化】數字跳動動畫
        this.animateAmountChange(displayText, textColor);

        // 更新倍數顯示
        if (this.multiplierLabel) {
            if (anyCashedOut && lastCashoutMultiplier > 0) {
                this.multiplierLabel.string = lastCashoutMultiplier.toFixed(2) + 'x';
                this.multiplierLabel.color = this.TEXT_YELLOW;
                this.multiplierLabel.node.active = true;
            } else {
                this.multiplierLabel.node.active = false;
            }
        }
    }

    /**
     * 【1.9新增】數字跳動動畫
     */
    private animateAmountChange(text: string, color: Color) {
        if (!this.amountLabel) return;

        // 設置顏色
        this.amountLabel.color = color;

        // 簡單的縮放動畫
        const node = this.amountLabel.node;
        tween(node)
            .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
            .call(() => {
                this.amountLabel.string = text;
            })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 更新背景顏色
     */
    private updateBackground(anyCashedOut: boolean, totalProfit: number) {
        if (!this.background) return;

        const sprite = this.background.getComponent(Sprite);
        if (!sprite) return;

        if (this._isRoundEnded) {
            if (anyCashedOut) {
                // 有取出：綠色底
                sprite.color = this.BG_WIN;
            } else {
                // 全輸：深色底
                sprite.color = this.BG_NORMAL;
            }
        } else {
            if (anyCashedOut) {
                // 進行中有取出：綠色底
                sprite.color = this.BG_WIN;
            } else {
                // 正常：深色底
                sprite.color = this.BG_NORMAL;
            }
        }
    }

    /**
     * 玩家取出時的回調
     */
    onCashout(betIndex: number, multiplier: number, profit: number) {
        if (betIndex >= 0 && betIndex < this._bets.length) {
            this._bets[betIndex].cashedOut = true;
            this._bets[betIndex].cashoutMultiplier = multiplier;
            this._bets[betIndex].profit = profit;
        }
        this.updateDisplay();
    }

    /**
     * 局結束時的回調
     */
    onRoundEnd(crashMultiplier: number) {
        this._isRoundEnded = true;

        // 標記未取出的押注為虧損
        for (const bet of this._bets) {
            if (!bet.cashedOut) {
                bet.profit = -bet.amount;
            }
        }

        this.updateDisplay();
    }

    /**
     * 重置為新局
     */
    reset() {
        this._isRoundEnded = false;
        this._bets = [];
        this._totalBet = 0;
        this.initStatusLights();
    }

    private formatNumber(num: number): string {
        if (Math.abs(num) >= 10000) {
            return (num / 10000).toFixed(2) + '萬';
        }
        return num.toLocaleString();
    }
}
