import { _decorator, Component, Label, Node, Slider } from 'cc';
import { NumObj } from '../ModelView/NumObj';
import { getInstance, Manager } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { BetArr } from '../Model/Model';
const { ccclass, property } = _decorator;

@ccclass('AutoManager')
export class AutoManager extends Manager {
    @property({ type: NumObj }) private betCountNumObj: NumObj;
    @property({ type: NumObj }) private betNumObj: NumObj;
    @property({ type: NumObj }) private totalNumObj: NumObj;

    @property({ type: Slider }) private cashOutSlider: Slider;
    @property({ type: Label }) private cashOutLabel: Label;

    private isAuto = false;
    start() {
        this.betCountNumObj.node.on("minus", this.change.bind(this), this);
        this.betCountNumObj.node.on("plus", this.change.bind(this), this);
        const betCountMax = getInstance(ModelManager).BetModel.betCountMax;
        const betCountArr = this.getBetCountArr(betCountMax);
        this.betCountNumObj.init(betCountArr);

        this.betNumObj.node.on("minus", this.change.bind(this), this);
        this.betNumObj.node.on("plus", this.change.bind(this), this);
        const betArr = getInstance(ModelManager).BetModel.betArr;
        this.betNumObj.init(betArr);

        const totalObj = this.getTotalArr(betCountArr, betArr);
        this.totalNumObj.init(totalObj.totalArr);
        this.totalNumObj.node.on("minus", this.changeTotal.bind(this, totalObj.totalArrx), this);
        this.totalNumObj.node.on("plus", this.changeTotal.bind(this, totalObj.totalArrx), this);
        // console.log(totalObj);
    }

    update(deltaTime: number) {

    }

    checkAuto() {
        if (this.isAuto === true) {

        }
    }

    getBetCountArr(betCountMax: number = getInstance(ModelManager).BetModel.betCountMax): number[] {
        let betCountArr: number[] = [];
        for (let i = 0; i < betCountMax; i++) {
            betCountArr.push(i + 1);
        }
        return betCountArr;
    }

    getTotalArr(betCountArr: number[], betArr: BetArr) {
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

    change(self: NumObj, num: number, index: number) {
        const total = this.betCountNumObj.Num * this.betNumObj.Num;
        this.totalNumObj.setNumber(total);
    }

    minusTotal(totalArrx: TotalArrx, self: NumObj, bet: number, index: number) {

    }

    plusTotal() {

    }

    changeTotal(totalArrx: TotalArrx, self: NumObj, bet: number, index: number) {
        console.log(totalArrx);
        const betCountIndex = totalArrx[index].betCountIndex;
        this.betCountNumObj.change(betCountIndex);
        console.log("betCountIndex:" + betCountIndex);

        const betIndex = totalArrx[index].betIndex;
        this.betNumObj.change(betIndex);
        console.log("betIndex:" + betIndex);
    }
}

type Totalx = { betCountIndex: number; betIndex: number; };
type TotalArrx = Totalx[];