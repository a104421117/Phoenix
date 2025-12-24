import { _decorator, Button, Component, instantiate, Label, Layers, Node, Prefab } from 'cc';
import { History } from './History'
import { GameModel } from '../Model/Model';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('HistoryManager')
export class HistoryManager extends Manager {
    @property({ type: Node }) private historyOutside: Node;
    @property({ type: Node }) private historyInside: Node;
    @property({ type: Label }) private historyBestLabel: Label;
    @property({ type: Label }) private toadyBestLabel: Label;
    @property({ type: Prefab }) private historyPrefab: Prefab;
    @property({ type: Array(Label) }) private statsLabelArr: Label[] = [];

    private history: number[] = [];
    private historyInsidePool: History[] = [];
    private historyOutsidePool: History[] = [];
    private insideCount = 100;
    private outsideCount = 8;
    private statsArr = [0, 0, 0, 0, 0];
    private todayBestNum = 0;
    private historyBestNum = 0;
    start() {
        // this.historyBtn.node.on(Button.EventType.CLICK, this.openInsidePage.bind(this), this);

        for (let i = 0; i < 100; i++) {
            const num = GameModel.getFloor(Math.random() * 25, 2);
            this.addHistory(num);
        }
        // this.schedule(() => {
        //     this.addHistory(Math.random() * 25);
        // }, 10);
    }

    update(deltaTime: number) {

    }

    addHistory(historyNum: number): void {
        this.history.push(historyNum);
        if (this.historyOutsidePool.length < this.outsideCount) {
            const node = instantiate(this.historyPrefab);
            this.historyOutside.addChild(node);
            node.setSiblingIndex(0);
            const history = node.getComponent(History);
            this.historyOutsidePool.push(history);
            history.Num = historyNum;
        } else {
            const nowArr = this.history.slice(-this.historyOutsidePool.length);
            for (let i = 0; i < this.historyOutsidePool.length; i++) {
                const num = nowArr[i];
                this.historyOutsidePool[i].Num = num;
            }
        }

        if (this.historyInsidePool.length < this.insideCount) {
            const node = instantiate(this.historyPrefab);
            const layerIndex = Layers.nameToLayer("Popover");
            const layer = 1 << layerIndex;
            node.layer = layer;
            node.children.forEach((child) => {
                child.layer = layer;
            });
            this.historyInside.addChild(node);
            node.setSiblingIndex(0);
            const history = node.getComponent(History);
            history.Num = historyNum;
            this.historyInsidePool.push(history);
        } else {
            const nowArr = this.history.slice(-this.historyInsidePool.length);
            this.historyInsidePool.forEach((history, index) => {
                const num = nowArr[index];
                history.Num = num;
            });
        }

        for (let i = 0; i < this.historyInsidePool.length; i++) {
            const num = this.historyInsidePool.length - i;
            this.historyInsidePool[i].Txt = "前" + num.toString() + "局";
        }

        this.statsArr = [0, 0, 0, 0, 0];

        this.historyInsidePool.forEach((history) => {
            this.statsArr[history.index]++;
        });

        for (let i = 0; i < this.statsLabelArr.length; i++) {
            this.statsLabelArr[i].string = this.statsArr[i].toString();
        }
        this.updateTodayBest(historyNum);
        this.updateHistoryBest(historyNum);
    }

    updateTodayBest(todayBest: number) {
        if (todayBest > this.todayBestNum) {
            const numStr = GameModel.getRoundToStr(todayBest, 2);
            this.todayBestNum = todayBest;
            this.toadyBestLabel.string = numStr;
        }
    }

    updateHistoryBest(historyBest: number) {
        if (historyBest > this.historyBestNum) {
            const numStr = GameModel.getRoundToStr(historyBest, 2);
            this.historyBestNum = historyBest;
            this.historyBestLabel.string = numStr;
        }
    }
}


