import { _decorator, Component, Label, Node, Slider, Toggle } from 'cc';
import { NumObj } from '../ModelView/NumObj';
import { getInstance, Manager } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { BetArr, GameModel } from '../Model/Model';
import { TakeOutManager } from './TakeOutManager';
const { ccclass, property } = _decorator;

@ccclass('AutoManager')
export class AutoManager extends Manager {
    @property({ type: NumObj }) private betCountNumObj: NumObj;
    @property({ type: NumObj }) private betNumObj: NumObj;
    @property({ type: NumObj }) private totalNumObj: NumObj;

    @property({ type: NumObj }) private runCountNumObj: NumObj;

    @property({ type: Slider }) private cashOutSlider: Slider;
    @property({ type: Label }) private cashOutLabel: Label;

    @property({ type: Toggle }) private autoToggle: Toggle = null;

    private cashOutArr: number[] = [1, 1.5, 2.5, 5.5, 9.5, 999];
    private cashOutNum: number = 0;
    private runCount: number = 0;

    public minusRunCount() {
        this.runCount--;
        if (this.IsAuto === false) {
            this.autoToggle.isChecked = false;
        }
    }

    public get CashOutNum() {
        const value = this.IsAuto === true ? this.cashOutNum : Infinity;
        return value;
    }

    public get IsAuto() {
        return this.runCount > 0;
    }
    start() {
        const betCountMax = getInstance(ModelManager).BetModel.betCountMax;
        const betCountArr = this.getBetCountArr(betCountMax);
        const betArr = getInstance(ModelManager).BetModel.betArr;
        const totalObj = this.getTotalArr(betCountArr, betArr);

        this.betCountNumObj.init(betCountArr);
        this.betCountNumObj.node.on("minus", this.change.bind(this, totalObj.totalArrx), this);
        this.betCountNumObj.node.on("plus", this.change.bind(this, totalObj.totalArrx), this);

        this.betNumObj.init(betArr);
        this.betNumObj.node.on("minus", this.change.bind(this, totalObj.totalArrx), this);
        this.betNumObj.node.on("plus", this.change.bind(this, totalObj.totalArrx), this);

        this.totalNumObj.init(totalObj.totalArr);
        this.totalNumObj.node.on("minus", this.changeTotal.bind(this, totalObj.totalArrx), this);
        this.totalNumObj.node.on("plus", this.changeTotal.bind(this, totalObj.totalArrx), this);

        const runCount = [2, 3, 5, 10, 50, 100];
        this.runCountNumObj.init(runCount);

        this.cashOutSlider.node.on("slide", this.changeCashOut.bind(this), this);
        this.cashOutSlider.node.emit("slide", this.cashOutSlider);

        this.autoToggle.node.on("toggle", this.changeAuto.bind(this), this);
    }

    update(deltaTime: number) {

    }

    private changeAuto(self: Toggle) {
        if (self.isChecked === true) {
            this.runCount = this.runCountNumObj.Num;
            const autoData = this.getAutoData();
            getInstance(TakeOutManager).autoTakeOut(autoData.bet, autoData.betCount);
        } else {
            this.runCount = 0;
        }
    }

    private getBetCountArr(betCountMax: number = getInstance(ModelManager).BetModel.betCountMax): number[] {
        let betCountArr: number[] = [];
        for (let i = 0; i < betCountMax; i++) {
            betCountArr.push(i + 1);
        }
        return betCountArr;
    }

    private getTotalArr(betCountArr: number[], betArr: BetArr) {
        let totalArr: number[] = [];
        let totalArrx: TotalArrx = [];
        betCountArr.forEach((betCount: number, betCountIndex: number) => {
            betArr.forEach((bet: number, betIndex: number) => {
                const total = betCount * bet;
                let obj: Totalx = {
                    betCountIndex,
                    betIndex
                };
                totalArrx.push(obj);
                totalArr.push(total);
            });
        });
        totalArrx.sort((a, b) => {
            return betCountArr[a.betCountIndex] * betArr[a.betIndex] - betCountArr[b.betCountIndex] * betArr[b.betIndex];
        });
        totalArr.sort((a, b) => { return a - b; });

        let out = {
            totalArr,
            totalArrx
        }
        return out;
    }

    private change(totalArrx: TotalArrx, self: NumObj, num: number, index: number) {
        const totalIndex = totalArrx.findIndex((e) =>
            e.betCountIndex === this.betCountNumObj.index &&
            e.betIndex === this.betNumObj.index
        );
        const betCountIndex = totalArrx[totalIndex].betCountIndex;
        const betIndex = totalArrx[totalIndex].betIndex;

        this.betCountNumObj.change(betCountIndex);
        this.betNumObj.change(betIndex);
        this.totalNumObj.change(totalIndex);
    }

    private changeTotal(totalArrx: TotalArrx, self: NumObj, bet: number, index: number) {
        const betCountIndex = totalArrx[index].betCountIndex;
        this.betCountNumObj.change(betCountIndex);

        const betIndex = totalArrx[index].betIndex;
        this.betNumObj.change(betIndex);
    }

    private changeCashOut(self: Slider) {
        this.cashOutNum = this.progressToValue(self.progress, this.cashOutArr);
        this.cashOutLabel.string = this.cashOutNum + "x";
    }

    private progressToValue(progress: number, arr: number[]): number {
        const segments = arr.length - 1;  // 4

        const scaled = progress * segments;
        const index = Math.floor(scaled);
        const t = scaled - index;

        // 確保 index 不超出範圍
        if (index >= segments) {
            return arr[arr.length - 1];
        }

        const start = arr[index];
        const end = arr[index + 1];
        const num = GameModel.getFloor(start + (end - start) * t, 2);
        return num;
    }

    public getAutoData() {
        const autoData = {
            betCount: this.betCountNumObj.Num,
            bet: this.betNumObj.Num,
        };
        return autoData;
    }
}

type Totalx = { betCountIndex: number; betIndex: number; };
type TotalArrx = Totalx[];