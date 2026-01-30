import { _decorator, Component, error, EventTarget, log } from 'cc';
const { ccclass, property } = _decorator;

export class WebsocketManager {
    private static instance: WebsocketManager = null;
    private ws: WebSocket = null;
    private eventTarget: EventTarget = new EventTarget();

    public constructor(url: string, open: Function, close: Function) {
        WebsocketManager.instance = this;

        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
            log('[WebSocket] 連線成功');
            open(this.ws);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            const cmd: ServerCmd = msg.cmd;
            if (cmd in ServerCmd) {
                this.eventTarget.emit(cmd, msg.data);
            } else {
                error(`[WebSocket] 未知狀態: ${cmd}`);
            }
        };

        this.ws.onclose = (event: CloseEvent) => {
            WebsocketManager.instance.ws = null;
            WebsocketManager.instance = null;
            error(event.code, event.reason);
            close(event);
        };

        this.ws.onerror = (event: Event) => {
            error('[WebSocket] 連線錯誤', event);
        };
        return this;
    };

    public static getInstance() {
        if (this.instance === null) {
            error("websocket is null");
        } else {
            return this.instance;
        }
    }

    /** 發送指令到伺服器 */
    public send<T extends ClientCmd>(cmd: T, data: ClientCmdMap[T]) {
        const msg: Server<T> = { cmd, data };
        this.ws.send(JSON.stringify(msg));
    }

    /** 監聽伺服器指令事件 */
    public on<T extends ServerCmd>(cmd: T, callback: (data: ServerCmdMap[T]) => void, target?: any) {
        this.eventTarget.on(cmd, callback, target);
    }

    /** 取消監聯伺服器指令事件 */
    public off<T extends ServerCmd>(cmd: T, callback: (data: ServerCmdMap[T]) => void, target?: any) {
        this.eventTarget.off(cmd, callback, target);
    }
}

type Server<T extends ClientCmd> = {
    cmd: T;
    data: ClientCmdMap[T];
}

/** 伺服器 → 客戶端 指令 */
export enum ServerCmd {
    Login = 'Login',
    BettingStart = 'BettingStart',
    BetOK = 'BetOK',
    RoundStart = 'RoundStart',
    Flying = 'Flying',
    Win = 'Win',
    Explode = 'Explode',
    Lose = 'Lose',
}

export type Login = {
    id: string;
    name: string;
    balance: number;
    betOptions: number[];
    maxBetCount: number;
    roundHistory: number[];
}

export type Flying = {
    serverTime: Date;
    elapsed: number;
    multiplier: number;
};

export type Win = {
    index: number;
    amount: number;
    multiplier: number;
    win: number;
};

export type BettingStart = { seconds: number; };
export type BetOK = { index: number; };
export type RoundStart = {};
export type Explode = { multiplier: number; };
export type Lose = { index: number; };

export type Bet = {
    index: number;
    amount: number;
};
export type Cashout = { index: number };

/** 客戶端 → 伺服器 指令 */
export enum ClientCmd {
    Bet = 'Bet',
    Cashout = 'Cashout',
}

/** 伺服器指令 → 資料型別映射 */
export type ServerCmdMap = {
    [ServerCmd.Login]: Login;
    [ServerCmd.BettingStart]: BettingStart;
    [ServerCmd.BetOK]: BetOK;
    [ServerCmd.RoundStart]: RoundStart;
    [ServerCmd.Flying]: Flying;
    [ServerCmd.Win]: Win;
    [ServerCmd.Explode]: Explode;
    [ServerCmd.Lose]: Lose;
}

/** 伺服器指令 → 資料型別映射 */
type ClientCmdMap = {
    [ClientCmd.Bet]: Bet;
    [ClientCmd.Cashout]: Cashout;
}