import { _decorator, Component, director, instantiate, Node, Prefab } from 'cc';
import { EventManager } from '../../Script/Model/EventManager';
import { GmaeModel } from '../../Script/Model/GameModel';
import { RoomList } from '../../Script/Model/WebsocketModel';
import { GameController } from '../../Script/Controller/GameController';
import { RoomObj } from './RoomObj';
const { ccclass, property } = _decorator;

@ccclass('RoomSceneManager')
export class RoomSceneManager extends Component {
    @property({ type: Prefab })
    private roomPrefab: Prefab = null;
    @property({ type: Node })
    private roomLayout: Node = null;

    private pool: RoomObj[] = [];

    start() {
        const bus = EventManager.getInstance().gameState;
        bus.on(GmaeModel.Rooms, this.onRooms, this);
        bus.on(GmaeModel.RoomJoined, this.onRoomJoined, this);
        GameController.getInstance().requestRoomList();
    }

    protected onDestroy(): void {
        const bus = EventManager.getInstance().gameState;
        bus.off(GmaeModel.Rooms, this.onRooms, this);
        bus.off(GmaeModel.RoomJoined, this.onRoomJoined, this);
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

    private onRooms(data: RoomList) {
        this.pool.forEach(obj => obj.reset());
        data.rooms.forEach(room => {
            const obj = this.getRoomObj();
            obj.init(room.roomId, room.playerCount, room.maxPlayers, this.onJoinRoom.bind(this));
        });
    }

    private onRoomJoined() {
        director.loadScene('GameScene');
    }

    private onJoinRoom(roomId: string) {
        GameController.getInstance().joinRoom(roomId);
    }
}
