import { _decorator, Component, Label, ProgressBar, director, Button } from 'cc';
import { WebSocketManager } from '../Net/WebSocketManager';
import { MessageHandler } from '../Net/MessageHandler';

const { ccclass, property } = _decorator;

/**
 * Loading 場景管理器
 * 負責連接服務器，連線成功後切換到遊戲場景
 */
@ccclass('LoadManager')
export class LoadManager extends Component {

    @property
    public serverUrl: string = 'wss://localhost:7070/ws';

    @property
    public authToken: string = '';

    @property
    public gameSceneName: string = 'Game';

    @property
    public clubSceneName: string = 'Club';

    @property(Label)
    public statusLabel: Label = null;

    @property(ProgressBar)
    public progressBar: ProgressBar = null;

    @property(Button)
    public retryButton: Button = null;

    @property(Button)
    public startButton: Button = null;

    private _isConnecting: boolean = false;

    protected onLoad(): void {
        // 初始化消息處理器
        MessageHandler.instance.init();

        // 隱藏按鈕
        if (this.retryButton) {
            this.retryButton.node.active = false;
            this.retryButton.node.on('click', this._onRetryClick, this);
        }
        if (this.startButton) {
            this.startButton.node.active = false;
            this.startButton.node.on('click', this._onStartClick, this);
        }
    }

    protected start(): void {
        this._startConnect();
    }

    private async _startConnect(): Promise<void> {
        if (this._isConnecting) return;
        this._isConnecting = true;

        this._updateStatus('正在連接服務器...', 0.2);
        this._hideButtons();

        try {
            // 連接並認證
            await WebSocketManager.instance.connect(this.serverUrl, this.authToken);

            this._updateStatus('連接成功！', 1.0);
            this._isConnecting = false;

            // 顯示開始按鈕或自動進入遊戲
            if (this.startButton) {
                this.startButton.node.active = true;
            } else {
                // 沒有開始按鈕，延遲後自動進入
                this.scheduleOnce(() => {
                    this._enterGame();
                }, 0.5);
            }

        } catch (error) {
            console.error('Connection failed:', error);
            this._updateStatus(`連接失敗: ${error.message || error}`, 0);
            this._isConnecting = false;

            // 顯示重試按鈕
            if (this.retryButton) {
                this.retryButton.node.active = true;
            }
        }
    }

    private _onRetryClick(): void {
        this._startConnect();
    }

    private _onStartClick(): void {
        this._enterGame();
    }

    private _enterGame(): void {
        // 可以根據需要進入不同場景
        director.loadScene(this.gameSceneName);
    }

    private _enterClub(): void {
        director.loadScene(this.clubSceneName);
    }

    private _updateStatus(text: string, progress: number): void {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
        if (this.progressBar) {
            this.progressBar.progress = progress;
        }
    }

    private _hideButtons(): void {
        if (this.retryButton) {
            this.retryButton.node.active = false;
        }
        if (this.startButton) {
            this.startButton.node.active = false;
        }
    }

    /**
     * 設置服務器配置（可從外部調用）
     */
    public setServerConfig(url: string, token: string): void {
        this.serverUrl = url;
        this.authToken = token;
    }

    /**
     * 手動觸發連接
     */
    public connect(): Promise<void> {
        return this._startConnect();
    }
}
