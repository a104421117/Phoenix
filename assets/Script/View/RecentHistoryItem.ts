import { _decorator, Color, Component, Label, Node } from 'cc';
import { NodeSwitcher } from '../../Game.Client.Common/NodeSwitcher';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
const { ccclass, property } = _decorator;

/** MultipleHistoryColor 列舉。 */
enum MultipleHistoryColor {
    Gray = 0,
    Green = 1,
    Bule = 2,
    Yellow = 3,
    Red = 4
};

@ccclass('RecentHistoryItem')
export class RecentHistoryItem extends NodeSwitcher {
    /** 欄位設定。 */
    @property({ type: Array(Label) })
    private multipleHistoryLabels: Label[] = [];
    /**
     * 設定 MultipleHistory。
     * @param multipleHistory multipleHistory
     */
    public set MultipleHistory(multipleHistory: number) {
        if (multipleHistory > 20) {
            this.index = MultipleHistoryColor.Red;
        } else if (multipleHistory > 5) {
            this.index = MultipleHistoryColor.Yellow;
        } else if (multipleHistory > 2) {
            this.index = MultipleHistoryColor.Bule;
        } else if (multipleHistory > 1) {
            this.index = MultipleHistoryColor.Green;
        } else if (multipleHistory > 0) {
            this.index = MultipleHistoryColor.Gray;
        } else {
            this.index = -1;
        }
        this.switch(this.index);
        if (this.index in MultipleHistoryColor) {
            const multipleHistoryStr = BaseModel.getRoundToStr(multipleHistory, 2);
            this.multipleHistoryLabels[this.index].string = multipleHistoryStr;
        }
    }
}
