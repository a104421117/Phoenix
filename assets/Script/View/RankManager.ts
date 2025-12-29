import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { getInstance, Manager } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { Rank } from '../ModelView/Rank';
const { ccclass, property } = _decorator;

@ccclass('RankManager')
export class RankManager extends Manager {
    @property({ type: Prefab }) private MidRankBackPrefab: Prefab;
    @property({ type: Array(Rank) }) private MidRankBackRank: Rank[] = [];
    @property({ type: Node }) private rankLayout: Node;

    start() {
        this.initRank();
        const rankData: RankData[] = [];
        for (let i = 0; i < 6; i++) {
            const data: RankData = {
                totalBet: 98765,
                betCount: [false, false, false, false, false],

            }
            rankData.push(data);
        }
        this.setRank([]);
    }

    update(deltaTime: number) {

    }

    initRank(rankCount: number = getInstance(ModelManager).RankModel.rankCount): void {
        for (let i = 0; i < rankCount; i++) {
            const node = instantiate(this.MidRankBackPrefab);
            node.getComponent(Rank).H4AStr = (i + 1).toString();
            // node.active = false;
            this.rankLayout.addChild(node);

            const rank = node.getComponent(Rank);
            this.MidRankBackRank.push(rank);
        }
    }

    setRank(rankArr: RankData[]): void {

    }
}


type RankData = {
    totalBet: number;
    betCount: boolean[];
    multiple: number;
}

const enum RankType {
    TotalBet,
    BetCount,
    Multiple
}