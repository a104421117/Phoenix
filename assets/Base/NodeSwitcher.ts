import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('NodeSwitcher')
export class NodeSwitcher extends Component {
    @property({ type: [Node] })
    protected items: Node[] = [];

    protected index: number = -1;

    /** 目前索引 */
    public get Index(): number { return this.index; }

    /** 目前物件 */
    public get current(): Node | null {
        if (this.index >= 0 && this.index < this.items.length) {
            return this.items[this.index];
        }
        return null;
    }

    /** 切換到指定索引（隱藏其他） */
    public switch(index: number) {
        this.index = index;
        this.items.forEach((item, i) => {
            item.active = i === index;
        });
    }
}
