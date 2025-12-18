import { _decorator, CCFloat, CCInteger, director, Node } from 'cc';
import { GameModel, StateModel } from './Model';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('ModelManager')
export class ModelManager extends Manager {
    @property({ type: StateModel }) public Wager: StateModel = new StateModel();
    @property({ type: GameModel.BetModel }) public BetModel: GameModel.BetModel = new GameModel.BetModel();
    @property({ type: GameModel.MultipleModel }) public MultipleModel: GameModel.MultipleModel = new GameModel.MultipleModel();
    @property({ type: GameModel.RankModel }) public RankModel: GameModel.RankModel = new GameModel.RankModel();

    public socket: WebSocket = null;
    public createrSocket(socketUrl: string, callback: Function) {
        // const socket = new WebSocket(`ws://localhost:8080?token=${obj.token}`);
        const socket = new WebSocket('ws://192.168.1.113:8080/test');
        // socket.protocol

        let ping = 0;
        let pong = 0;
        let delay = 0;

        socket.onopen = () => {
            console.log('已連接');
            // socket.send('Hello Server!');

            // this.schedule(() => {
            //     socket.send("pong");
            //     ping = Date.now();
            // }, 1, Infinity, 0);
        };

        socket.onmessage = (event) => {
            const msg = event.data;
            if (msg === "pong") {
                pong = Date.now();
                delay = pong - ping;
                console.log("ping:" + delay + "ms");
            }
            console.log(msg);

            if (event.data instanceof ArrayBuffer) {
                // 轉成 Blob 顯示
                const blob = new Blob([event.data], { type: "image/png" });
                const url = URL.createObjectURL(blob);
                console.log("圖片 URL:", url);
            }

        };

        socket.onclose = () => {
            console.log('連接關閉');
        };

        socket.onerror = (error) => {
            console.error('錯誤:', error);
        };

        this.scheduleOnce(() => {
            callback(true);
        }, 0.1);
    }
}