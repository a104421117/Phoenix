import { _decorator, Component, director, instantiate, log, Node, Prefab } from 'cc';
import { WebsocketManager, ClientOp, ServerCmd } from '../../Script/Model/WebsocketManager';
import { LobbyList, RoomList } from '../../Script/Model/WebsocketModel';
import { GameData } from '../../Script/Model/GameData';
import { LobbyObj } from './LobbyObj';
const { ccclass, property } = _decorator;

@ccclass('LobbySceneManager')
export class LobbySceneManager extends Component {
    @property({ type: Prefab })
    private lobbyPrefab: Prefab = null;
    @property({ type: Node })
    private lobbyLayout: Node = null;

    private pool: LobbyObj[] = [];

    start() {
        const ws = WebsocketManager.getInstance();
        ws.on(ServerCmd.LobbyList, this.onLobbyList, this);
        ws.send(ClientOp.LobbyList, { gameCode: "phoenix", currency: "TWD" });
    }

    private getLobbyObj(): LobbyObj {
        const idle = this.pool.find(obj => !obj.node.active);
        if (idle) return idle;
        const node = instantiate(this.lobbyPrefab);
        const obj = node.getComponent(LobbyObj);
        this.pool.push(obj);
        this.lobbyLayout.addChild(node);
        return obj;
    }

    private onLobbyList(data: LobbyList) {
        log("LobbyList", data);
        this.pool.forEach(obj => obj.reset());
        data.lobbies.forEach(lobby => {
            const obj = this.getLobbyObj();
            obj.init(lobby.lobbyId, lobby.minBet, lobby.maxBet, this.onJoinLobby.bind(this));
        });
    }

    private onJoinLobby(lobbyId: string) {
        log("JoinLobby", lobbyId);
        GameData.getInstance().LobbyId = lobbyId;
        const ws = WebsocketManager.getInstance();
        ws.once(ServerCmd.RoomList, this.onRoomList, this);
        ws.send(ClientOp.RoomList, { lobbyId, status: "open", limit: 50 });
    }

    private onRoomList(data: RoomList) {
        log("RoomList", data);
        GameData.getInstance().RoomListCache = data;
        director.loadScene('RoomScene');
    }
}
