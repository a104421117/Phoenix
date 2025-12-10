import { _decorator, Label, Sprite } from 'cc';
import { Manager } from '../../lib/BaseManager';
import * as View from "db://assets/Script/View/View";
import { GameModel } from '../Model/Model';

const { ccclass, property } = _decorator;

@ccclass('MultipleManager')
export class MultipleManager extends Manager {
    @property({ type: Label }) private multipleLabel: Label;
    @property({ type: Sprite }) private TextC: Sprite;

    start() {
        this.closeTextC();
        this.closemultipleLabel();
    }

    update(deltaTime: number) {

    }

    public showMultiple(): void {
        this.TextC.node.active = true;
        this.multipleLabel.node.active = true;
    }

    public closeTextC(): void {
        this.TextC.node.active = false;
    }

    public closemultipleLabel(): void {
        this.multipleLabel.node.active = false;
    }

    public changeMultiple(multiple: number): string {
        const numStr = GameModel.getRoundToStr(multiple, 2);
        const str = numStr + "x";
        this.multipleLabel.string = str;
        return str;
    }
}


