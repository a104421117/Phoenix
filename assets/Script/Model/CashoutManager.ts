import { _decorator, Component, Node } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { CashoutObj, WinData } from '../View/CashoutObj';
import { GameData, GmaeModel } from './GameData';
const { ccclass, property } = _decorator;

@ccclass('CashoutManager')
export class CashoutManager extends BaseModel.Singleton<CashoutManager> {
    @property({ type: Object(BaseModel.LayoutBase) })
    private cashoutLayoutBase: BaseModel.LayoutBase<CashoutObj> = null;

    start() {
        const gameData = GameData.getInstance();
        gameData.on(GmaeModel.MaxBetCount, this.setMaxBetCount.bind(this));

        // this.updateMoneyList([1000, 2000, 3000, 4000]);
        // this.scheduleOnce(() => {
        //     this.showWinList([
        //         { win: 1000, multiple: 1 },
        //         { win: 2000, multiple: 2 },
        //         { win: 3000, multiple: 3 }
        //     ]);
        //     this.showFailList([false, false, false, true]);
        // }, 1);
    }

    update(deltaTime: number) {

    }

    private setMaxBetCount(maxBetCount: number) {
        this.cashoutLayoutBase.init(CashoutObj, maxBetCount);
        this.cashoutLayoutBase.objs.forEach((obj) => {
            obj.node.active = false;
        })
    }

    private updateMoneyList(moneys: number[]) {
        this.cashoutLayoutBase.objs.forEach((obj, index) => {
            const money = moneys[index];
            if (money === undefined) {
                obj.node.active = false;
            } else {
                obj.Money = money;
            }
        });
    }

    private showWinList(winDatas: WinData[]) {
        this.cashoutLayoutBase.objs.forEach((obj, index) => {
            const winData = winDatas[index];
            if (winData !== undefined) {
                obj.showWin(winData);
            }
        });
    }

    private showFailList(failDatas: boolean[]) {
        this.cashoutLayoutBase.objs.forEach((obj, index) => {
            const failData = failDatas[index];
            if (failData === true) {
                obj.showFail();
            }
        });
    }
}


