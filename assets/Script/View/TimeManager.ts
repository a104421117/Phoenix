import { _decorator, Label, Node, Sprite } from 'cc';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('TimeManager')
export class TimeManager extends Manager {
    @property({ type: Label }) private wagerTimeLabel: Label;
    @property({ type: Sprite }) private TextA: Sprite;

    @property({ type: Label }) private resetLabel: Label;
    @property({ type: Sprite }) private TextB: Sprite;
    start() {
        this.closeWagerTime();
        this.closeDeadTime();
    }

    update(deltaTime: number) {

    }

    public showWagerTime(): void {
        this.TextA.node.active = true;
        this.wagerTimeLabel.node.active = true;
    }

    public closeWagerTime(): void {
        this.TextA.node.active = false;
        this.wagerTimeLabel.node.active = false;
    }

    public changeWagerTime(time: number): string {
        const str = time + "s";
        this.wagerTimeLabel.string = str;
        return str;
    }

    public showDeadTime(): void {
        this.TextB.node.active = true;
        this.resetLabel.node.active = true;
    }

    public closeDeadTime(): void {
        this.TextB.node.active = false;
        this.resetLabel.node.active = false;
    }

    public changeDeadTime(time: number): string {
        let str = time.toString() + "s"
        this.resetLabel.string = str;
        return str;
    }
}


