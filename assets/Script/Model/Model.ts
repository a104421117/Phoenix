import { _decorator, CCBoolean, CCFloat, CCInteger, CCString, EPSILON } from 'cc';

const { ccclass, property } = _decorator;

export namespace GameModel {
    @ccclass('BetModel')
    export class BetModel {
        @property({ type: CCInteger, readonly: true, tooltip: "選擇注額" }) public bet: number = 1000;
        @property({ type: Array(CCInteger), readonly: true, tooltip: "增減注額" }) public betArr: BetArr = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
        @property({ type: Array(CCInteger), readonly: true, tooltip: "注額選項" }) public rateArr: RateArr = [1000, 2500, 5000, 10000];
        @property({ type: CCInteger, readonly: true, tooltip: "押注上限" }) public betCountMax: number = 5;
        get Less() {
            const filter = this.betArr.filter(e => e < this.bet);
            const bet = filter.length > 0 ? Math.max(...filter) : this.bet;
            this.bet = bet;
            return bet;
        }
        get Plus() {
            const filter = this.betArr.filter(e => e > this.bet);
            const bet = filter.length > 0 ? Math.min(...filter) : this.bet;
            this.bet = bet;
            return bet;
        }
        changeBetThousandth(num: number): string {
            this.bet = num;
            return getThousandth(this.bet);
        }

    }
    @ccclass('MultipleModel')
    export class MultipleModel {
        @property({ type: CCFloat, readonly: true, tooltip: "增長倍數" }) public runMultiple: number = 0.00;
        @property({ type: CCFloat, readonly: true, tooltip: "最大倍數" }) public maxMultiple: number = 5.00;
    }
    @ccclass('RankModel')
    export class RankModel {
        @property({ type: CCInteger, readonly: true, tooltip: "排行榜數量" }) public rankCount: number = 6;
    }
    export function getThousandth(num: number): string {
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    /**
     * 四捨五入
     * @param num 數字
     * @param index 小數位
     * @returns 
     */
    export function getRoundToStr(num: number, decimalPlaces: number = 0): string {
        const numStr = num.toFixed(decimalPlaces);
        return numStr;
        // return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    /**
     * 無條件捨去
     * @param num 數字
     * @param index 小數位
     * @returns 
     */
    export function getFloor(num: number, decimalPlaces: number = 0): number {
        const factor = Math.pow(10, decimalPlaces);
        const number = Math.floor(num * factor) / factor;
        return number;
    }

    export function formatNum(num: number, decimalPlaces: number = 0): string {
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';

        if (absNum >= 100000000) {
            // 億
            return sign + GameModel.getFloor(absNum / 100000000, decimalPlaces) + 'e';
        } else if (absNum >= 10000) {
            // 萬
            return sign + GameModel.getFloor(absNum / 10000, decimalPlaces) + 'w';
        } else {
            // 原數字（加千分位）
            return sign + absNum.toLocaleString();
        }
    }

    function getFormatNum(num: number): string {
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';

        if (absNum >= 100000) {
            // 十萬
            return sign + getThousandth(absNum / 100000) + 'K';
        } else if (absNum < 10) {
            // 個位數
            return sign + getFloor(absNum, 2) + 'w';
        } else {
            // 原數字（加千分位）
            return sign + getThousandth(absNum);
        }
    }
}

@ccclass('StateModel')
export class StateModel {
    @property({ type: CCInteger, readonly: true, group: { name: "Wager" }, tooltip: "下注時間" }) public readonly wagerTime: number = 12;
    @property({ type: CCInteger, readonly: true, group: { name: "Wager" }, tooltip: "下注次數" }) public readonly wagerCount: number = 0;

    @property({ type: CCInteger, readonly: true, group: { name: "Run" }, tooltip: "結束時間" }) public readonly runTime: number = 10;
    @property({ type: CCFloat, readonly: true, group: { name: "Run" }, tooltip: "更新速率" }) public readonly runDeltaTime: number = 0.1;

    @property({ type: CCInteger, readonly: true, group: { name: "Dead" }, tooltip: "等待下局時間" }) public readonly deadTime: number = 5;
}

@ccclass('SetModel')
export class SetModel {
    music: number;
    sound: number;
}



export type BetArr = [number, number, number, number, number, number, number, number, number, number];
export type RateArr = number[];
// export type RateArr = [number, number, number, number];

