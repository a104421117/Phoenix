import { _decorator, Color, Component, error, Label, Node, Sprite, SpriteFrame } from 'cc';
import { GameModel } from '../Model/Model';
const { ccclass, property } = _decorator;

@ccclass('HistoryColor')
class HistoryColor {
    @property({ type: SpriteFrame }) public topScoreboardSpriteFrame: SpriteFrame;
    color: Color = Color.RED;
}

@ccclass('History')
export class History extends Component {
    private num: number;
    public index: number;
    @property({ type: Sprite }) private sprite: Sprite;
    @property({ type: Label }) private numLabel: Label;
    @property({ type: Label }) private txtLabel: Label;
    @property({ type: Array(HistoryColor) }) private historyColor: [HistoryColor, HistoryColor, HistoryColor, HistoryColor, HistoryColor] =
        [new HistoryColor(), new HistoryColor(), new HistoryColor(), new HistoryColor(), new HistoryColor()];
    start() {

    }

    update(deltaTime: number) {

    }

    set Num(num: number) {
        const number = GameModel.getFloor(num, 2);
        if (number > 20) {
            var color = Color.RED;
            var index = 4;
        } else if (number > 5) {
            var index = 3;
            var color = Color.YELLOW;
        } else if (number > 2) {
            var index = 2;
            var color = Color.BLUE;
        } else if (number > 1) {
            var index = 1;
            var color = Color.GREEN;
        } else if (number >= 0) {
            var index = 0;
            var color = Color.GRAY;
        } else {
            error("下注金額錯誤", number);
            return;
        }
        const spriteFrame = this.historyColor[index].topScoreboardSpriteFrame;
        this.sprite.spriteFrame = spriteFrame;

        // const color = this.historyColor[index].color;
        this.numLabel.color = color;
        this.numLabel.string = GameModel.getRoundToStr(number, 2);

        this.index = index;
        this.num = number;
    }

    set Txt(txt: string) {
        this.txtLabel.string = txt;
    }

    get Num() {
        return this.num;
    }
}


