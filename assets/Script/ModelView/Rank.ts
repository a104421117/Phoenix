import { _decorator, Component, instantiate, Label, Node, Prefab, Sprite } from 'cc';
import { getInstance } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { Star } from './Star';
const { ccclass, property } = _decorator;

type StarArr = [Star, Star, Star, Star, Star];

@ccclass('Rank')
export class Rank extends Component {
    @property({ type: Label }) public H4A: Label = null;
    @property({ type: Sprite }) private playerSprite: Sprite = null;
    @property({ type: Label }) private nameLabel: Label = null;
    @property({ type: Label }) private H4B: Label = null;
    @property({ type: Node }) private rankLayout: Node = null;
    @property({ type: Prefab }) private MidFrameRankStar: Prefab = null;
    @property({ type: Array(Star), readonly: true }) private starArr: StarArr = [
        new Star(), new Star(), new Star(), new Star(), new Star()
    ];

    start() {
        //下注數量,若要有後台設定則要傳資料進來
        this.initRank();
    }

    update(deltaTime: number) {

    }

    initRank(betCountMax: number = getInstance(ModelManager).BetModel.betCountMax): void {
        for (let i = 0; i < betCountMax; i++) {
            const node = instantiate(this.MidFrameRankStar);
            this.rankLayout.addChild(node);

            const star: Star = node.getComponent(Star);
            this.starArr[i] = star;
        }
    }

    set H4AStr(value: string) {
        this.H4A.string = value;
    }
}


