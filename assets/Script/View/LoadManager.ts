import { _decorator, AssetManager, Component, director, error, ProgressBar, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadManager')
export class LoadManager extends Component {
    private gameScene: string = "Scene/GameScene";
    @property({ type: ProgressBar }) private progressBar: ProgressBar;
    @property({ type: Button }) private startGame: Button;
    async start() {
        this.init();
        await this.getAPI();
        this.preloadGameScene();
    }

    update(deltaTime: number) {

    }

    /**
     * 初始化
     */
    init(): void {
        this.progressBar.node.active = true;
        this.startGame.node.active = false;
        this.startGame.node.on(Button.EventType.CLICK, this.runGameScene.bind(this, this.gameScene), this);
    }

    /**
     * 取得API資料(待實作)
     * @returns 
     */
    getAPI(): Promise<void> {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * 預載入遊戲場景
     */
    preloadGameScene(): void {
        director.preloadScene(this.gameScene, (finished: number, total: number, item: AssetManager.RequestItem) => {
            const progres = finished / total;
            this.progressBar.progress = progres;
        }, (err: Error) => {
            if (err) {
                error(err);
            } else {
                this.progressBar.node.active = false;
                this.startGame.node.active = true;
            }
        });
    }

    /**
     * 運行場景
     * @param scene 場景名稱
     * @param self 按鈕自身
     */
    runGameScene(scene: string, self: Button): void {
        director.loadScene(scene);
    }
}


