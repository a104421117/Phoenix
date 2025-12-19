import { _decorator, Component, Label, Node, Slider } from 'cc';
import { NumObj } from '../ModelView/NumObj';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('AutoManager')
export class AutoManager extends Manager {
    @property({ type: NumObj }) private betCountNumObj: NumObj;
    @property({ type: NumObj }) private betNumObj: NumObj;
    @property({ type: NumObj }) private inningsNumObj: NumObj;

    @property({ type: Slider }) private cashOutSlider: Slider;
    @property({ type: Label }) private cashOutLabel: Label;

    private isAuto = false;
    start() {
        this.betCountNumObj.init([1, 2, 3, 4, 5]);
        this.betNumObj.init([1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]);
    }

    update(deltaTime: number) {

    }

    checkAuto() {
        if (this.isAuto === true) {

        }
    }
}


