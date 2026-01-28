import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('NodeSwitcher')
export class NodeSwitcher extends Component {
    @property({ type: [Node] })
    protected items: Node[] = [];

    public switch(index: number) {
        this.items.forEach((item, i) => {
            item.active = i === index;
        });
    }
}
