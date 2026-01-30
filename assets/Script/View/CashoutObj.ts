import { _decorator, Component, Label, Node } from 'cc';
import { NodeSwitcher } from '../../Base/NodeSwitcher';
import { BaseModel } from '../../Base/BaseModel';
const { ccclass, property } = _decorator;

enum CashoutType {
    Btn = 0,
    Win = 1,
    Fail = 2
};

@ccclass('CashoutObj')
export class CashoutObj extends NodeSwitcher {
    @property({ type: Label })
    private moneyLabel: Label = null;

    @property({ type: Label })
    private winLabel: Label = null;

    @property({ type: Label })
    private multipleLabel: Label = null;
    start() {
        // this.switch(CashoutType.Btn);
        // this.Money = 10000;
        // this.scheduleOnce(() => {
        //     this.switch(CashoutType.Win);
        //     this.Win = 2500;
        //     this.Multiple = 2.5;
        // }, 1);
        // this.scheduleOnce(() => {
        //     this.switch(CashoutType.Fail);
        // }, 2);
    }

    public set Money(money: number) {
        const moneyStr = BaseModel.getFormatNum(money);
        this.moneyLabel.string = moneyStr;
        this.switch(CashoutType.Btn);
    }

    public showWin(winData: WinData) {
        const winStr = BaseModel.getFormatNum(winData.win);
        this.winLabel.string = winStr;

        const multipleStr = BaseModel.getRoundToStr(winData.multiple, 2);
        this.multipleLabel.string = multipleStr;

        this.switch(CashoutType.Win);
    }

    public showFail() {
        this.switch(CashoutType.Fail);
    }
}

export type WinData = {
    win: number;
    multiple: number;
};
