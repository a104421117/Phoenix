import { error, log } from "cc";
import { Client, ClientCmd, ClientCmdMap } from "./WebsocketModel";
import { ServerCmd, ServerCmdMap } from "./WebsocketModel";
import { BaseModel } from "../../Base/BaseModel";

export { ClientCmd, ServerCmd, type Client, type ClientCmdMap, type ServerCmdMap } from "./WebsocketModel";
export class WebsocketManager extends BaseModel.GameEvent<ServerCmd, ServerCmdMap> {
    private ws: WebSocket = null;
    private static instance: WebsocketManager = null;
    public static getInstance() {
        if (this.instance === null) {
            error("[WebSocket] null");
        } else {
            return this.instance;
        }
    }

    public constructor(url: string, open: Function, close: Function) {
        super();
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
    }

    /** 發送指令到伺服器 */
    public send<T extends ClientCmd>(cmd: T, data: ClientCmdMap[T]) {
        const msg: Client<T> = { cmd, data };
        this.ws.send(JSON.stringify(msg));
    }
}
