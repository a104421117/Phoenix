import { _decorator, Component, Node } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { RankData, RankObj } from '../View/RankObj';
const { ccclass, property } = _decorator;

@ccclass('RankManager')
export class RankManager extends BaseModel.Singleton<RankManager> {
    @property({ type: Object(BaseModel.LayoutBase) })
    private rankLayoutBase: BaseModel.LayoutBase<RankObj> = null;

    protected start(): void {
        this.rankLayoutBase.init(RankObj, 6);
        this.scheduleOnce(() => {
            this.rankLayoutBase.objs.forEach((rankObj) => {
                rankObj.node.active = false;
            });
        }, 0);

        // this.scheduleOnce(() => {
        //     const rankDatas: RankData[] = [
        //         { rank: 1, id: 'Player001', money: 150000, stars: [1, 1, 1, 0, 0], multiple: 3 },
        //         { rank: 2, id: 'Player002', money: 98000, stars: [1, 1, 0, 0, 0], multiple: 2 },
        //         { rank: 3, id: 'Player003', money: 75000, stars: [1, 0, 0, 0, 0], multiple: 1 },
        //         { rank: 4, id: 'Player004', money: 62000, stars: [1, 1, 1, 1, 0], multiple: 4 },
        //         { rank: 5, id: 'Player005', money: 54000, stars: [1, 1, 0, 0, 0], multiple: 2 },
        //         { rank: 6, id: 'Player006', money: 48000, stars: [1, 1, 1, 0, 0], multiple: 3 },
        //     ];
        //     this.updateRankList(rankDatas);
        // }, 1);
    }

    public updateRankList(rankDatas: RankData[]): void {
        this.rankLayoutBase.objs.forEach((rankObj, index) => {
            const rankData = rankDatas[index];
            if (rankData === undefined) {
                rankObj.node.active = false;
            } else {
                rankObj.updateRank(rankData);
            }
        });
    }
}
