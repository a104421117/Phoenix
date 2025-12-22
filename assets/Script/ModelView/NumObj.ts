import { _decorator, Button, CCInteger, Component, Label, Node } from 'cc';
import { GameModel } from '../Model/Model';
const { ccclass, property } = _decorator;

@ccclass('NumObj')
export class NumObj extends Label {
    @property({ type: Array(CCInteger) }) numArr: number[] = [];
    index: number = 0;
    public get Num() {
        return this.numArr[this.index];
    }
    @property({ type: Button }) minusBtn: Button;
    @property({ type: Button }) plusBtn: Button;
    start() {
        this.minusBtn?.node.on(Button.EventType.CLICK, this.minus.bind(this), this);
        this.plusBtn?.node.on(Button.EventType.CLICK, this.plus.bind(this), this);
    }

    update(deltaTime: number) {

    }

    init(numArr: number[], index = 0) {
        this.numArr = numArr;
        this.index = index;
        const num = this.setNumber(this.numArr[this.index]);
        return num;
    }

    private minus() {
        if (this.index > 0) {
            this.index--;
            this.setNumber(this.numArr[this.index]);
            this.node.emit("minus", this, this.Num, this.index);
        }
        return this.Num;
    }

    private plus() {
        if (this.index < this.numArr.length - 1) {
            this.index++;
            this.setNumber(this.numArr[this.index]);
            this.node.emit("plus", this, this.Num, this.index);
        }
        return this.Num;
    }

    change(index: number) {
        this.setNumber(this.numArr[index]);
        this.index = index;
    }

    setNumber(num: number, decimalPlaces: number = 0) {
        const floor = GameModel.getFloor(num, decimalPlaces);
        this.string = floor.toString();
        return floor;
    }
}


