import { _decorator, Component, director, Label, Button, ProgressBar } from 'cc';
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

    private connectWebSocket() {
        new WebsocketManager(
            "ws://100.124.132.68:20001/connect?token=phoenix-test-e15bcb2770924204b8fc643b99af560d",
            () => {
                this.startBtn.node.active = true;
            },
            (event: CloseEvent) => { }
        );
    }

    private onStartGame() {
        director.loadScene('LobbyScene');
    }
}
