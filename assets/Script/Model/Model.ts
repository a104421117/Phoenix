import { _decorator, CCBoolean, CCFloat, CCInteger, CCString } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('TakeOut')
class TakeOut {
    @property({ type: CCInteger, readonly: true, tooltip: "該注注額" }) bet: number = 0;
    @property({ type: CCFloat, readonly: true, tooltip: "倍率" }) multiple: number = 0;
    @property({ type: CCBoolean, readonly: true, tooltip: "是否取出" }) isTokeOut: boolean = false;
    // @property({ type: CCBoolean, readonly: true, tooltip: "是否結束" }) isDead: boolean = false;
    get TakeOut() {
        if (this.isTokeOut === false) {
            return this.bet * this.multiple;
        }
    }
    reset(isBetReset: boolean) {
        if (isBetReset === true) {
            this.bet = 0;
        }
        this.multiple = 0;
        this.isTokeOut = false;
    }
    select() {
        this.isTokeOut = true;
        console.log("select");
    }
    /**
     *
     */
    constructor() {
        this.bet = 0;
        this.multiple = 0;
        this.isTokeOut = false;
    }
}

export namespace GameModel {
    @ccclass('BetModel')
    export class BetModel {
        @property({ type: CCInteger, readonly: true, tooltip: "選擇注額" }) public bet: number = 1000;
        @property({ type: Array(Object(TakeOut)), readonly: true, tooltip: "取出集合" }) public takeOutArr: TakeOutArr = [new TakeOut(), new TakeOut(), new TakeOut(), new TakeOut(), new TakeOut()];
        @property({ type: CCInteger, readonly: true, tooltip: "取出" }) public takeOutIndex: number = 0;

        @property({ type: Array(CCInteger), readonly: true, tooltip: "增減注額" }) public betArr: BetArr = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
        @property({ type: Array(CCInteger), readonly: true, tooltip: "注額選項" }) public rateArr: RateArr = [1000, 2500, 5000, 10000];
        @property({ type: CCInteger, readonly: true, tooltip: "押注次數" }) public betCount: number = 0;
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
        setTakeOut(): number {
            const index = this.takeOutIndex;
            if (index < this.takeOutArr.length) {
                this.takeOutArr[index].bet = this.bet;
                this.takeOutIndex++;
            }
            return index;
        }
        resetTakeOut(isBetReset: boolean) {
            this.takeOutArr.forEach((takeOut) => {
                takeOut.reset(isBetReset);
            });
            this.takeOutIndex = 0;
        }
    }
    @ccclass('MultipleModel')
    export class MultipleModel {
        @property({ type: CCFloat, readonly: true, tooltip: "增長倍數" }) public runMultiple: number = 0.00;
        @property({ type: CCFloat, readonly: true, tooltip: "最大倍數" }) public maxMultiple: number = 5.00;
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
    export function getRoundToStr(num: number, index: number = 0): string {
        const numStr = num.toFixed(index);
        return numStr;
        // return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}

@ccclass('StateModel')
export class StateModel {
    @property({ type: CCInteger, readonly: true, group: { name: "Wager" }, tooltip: "下注時間" }) public readonly wagerTime: number = 12;
    @property({ type: CCInteger, readonly: true, group: { name: "Wager" }, tooltip: "下注次數" }) public readonly wagerCount: number = 0;

    @property({ type: CCInteger, readonly: true, group: { name: "Run" }, tooltip: "結束時間" }) public readonly runTime: number = 10;
    @property({ type: CCFloat, readonly: true, group: { name: "Run" }, tooltip: "更新速率" }) public readonly runDeltaTime: number = 1.0;

    @property({ type: CCInteger, readonly: true, group: { name: "Dead" }, tooltip: "等待下局時間" }) public readonly deadTime: number = 5;
}

@ccclass('SetModel')
export class SetModel {
    music: number;
    sound: number;
}



export type TakeOutArr = [TakeOut, TakeOut, TakeOut, TakeOut, TakeOut];
export type BetArr = [number, number, number, number, number, number, number, number, number, number];
export type RateArr = [number, number, number, number];
