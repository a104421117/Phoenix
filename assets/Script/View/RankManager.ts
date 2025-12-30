import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { getInstance, Manager } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { Rank } from '../ModelView/Rank';
const { ccclass, property } = _decorator;

@ccclass('RankManager')
export class RankManager extends Manager {
    @property({ type: Node }) private rankLayout: Node;
    @property({ type: Prefab }) private MidRankBackPrefab: Prefab;
    @property({ type: Array(Rank) }) private MidRankBackRank: [Rank, Rank, Rank, Rank, Rank] = [
        null, null, null, null, null
    ];

    start() {
        this.initRank();
        const rankData: RankData[] = [];

        for (let i = 0; i < 6; i++) {
            const data: RankData = {
                totalBet: 98765,
                updateBet: 0,
                betCount: [RankType.GRAY, RankType.GRAY, RankType.GRAY, RankType.GRAY, RankType.GRAY],
                multiple: 0
            }
            rankData.push(data);
        }
        this.schedule(() => {
            this.changeRank(rankData);
        }, 1);
    }

    update(deltaTime: number) {

    }

    initRank(rankCount: number = getInstance(ModelManager).RankModel.rankCount): void {
        for (let i = 0; i < rankCount; i++) {
            const node = instantiate(this.MidRankBackPrefab);
            node.getComponent(Rank).H4AStr = i + 1;
            // node.active = false;
            this.rankLayout.addChild(node);

            const rank = node.getComponent(Rank);
            this.MidRankBackRank.push(rank);
        }
    }

    changeRank(rankDataArr: RankData[]): void {
        for (let i = 0; i < this.MidRankBackRank.length; i++) {
            const bet = rankDataArr[i].bet;
            this.MidRankBackRank[i].H4BStr = bet;

            const betCount = rankDataArr[i].betCount;
            this.MidRankBackRank[i].BetCount = betCount;

        }
    }
}


export type RankData = {
    bet: number;
    betCount: RankType[];
    multiple: number;
}

export const enum RankType {
    GRAY = 0,
    GREEN = 1,
    RED = 2
}