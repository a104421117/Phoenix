import { _decorator, Component, Label } from 'cc';
import { RecentHistoryItem } from './RecentHistoryItem';
const { ccclass, property } = _decorator;

@ccclass('FullHistoryItem')
export class FullHistoryItem extends Component {
    /** 欄位設定。 */
    @property({ type: RecentHistoryItem })
    private recentHistoryItem: RecentHistoryItem = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private indexLabel: Label = null;

    /**
     * 設定 Index。
     * @param index index
     */
    public set Index(index: number) {
        const str = index < 10 ? '0' + index : '' + index;
        this.indexLabel.string = str;
    }

    /**
     * 設定 MultipleHistory。
     * @param value value
     */
    public set MultipleHistory(value: number) {
        this.recentHistoryItem.MultipleHistory = value;
    }
}
