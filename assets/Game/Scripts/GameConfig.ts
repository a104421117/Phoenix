/**
 * 鳳飛飛遊戲配置
 * 版本: 2.0 (整合1.9優化需求)
 */
export class GameConfig {
    // 遊戲狀態
    static readonly STATE_BETTING = 0;      // 押注階段
    static readonly STATE_FLYING = 1;       // 飛行階段
    static readonly STATE_CRASHED = 2;      // 爆炸階段
    static readonly STATE_SETTLING = 3;     // 結算階段

    // 時間配置（秒）
    static readonly BETTING_TIME = 12;      // 押注倒數時間
    static readonly SETTLE_TIME = 5;        // 結算倒數時間

    // 押注配置
    static readonly MIN_BET = 10;           // 最小押注金額
    static readonly MAX_BET = 100000;       // 最大押注金額（依限紅設定）
    static readonly MAX_BET_COUNT = 5;      // 每局最多押注次數
    static readonly BET_STEP = 10;          // 押注調整步長

    // 倍數配置
    static readonly MIN_MULTIPLIER = 0.1;   // 最低爆炸倍數
    static readonly MAX_MULTIPLIER = 1000;  // 最高爆炸倍數
    static readonly AUTO_CASHOUT_MIN = 1.01; // 自動取出最小倍數
    static readonly AUTO_CASHOUT_MAX = 1000; // 自動取出最大倍數

    // 服務費
    static readonly SERVICE_FEE_RATE = 0.05; // 服務費率 5%

    // 顯示配置
    static readonly MAX_HISTORY_DISPLAY = 8;  // 頂部顯示歷史局數
    static readonly MAX_HISTORY_RECORD = 100; // 最多記錄歷史局數
    static readonly MAX_RANK_DISPLAY = 6;     // 【1.9】左側顯示投注額前6高玩家
    static readonly MAX_LEADERBOARD = 20;     // 盈利榜最多人數（1.9已移除旺衰榜入口）

    // 【1.9新增】掛機功能配置
    static readonly AFK_MIN_BET_PER_ROUND = 10;      // 掛機每局最小押注
    static readonly AFK_MAX_BET_PER_ROUND = 100000;  // 掛機每局最大押注
    static readonly AFK_MIN_TOTAL_BET = 100;         // 掛機總額最小值
    static readonly AFK_MAX_TOTAL_BET = 10000000;    // 掛機總額最大值
    static readonly AFK_MIN_ROUNDS = 1;              // 掛機最少局數
    static readonly AFK_MAX_ROUNDS = 9999;           // 掛機最多局數

    // 【1.9新增】羽毛特效類型
    static readonly FEATHER_EFFECT = {
        LARGE: 'large',   // 玩家自己取出
        MEDIUM: 'medium', // 排行榜第1名取出
        SMALL: 'small'    // 排行榜第2~6名取出
    };

    // 【1.9新增】狀態燈號類型
    static readonly LIGHT_STATUS = {
        OFF: 'off',       // 灰色（未領取）
        GREEN: 'green',   // 綠色（成功領取）
        RED: 'red'        // 紅色（未領取爆炸）
    };

    // 倍數顏色分類
    static readonly MULTIPLIER_COLORS = {
        GRAY: { min: 0, max: 1 },         // 深灰色: 0~1
        GREEN: { min: 1.01, max: 2 },     // 綠色: 1.01~2
        BLUE: { min: 2.01, max: 5 },      // 藍色: 2.01~5
        YELLOW: { min: 5.01, max: 20 },   // 黃色: 5.01~20
        RED: { min: 20.01, max: 1000 }    // 紅色: 20.01~1000
    };

    /**
     * 獲取倍數對應的顏色類型
     */
    static getMultiplierColorType(multiplier: number): string {
        if (multiplier <= 1) return 'GRAY';
        if (multiplier <= 2) return 'GREEN';
        if (multiplier <= 5) return 'BLUE';
        if (multiplier <= 20) return 'YELLOW';
        return 'RED';
    }

    /**
     * 計算贏分（已扣除服務費）
     * 贏分 = 押注額 × 取出倍數 - 服務費（取出金額的5%）
     */
    static calculateWinnings(betAmount: number, multiplier: number): number {
        const grossWin = betAmount * multiplier;
        const serviceFee = grossWin * this.SERVICE_FEE_RATE;
        return Math.floor(grossWin - serviceFee);
    }

    /**
     * 計算淨利潤（贏分 - 本金）
     */
    static calculateProfit(betAmount: number, multiplier: number): number {
        const winnings = this.calculateWinnings(betAmount, multiplier);
        return winnings - betAmount;
    }
}