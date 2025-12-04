import { _decorator, Button, Color, Component, error, instantiate, Label, Node, Prefab } from 'cc';
const { ccclass, property } = _decorator;

class Record {
    recordNum: number;
    color: Color;
    constructor(recordNum: number) {
        this.recordNum = recordNum;
        if (recordNum > 20) {
            this.color = Color.RED;
        } else if (recordNum > 5) {
            this.color = Color.YELLOW;
        } else if (recordNum > 2) {
            this.color = Color.BLUE;
        } else if (recordNum > 1) {
            this.color = Color.GREEN;
        } else if (recordNum >= 0) {
            this.color = Color.GRAY;
        } else {
            error("下注金額不得小於0", recordNum);
        }
    }
}

@ccclass('HistoryManager')
export class HistoryManager extends Component {
    @property({ type: Node }) private historyOutside: Node;
    @property({ type: Node }) private insidePage: Node;
    @property({ type: Node }) private historyInside: Node;
    @property({ type: Button }) private historyBtn: Button;
    @property({ type: Prefab }) private historyPrefab: Prefab;
    private history: Record[] = [];
    private insidePool: Node[] = [];
    private outsidePool: Node[] = [];
    private insideCount = 100;
    private outsideCount = 8;
    start() {
        this.init();

        for (let i = 0; i < 100; i++) {
            this.addHistory(Math.floor(Math.random() * 25));
        }
        console.log(this.history);
    }

    update(deltaTime: number) {

    }

    init(): void {
        this.historyBtn.node.on(Button.EventType.CLICK, this.openInsidePage.bind(this), this);
    }

    addHistory(recordNum: number, max = 100): void {
        let record = new Record(recordNum);
        this.history.push(record);
        if (this.outsidePool.length < this.outsideCount) {
            let node = instantiate(this.historyPrefab);
            this.outsidePool.push(node);
            node.getComponent(Label).string = record.recordNum.toFixed(2);
            node.getComponent(Label).color = record.color;
            this.historyOutside.addChild(node);
            node.setSiblingIndex(0);
        } else {
            for (let i = 0; i < this.outsideCount; i++) {
                let label = this.outsidePool[i].getComponent(Label);
                label.string = this.history[this.history.length - (this.outsideCount - i)].recordNum.toFixed(2);
                label.color = this.history[this.history.length - (this.outsideCount - i)].color;
            }
        }
    }

    openInsidePage(): void {
        this.insidePage.active = true;
        this.history.forEach((record, index) => {
            // record.recordNum.
        });
    }
}


