import { _decorator, Component, instantiate, Label, Layers, Node, Prefab, Sprite, SpriteFrame } from 'cc';
import { getInstance } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import { GameModel } from '../Model/Model';
import { RankType } from '../View/RankManager';
const { ccclass, property } = _decorator;

type StarSprite = [Sprite, Sprite, Sprite, Sprite, Sprite];
type StarSpriteFrame = [SpriteFrame, SpriteFrame, SpriteFrame];

@ccclass('Rank')
export class Rank extends Component {
    @property({ type: Sprite }) private MidRankBackSprite: Sprite = null;
    @property({ type: Array(SpriteFrame) }) private MidRankBackSpriteFrame: SpriteFrame[] = [null, null];
    @property({ type: Label }) private H4A: Label = null;
    @property({ type: Sprite }) private playerSprite: Sprite = null;
    @property({ type: Label }) private nameLabel: Label = null;
    @property({ type: Label }) private H4B: Label = null;
    @property({ type: Node }) private rankLayout: Node = null;
    // @property({ type: Prefab }) private MidFrameRankStar: Prefab = null;
    @property({ type: Array(Sprite), readonly: true }) private starSpriteArr: StarSprite = [
        new Sprite(), new Sprite(), new Sprite(), new Sprite(), new Sprite()
    ];
    @property({ type: SpriteFrame }) starSpriteFrameArr: StarSpriteFrame = [null, null, null];
    betCount: RankType[] = [];
    start() {
        //下注數量,若要有後台設定則要傳資料進來
        this.initRank();
    }

    update(deltaTime: number) {

    }

    private initRank(betCountMax: number = getInstance(ModelManager).BetModel.betCountMax): void {
        for (let i = 0; i < betCountMax; i++) {
            const node = new Node();
            node.active = false;
            this.rankLayout.addChild(node);
            const layerIndex = Layers.nameToLayer("UI");
            const layer = 1 << layerIndex;
            node.layer = layer;

            const starSprite: Sprite = node.addComponent(Sprite);
            this.starSpriteArr[i] = starSprite;
        }
    }

    set H4AStr(H4A: number) {
        const H4AStr = H4A.toString();
        this.H4A.string = H4AStr;
    }

    set H4BStr(H4B: number) {
        const H4BStr = GameModel.getFloor(H4B).toString();
        this.H4B.string = H4BStr;
    }

    set BetCount(betCount: RankType[]) {
        if (this.betCount !== betCount) {
            for (let i = 0; i < this.starSpriteArr.length; i++) {
                const starSprite = this.starSpriteArr[i];
                const starSpriteFrameIndex = betCount[i];
                if (starSpriteFrameIndex !== undefined) {
                    starSprite.node.active = true;
                    starSprite.spriteFrame = this.starSpriteFrameArr[betCount[i]];
                } else {
                    starSprite.node.active = false;
                }
            }
            this.betCount = betCount;
        }
    }

    set Multiple(multiple: number) {

    }
}


