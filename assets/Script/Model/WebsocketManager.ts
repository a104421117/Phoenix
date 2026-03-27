import { error, log } from "cc";
import { ClientOp, ClientOpMap } from "./WebsocketModel";
import { ServerCmd, ServerCmdMap } from "./WebsocketModel";
import { BaseModel } from "../../Base/BaseModel";

export { ClientOp, ServerCmd, type ClientOpMap, type ServerCmdMap } from "./WebsocketModel";
export class WebsocketManager extends BaseModel.GameEvent<ServerCmd, ServerCmdMap> {
    /** ws 欄位。 */
    private ws: WebSocket = null;
    private static instance: WebsocketManager = null;
    public static getInstance() {
        if (this.instance === null) {
            error("[WebSocket] null");
        } else {
            return this.instance;
        }
    }

    /**
     * constructor。
     * @param url url
     * @param open open
     * @param close close
     */
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
            log('[WebSocket] 收到', msg);
            if (msg.type) {
                this.eventTarget.emit(msg.type, msg.data);
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
    public send<T extends ClientOp>(op: T, data: ClientOpMap[T]) {
        this.ws.send(JSON.stringify({ op, data }));
    }
}
