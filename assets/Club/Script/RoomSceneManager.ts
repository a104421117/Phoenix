import { _decorator, Component, director, instantiate, log, Node, Prefab } from 'cc';
import { WebsocketManager, ClientOp, ServerCmd } from '../../Script/Model/WebsocketManager';
import { GameData } from '../../Script/Model/GameData';
import { RoomJoinResponse, RoomList } from '../../Script/Model/WebsocketModel';
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
        const gameData = GameData.getInstance();
        if (gameData.RoomListCache) {
            this.onRoomList(gameData.RoomListCache);
            gameData.RoomListCache = null;
        }
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

    private onRoomList(data: RoomList) {
        log("RoomList", data);
        this.pool.forEach(obj => obj.reset());
        data.rooms.forEach(room => {
            const obj = this.getRoomObj();
            const playersCount = room.playersCount ?? room.playerCount ?? 0;
            obj.init(room.roomId, playersCount, room.maxPlayers, this.onJoinRoom.bind(this));
        });
    }

    private onJoinRoom(roomId: string) {
        log("JoinRoom", roomId);
        const ws = WebsocketManager.getInstance();
        ws.once(ServerCmd.RoomJoin, (data: RoomJoinResponse) => {
            log("RoomJoin", data);
            const gameData = GameData.getInstance();
            gameData.RoomId = data.roomId;
            gameData.PlayerId = data.playerId;
            // Phoenix.md 最新接口以 gameState 為主；保留 gameInit 相容
            const init = data.gameState ?? data.gameInit;
            if (init) {
                gameData.BetOptions = init.betOptions;
                gameData.MaxBetCount = init.maxBetsPerPlayer ?? init.betOptions?.length ?? 0;
                gameData.setExistingBets(init.existingBets);
                gameData.setMultiplierCurve(init.multiplierCurve);
            } else {
                gameData.setExistingBets([]);
                gameData.setMultiplierCurve([]);
            }

            /** 新版：balance 在 gameState/gameInit 內層；舊版：在 room.join 外層 */
            const balance = init?.balance ?? data.balance;
            if (balance) {
                const value = Number(balance.balanceUnits);
                if (Number.isFinite(value)) {
                    gameData.Balance = value;
                }
            }

            /** 新版：roundHistory 在 gameState/gameInit 內層；舊版：在 room.join 外層 */
            if (Array.isArray(init?.roundHistory)) {
                gameData.RoundHistory = init.roundHistory
                    .map((item) => Number(item))
                    .filter((item) => Number.isFinite(item));
            } else if (data.roundHistory) {
                const history = Array.isArray(data.roundHistory.history) ? data.roundHistory.history : [];
                if (history.every((item) => Number.isFinite(Number(item)))) {
                    gameData.RoundHistory = history
                        .map((item) => Number(item))
                        .filter((item) => Number.isFinite(item));
                } else {
                    const items = data.roundHistory.items ?? history;
                    gameData.RoundHistory = (items as any[])
                        .map((item) => Number(item?.crashPoint))
                        .filter((item) => Number.isFinite(item));
                }
            } else {
                gameData.RoundHistory = [];
            }
            director.loadScene('GameScene');
        });
        ws.send(ClientOp.RoomJoin, { roomId });
    }
}
