import { _decorator, Component, Label, Node } from 'cc';
import { MultipleHistoryObj } from './MultipleHistoryObj';
const { ccclass, property } = _decorator;

@ccclass('MultipleHistoryPageObj')
export class MultipleHistoryPageObj extends Component {
    @property({ type: Object(MultipleHistoryObj) })
    public multipleHistoryObj: MultipleHistoryObj = null;

    @property({ type: Label })
    private Label: Label = null;

    private roundCount: number = 0;
    public set RoundCount(value: number) {
        this.roundCount = value;
        this.Label.string = `近${this.roundCount}局`;
    }
}