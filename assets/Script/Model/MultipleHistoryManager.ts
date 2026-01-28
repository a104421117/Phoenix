import { _decorator, Button, Component, Node } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { MultipleHistoryObj } from 'db://assets/Script/View/MultipleHistoryObj';
import { MultipleHistoryPageObj } from 'db://assets/Script/View/MultipleHistoryPageObj';
const { ccclass, property } = _decorator;

@ccclass('MultipleHistoryManager')
export class MultipleHistoryManager extends BaseModel.Singleton<MultipleHistoryManager> {
    @property({ type: Object(BaseModel.LayoutBase) })
    private multipleHistoryLayoutBase: BaseModel.LayoutBase<MultipleHistoryObj> = null;

    @property({ type: Object(BaseModel.LayoutBase) })
    private multipleHistoryPageLayoutBase: BaseModel.LayoutBase<MultipleHistoryPageObj> = null;

    start() {
        this.multipleHistoryLayoutBase.init(MultipleHistoryObj, 9);
        this.multipleHistoryPageLayoutBase.init(MultipleHistoryPageObj, 100);
        // this.initMultipleHistoryList([1, 2, 3, 5, 8, 13, 21, 34, 55]);
        // this.initMultipleHistoryPageList([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987]);
    }

    update(deltaTime: number) {

    }

    public initMultipleHistoryList(multipleHistoryDatas: number[]): void {
        this.multipleHistoryLayoutBase.objs.forEach((obj, index) => {
            const multipleHistoryData = multipleHistoryDatas[multipleHistoryDatas.length - index - 1];
            if (multipleHistoryData === undefined) {
                obj.node.active = false;
            } else {
                obj.MultipleHistory = multipleHistoryData;
            }
        });
    }

    public initMultipleHistoryPageList(multipleHistoryPageDatas: number[]): void {
        this.multipleHistoryPageLayoutBase.objs.forEach((obj, index, objs) => {
            const multipleHistoryData = multipleHistoryPageDatas[multipleHistoryPageDatas.length - index - 1];
            if (multipleHistoryData === undefined) {
                obj.node.active = false;
            } else {
                obj.multipleHistoryObj.MultipleHistory = multipleHistoryData;
                obj.RoundCount = index + 1;
            }
        });
    }
}


