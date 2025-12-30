import { _decorator, Button, Component, instantiate, Node, Prefab, sp } from 'cc';
import { LoadManager } from '../View/LoadManager';
const { ccclass, property } = _decorator;

@ccclass('ClubManager')
export class ClubManager extends Component {
    @property({ type: Prefab }) private tablePrefab: Prefab;
    @property({ type: Node }) private tableParent: Node;

    start() {
        const clubDataArr: ClubData[] = [];
        for (let i = 0; i < 8; i++) {
            clubDataArr.push({ clubName: `Club ${i + 1}` });
        }
        this.initClub(clubDataArr);
    }

    update(deltaTime: number) {

    }

    initClub(clubDataArr: ClubData[]) {
        clubDataArr.forEach((clubData) => {
            const node = instantiate(this.tablePrefab);
            this.tableParent.addChild(node);

            const btn = node.children[0].getComponent(Button);
            btn.node.on(Button.EventType.CLICK,LoadManager.runGameScene.bind(this, LoadManager.gameScene), this);
            const spine = node.children[0].getComponent(sp.Skeleton);
            btn.node.on(Node.EventType.MOUSE_ENTER, () => {
                spine.setAnimation(0, "table_crash_phoenix_play", true);
            });
            btn.node.on(Node.EventType.MOUSE_LEAVE, () => {
                spine.setAnimation(0, "table_crash_phoenix_idle", false);
            });
        });
    }
}

type ClubData = {
    clubName: string;
}
