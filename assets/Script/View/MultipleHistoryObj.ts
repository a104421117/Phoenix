import { _decorator, Color, Component, Label, Node } from 'cc';
import { NodeSwitcher } from '../../Base/NodeSwitcher';
import { BaseModel } from '../../Base/BaseModel';
const { ccclass, property } = _decorator;

enum MultipleHistoryColor {
    Gray = 0,
    Green = 1,
    Bule = 2,
    Yellow = 3,
    Red = 4
};

@ccclass('MultipleHistoryObj')
export class MultipleHistoryObj extends NodeSwitcher {
    @property({ type: Array(Label) })
    private multipleHistoryLabels: Label[] = [];

    private index: MultipleHistoryColor = MultipleHistoryColor.Gray;

    public set MultipleHistory(multipleHistory: number) {
        if (multipleHistory > 20) {
            this.index = MultipleHistoryColor.Red;
        } else if (multipleHistory > 5) {
            this.index = MultipleHistoryColor.Yellow;
        } else if (multipleHistory > 2) {
            this.index = MultipleHistoryColor.Bule;
        } else if (multipleHistory > 1) {
            this.index = MultipleHistoryColor.Green;
        } else {
            this.index = MultipleHistoryColor.Gray;
        }
        this.switch(this.index);
        const multipleHistoryStr = BaseModel.getRoundToStr(multipleHistory, 2);
        this.multipleHistoryLabels[this.index].string = multipleHistoryStr;
    }
}


