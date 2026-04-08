import { _decorator, Component, director, Label, Button, ProgressBar } from 'cc';
import { BUILD } from 'cc/env';
import { WebsocketManager } from '../../Script/Model/WebsocketManager';
const { ccclass, property } = _decorator;

@ccclass('LoadSceneManager')
export class LoadSceneManager extends Component {
    @property({ type: ProgressBar })
    private progressBar: ProgressBar = null;
    @property({ type: Label })
    private progressLabel: Label = null;
    @property({ type: Button })
    private startBtn: Button = null;

    private readonly scenes = ['LobbyScene', 'RoomScene', 'ClubScene', 'GameScene'];
    private sceneProgress: number[] = [0, 0, 0, 0];

    start() {
        this.startBtn.node.active = false;
        this.startBtn.node.on(Button.EventType.CLICK, this.onStartGame, this);
        this.preloadScenes();
    }

    private preloadScenes() {
        this.scenes.forEach((scene, index) => {
            director.preloadScene(scene,
                (completedCount, totalCount) => {
                    this.sceneProgress[index] = completedCount / totalCount;
                    this.updateProgress();
                },
                () => {
                    this.sceneProgress[index] = 1;
                    this.updateProgress();
                    this.checkAllLoaded();
                }
            );
        });
    }

    private updateProgress() {
        const total = this.sceneProgress.reduce((a, b) => a + b, 0) / this.scenes.length;
        this.progressBar.progress = total;
        this.progressLabel.string = `${Math.floor(total * 100)}%`;
    }

    private checkAllLoaded() {
        if (this.sceneProgress.every(p => p >= 1)) {
            this.connectWebSocket();
        }
    }

    @property({ tooltip: '開發用 token（正式環境由前台傳入）' })
    private devToken: string = 'phoenix-test-e15bcb2770924204b8fc643b99af560d';

    @property({ tooltip: '本地備用 WS URL（URL 參數 wsUrl 優先）' })
    private fallbackWsUrl: string = 'ws://100.124.132.68:20001/connect';

    private connectWebSocket() {
        let wsUrl: string;
        if (BUILD) {
            const config = (window as any).GAME_CONFIG ?? {};
            wsUrl = new URLSearchParams(window.location.search).get('wsUrl')
                 ?? config.wsUrl
                 ?? this.fallbackWsUrl;
        } else {
            wsUrl = this.fallbackWsUrl;
        }
        new WebsocketManager(
            `${wsUrl}?token=${this.devToken}`,
            () => {
                this.startBtn.node.active = true;
            },
            (_event: CloseEvent) => { }
        );
    }

    private onStartGame() {
        director.loadScene('LobbyScene');
    }
}
