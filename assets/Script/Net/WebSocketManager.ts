import { EventManager } from '../Lib/EventManager';
import { GameEvents } from '../Lib/Constants';
import { BaseMessage, MessageType, AuthRequest } from './Protocol';

/**
 * WebSocket 連接狀態
 */
export enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting'
}

/**
 * 待處理的請求
 */
interface PendingRequest {
    resolve: (response: any) => void;
    reject: (error: Error) => void;
    timeout: number;
    responseType: MessageType;
}

/**
 * 請求類型 -> 響應類型 映射
 */
const REQUEST_RESPONSE_MAP: { [key: string]: MessageType } = {
    [MessageType.AUTH]: MessageType.AUTH_RESULT,
    [MessageType.BET_REQUEST]: MessageType.BET_RESULT,
    [MessageType.TAKEOUT_REQUEST]: MessageType.TAKEOUT_RESULT,
};

/**
 * WebSocket 連接管理器（純單例）
 * 支持 Promise 風格的請求-響應模式
 */
export class WebSocketManager {
    private static _instance: WebSocketManager;

    public static get instance(): WebSocketManager {
        if (!WebSocketManager._instance) {
            WebSocketManager._instance = new WebSocketManager();
        }
        return WebSocketManager._instance;
    }

    private constructor() {}

    private _serverUrl: string = '';
    private _authToken: string = '';
    private _ws: WebSocket | null = null;
    private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private _reconnectAttempts: number = 0;
    private _maxReconnectAttempts: number = 5;
    private _reconnectInterval: number = 3000;
    private _heartbeatInterval: number = 30000;
    private _heartbeatTimer: number | null = null;
    private _reconnectTimer: number | null = null;
    private _messageSeq: number = 0;
    private _isAuthenticated: boolean = false;
    private _defaultTimeout: number = 10000;

    // 待處理的請求 Map (seq -> PendingRequest)
    private _pendingRequests: Map<number, PendingRequest> = new Map();

