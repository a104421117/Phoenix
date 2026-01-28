import { _decorator, instantiate, Label, Layout, Node, Prefab } from 'cc';
import { NodeSwitcher } from '../../Base/NodeSwitcher';
import { BaseModel } from '../../Base/BaseModel';
const { ccclass, property } = _decorator;

@ccclass('RankObj')
export class RankObj extends NodeSwitcher {
    // @property({ type: Prefab })
    // private starObj: Prefab = null;

    // @property({ type: Node })
    // private starLayout: Node = null;

    // private starObjs: NodeSwitcher[] = [];

    @property({ type: Object(BaseModel.LayoutBase) })
    private starLayoutBase: BaseModel.LayoutBase<NodeSwitcher> = null;

    @property({ type: Label })
    private rankLabel: Label = null;

    @property({ type: Label })
    private idLabel: Label = null;

    @property({ type: Label })
    private moneyLabel: Label = null;

    @property({ type: Label })
    private multipleLabel: Label = null;

    protected start(): void {
        this.starLayoutBase.init(NodeSwitcher, 5);
    }

    public updateRank(rankData: RankData) {
        this.node.active = true;
        this.setRank(rankData.rank);
        this.setID(rankData.id);
        this.setMoney(rankData.money);
        this.switchStar(rankData.stars);
        this.setMultiple(rankData.multiple);
    }

    private setRank(rank: number) {
        const BGindex = rank % 2;
        this.switch(BGindex);
        this.rankLabel.string = rank.toString();
    }

    private setID(id: string) {
        this.idLabel.string = id;
    }

    private setMoney(money: number) {
        const moneyStr = BaseModel.getFormatNum(money);
        this.moneyLabel.string = moneyStr;
    }

    private switchStar(stars: number[]) {
        this.starLayoutBase.objs.forEach((starObj, index) => {
            const star = stars[index];
            if (star === undefined) {
                starObj.switch(-1);
            } else {
                starObj.switch(star);
            }
        });
    }

    private setMultiple(multiple: number) {
        const multipleStr = BaseModel.getRoundToStr(multiple, 2);
        this.multipleLabel.string = multipleStr;
    }
}
export type RankData = {
    rank: number;
    id: string;
    money: number;
    stars: number[];
    multiple: number;
}