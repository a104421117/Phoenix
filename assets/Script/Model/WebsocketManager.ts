import { error } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { EventManager } from './EventManager';
import { GameErrorPrompt, GmaeModel } from './GameModel';
import { ClientOp, ClientOpMap, ServerOp } from './WebsocketModel';

export class WebsocketManager extends BaseModel.Singleton {
    private ws: WebSocket = null;
    private clientSendHandlers: { op: ClientOp; handler: (data: any) => void }[] = [];

    public connect(url: string, open: Function, close: Function): void {
        this.ws = new WebSocket(url);
        this.bindClientSend();

        this.ws.onopen = () => {
            open(this.ws);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (this.isErrorMessage(msg)) {
                this.logServerError(msg);
                return;
            }

            if (msg.type) {
                EventManager.getInstance().serverPush.emit(msg.type as ServerOp, msg.data);
            }
        };

        this.ws.onclose = (event: CloseEvent) => {
            this.unbindClientSend();
            this.ws = null;
            error(event.code);
        };

        this.ws.onerror = (event: Event) => {
            error('[WebSocket] error event', event);
            this.emitPrompt(GameErrorPrompt.NetworkReconnecting);
        };
    }

    public get isConnected(): boolean {
        return this.ws !== null;
    }

    private bindClientSend() {
        const bus = EventManager.getInstance().clientSend;
        const keys = Object.keys(ClientOp) as Array<keyof typeof ClientOp>;
        for (const key of keys) {
            const op = ClientOp[key];
            const handler = (data: ClientOpMap[ClientOp]) => {
                this.ws.send(JSON.stringify({ op, data }));
            };
            bus.on(op, handler, this);
            this.clientSendHandlers.push({ op, handler });
        }
    }

    private unbindClientSend() {
        const bus = EventManager.getInstance().clientSend;
        for (const { op, handler } of this.clientSendHandlers) {
            bus.off(op, handler, this);
        }
        this.clientSendHandlers.length = 0;
    }

    private isErrorMessage(msg: any): boolean {
        return msg?.status === 'error' || msg?.type === 'error' || msg?.op === 'error';
    }

    private logServerError(msg: any) {
        // error('[WebSocket] server error', msg);
        console.error('[WebSocket] server error', msg);
    }

    private emitPrompt(message: GameErrorPrompt | string) {
        EventManager.getInstance().gameState.emit(GmaeModel.ShowError, { message });
    }
}
