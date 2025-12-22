import { _decorator, Component, JsonAsset, Node } from 'cc';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('WebSocketManager')
export class WebSocketManager extends Manager {
    private webSocket: WebSocket = null;
    start() {

    }

    update(deltaTime: number) {

    }

    public createrSocket(socketUrl: string, callback: Function) {
        this.webSocket = new WebSocket(socketUrl);

        this.webSocket.onopen = () => {
            console.log('已連接');
            callback(true);
        };

        this.webSocket.onmessage = (event) => {
            const message: string = event.data;
            this.receiveSocket(message);
        };

        this.webSocket.onclose = () => {
            callback(false);
            console.log('連接關閉');
        };

        this.webSocket.onerror = (error) => {
            callback(false);
            console.error('錯誤:', error);
        };
    }

    private sendSocket<T>(message: SocketMassage<T>) {
        const json = message.toJson();
        this.webSocket.send(json);
    };

    private receiveSocket(message: string) {
        const msg = SocketMassage.parse(message);
        const type = msg.cmd;
        switch (type) {
            case SocketMassageType.BettingStart:
                this.BettingStart();
                break;
            case SocketMassageType.BetOK:
                break;
            case SocketMassageType.RoundStart:
                break;
            case SocketMassageType.Flying:
                break;
            case SocketMassageType.Win:
                break;
            case SocketMassageType.Explode:
                break;
            case SocketMassageType.Lose:
                break;
        }
    };

    public Bet(data: Bet) {
        const message: SocketMassage<Bet> = new SocketMassage<Bet>(SocketMassageType.Bet, data);
        this.sendSocket(message);
        return message;
    }

    private BettingStart() {

    }

    private BetOK() {

    }

    private RoundStart() {

    }

    private Flying() {

    }

    private Cashout() {

    }

    private Win() {

    }

    private Explode() {

    }

    private Lose() {

    }
}

const enum SocketMassageType {
    BettingStart = "BettingStart",
    Bet = "Bet",
    BetOK = "BetOK",
    RoundStart = "RoundStart",
    Flying = "Flying",
    Cashout = "Cashout",
    Win = "Win",
    Explode = "Explode",
    Lose = "Lose",
};

class SocketMassage<T> {
    cmd: SocketMassageType;
    data: T;
    /**
     *
     */
    constructor(cmd: SocketMassageType, data: T) {
        // super();
        this.cmd = cmd;
        this.data = data;
    }
    toJson(): string {
        return JSON.stringify(this);
    }
    static parse<T>(json: string) {
        const socketMassage: SocketMassage<T> = JSON.parse(json);
        return socketMassage;
    }
};

type BettingStart = {
    seconds: number;
};

type Bet = {
    index: number;
    amount: number;
};

type BetOK = {
    index: number;
};

type Flying = {
    serverTime: string;
    elapsed: number;
    multiplier: number;
};

type Cashout = {
    index: number;
};

type Win = {
    index: number;
    amount: number;
    multiplier: number;
    win: number;
};

type Explode = {
    multiplier: number;
};

type Lose = {
    index: number;
}
