import { _decorator, Component, director, instantiate, Label, Node, Prefab } from 'cc';
import { type RoomSummary } from '../../Script/Model/WebsocketManager';
import { GameController } from '../../Script/Controller/GameController';
import { GameData } from '../../Script/Model/GameData';
import { RoomObj } from './RoomObj';
const { ccclass, property } = _decorator;

@ccclass('RoomSceneManager')
export class RoomSceneManager extends Component {
    @property({ type: Prefab })
    private roomPrefab: Prefab = null;
    @property({ type: Node })
    private roomLayout: Node = null;
    @property({ type: Label })
    private walletLabel: Label = null;

    private pool: RoomObj[] = [];

    start() {
        const gameData = GameData.getInstance();
        this.walletLabel.string = gameData.Wallet.toString();
        this.showRooms(gameData.Rooms);
    }

    private getRoomObj(): RoomObj {
        const idle = this.pool.find(obj => !obj.node.active);
        if (idle) return idle;
        const node = instantiate(this.roomPrefab);
        const obj = node.getComponent(RoomObj);
        this.pool.push(obj);
        this.roomLayout.addChild(node);
        return obj;
    }

    private showRooms(rooms: RoomSummary[]) {
        this.pool.forEach(obj => obj.reset());
        rooms.forEach(room => {
            const obj = this.getRoomObj();
            obj.init(room.roomId, room.playerCount, room.maxPlayers, this.chooseRoom.bind(this));
        });
    }

    private async chooseRoom(roomId: string) {
        await GameController.getInstance().joinRoom(roomId);
        director.loadScene('GameScene');
    }
}