    /**
     * 連接到服務器
     */
    public connect(url: string, token?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this._serverUrl = url;
            if (token) this._authToken = token;

            if (this._ws) {
                this._ws.close();
            }

            this._connectionState = ConnectionState.CONNECTING;
            this._isAuthenticated = false;
            this._pendingRequests.clear();
            console.log(`Connecting to ${this._serverUrl}...`);

            try {
                this._ws = new WebSocket(this._serverUrl);

                this._ws.onopen = (event) => {
                    this._onOpen(event);

                    if (!this._authToken) {
                        resolve();
                    } else {
                        // 發送認證並等待結果
                        this.request<{ success: boolean; error?: string }>({
                            type: MessageType.AUTH,
                            timestamp: Date.now(),
                            data: { token: this._authToken }
                        } as AuthRequest).then((result) => {
                            if (result.success) {
                                this._isAuthenticated = true;
                                resolve();
                            } else {
                                reject(new Error(result.error || 'Authentication failed'));
                            }
                        }).catch(reject);
                    }
                };

                this._ws.onclose = (event) => {
                    this._onClose(event);
                    if (this._connectionState === ConnectionState.CONNECTING) {
                        reject(new Error(`Connection closed: ${event.code} - ${event.reason}`));
                    }
                };

                this._ws.onerror = (event) => {
                    this._onError(event);
                    reject(new Error('WebSocket connection error'));
                };

                this._ws.onmessage = (event) => {
                    this._onMessage(event);
                };

            } catch (error) {
                console.error('WebSocket connection failed:', error);
                this._connectionState = ConnectionState.DISCONNECTED;
                reject(error);
            }
        });
    }

    /**
     * 發送請求並等待響應（Promise 模式）
     * @param message 請求消息
     * @param timeout 超時時間（毫秒），默認 10000
     * @returns Promise<T> 響應數據
     */
    public request<T = any>(message: BaseMessage, timeout?: number): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this._ws) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const seq = ++this._messageSeq;
            message.timestamp = Date.now();
            message.seq = seq;

            // 獲取對應的響應類型
            const responseType = REQUEST_RESPONSE_MAP[message.type];
            if (!responseType) {
                // 沒有對應響應類型，直接發送不等待
                try {
                    this._ws.send(JSON.stringify(message));
                    resolve(undefined as T);
                } catch (error) {
                    reject(error);
                }
                return;
            }

            // 設置超時
            const timeoutMs = timeout ?? this._defaultTimeout;
            const timeoutId = window.setTimeout(() => {
                this._pendingRequests.delete(seq);
                reject(new Error(`Request timeout: ${message.type}`));
            }, timeoutMs);

            // 存儲待處理請求
            this._pendingRequests.set(seq, {
                resolve: (response: T) => {
                    clearTimeout(timeoutId);
                    resolve(response);
                },
                reject: (error: Error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                },
                timeout: timeoutId,
                responseType
            });

            // 發送消息
            try {
                this._ws.send(JSON.stringify(message));
            } catch (error) {
                this._pendingRequests.delete(seq);
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * 發送消息（不等待響應）
     */
    public send(message: BaseMessage): boolean {
        if (!this.isConnected || !this._ws) {
            console.warn('WebSocket not connected, message not sent');
            return false;
        }

        message.timestamp = Date.now();
        message.seq = ++this._messageSeq;

        try {
            this._ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Send message failed:', error);
            return false;
        }
    }

    /**
     * 監聽特定類型的消息（返回 Promise，只監聽一次）
     */
    public once<T = any>(messageType: MessageType, timeout?: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeoutMs = timeout ?? this._defaultTimeout;

            const timeoutId = window.setTimeout(() => {
                EventManager.instance.off(GameEvents.WS_MESSAGE, handler);
                reject(new Error(`Timeout waiting for: ${messageType}`));
            }, timeoutMs);

            const handler = (message: BaseMessage) => {
                if (message.type === messageType) {
                    clearTimeout(timeoutId);
                    EventManager.instance.off(GameEvents.WS_MESSAGE, handler);
                    resolve((message as any).data as T);
                }
            };

            EventManager.instance.on(GameEvents.WS_MESSAGE, handler);
        });
    }

    /**
     * 斷開連接
     */
    public disconnect(): void {
        this._stopHeartbeat();
        this._stopReconnect();
        this._rejectAllPending('Connection closed');

        if (this._ws) {
            this._ws.onopen = null;
            this._ws.onclose = null;
            this._ws.onerror = null;
            this._ws.onmessage = null;
            this._ws.close();
            this._ws = null;
        }

        this._connectionState = ConnectionState.DISCONNECTED;
        this._isAuthenticated = false;
    }

    /**
     * 重置狀態
     */
    public reset(): void {
        this.disconnect();
        this._reconnectAttempts = 0;
        this._messageSeq = 0;
    }

    private _onOpen(event: Event): void {
        console.log('WebSocket connected');
        this._connectionState = ConnectionState.CONNECTED;
        this._reconnectAttempts = 0;
        this._startHeartbeat();
        EventManager.instance.emit(GameEvents.WS_CONNECTED);
    }

    private _onClose(event: CloseEvent): void {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        this._connectionState = ConnectionState.DISCONNECTED;
        this._isAuthenticated = false;
        this._stopHeartbeat();
        this._rejectAllPending('Connection closed');

        EventManager.instance.emit(GameEvents.WS_DISCONNECTED, {
            code: event.code,
            reason: event.reason
        });

        if (event.code !== 1000) {
            this._scheduleReconnect();
        }
    }

    private _onError(event: Event): void {
        console.error('WebSocket error:', event);
        EventManager.instance.emit(GameEvents.WS_ERROR, event);
    }

    private _onMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data) as BaseMessage;

            // 檢查是否有待處理的請求匹配此響應
            this._handlePendingResponse(message);

            // 廣播消息事件
            EventManager.instance.emit(GameEvents.WS_MESSAGE, message);
        } catch (error) {
            console.error('Parse message failed:', error, event.data);
        }
    }

    private _handlePendingResponse(message: BaseMessage): void {
        // 遍歷待處理請求，找到匹配的響應類型
        for (const [seq, pending] of this._pendingRequests) {
            if (message.type === pending.responseType) {
                // 找到匹配的請求
                this._pendingRequests.delete(seq);

                const data = (message as any).data;
                if (data?.success === false) {
                    pending.reject(new Error(data.error || 'Request failed'));
                } else {
                    pending.resolve(data);
                }
                return;
            }
        }
    }

    private _rejectAllPending(reason: string): void {
        for (const [seq, pending] of this._pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(reason));
        }
        this._pendingRequests.clear();
    }

    private _startHeartbeat(): void {
        this._stopHeartbeat();
        this._heartbeatTimer = window.setInterval(() => {
            this.send({
                type: MessageType.HEARTBEAT,
                timestamp: Date.now()
            });
        }, this._heartbeatInterval);
    }

    private _stopHeartbeat(): void {
        if (this._heartbeatTimer !== null) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    private _scheduleReconnect(): void {
        if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }

        this._stopReconnect();
        this._connectionState = ConnectionState.RECONNECTING;
        this._reconnectAttempts++;

        console.log(`Reconnecting in ${this._reconnectInterval}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`);

        this._reconnectTimer = window.setTimeout(() => {
            this.connect(this._serverUrl, this._authToken);
        }, this._reconnectInterval);
    }

    private _stopReconnect(): void {
        if (this._reconnectTimer !== null) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
    }

    // ===== Getters =====

    public get isConnected(): boolean {
        return this._connectionState === ConnectionState.CONNECTED &&
               this._ws !== null &&
               this._ws.readyState === WebSocket.OPEN;
    }

    public get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    public get isReady(): boolean {
        return this.isConnected && (this._isAuthenticated || !this._authToken);
    }

    public get connectionState(): ConnectionState {
        return this._connectionState;
    }

    public get serverUrl(): string {
        return this._serverUrl;
    }

    // ===== Setters =====

    public setReconnectConfig(maxAttempts: number, interval: number): void {
        this._maxReconnectAttempts = maxAttempts;
        this._reconnectInterval = interval;
    }

    public setHeartbeatInterval(interval: number): void {
        this._heartbeatInterval = interval;
    }

    public setDefaultTimeout(timeout: number): void {
        this._defaultTimeout = timeout;
    }
}
