import { _decorator, AssetManager, Component, director, error, ProgressBar, Button } from 'cc';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('LoadManager')
export class LoadManager extends Manager {
    private static clubScene: string = "Scene/ClubScene";
    public static gameScene: string = "Scene/GameScene";
    @property({ type: ProgressBar }) private progressBar: ProgressBar;
    @property({ type: Button }) private startGame: Button;
    private finishedArr: number[] = [0, 0];
    private totalArr: number[] = [0, 0];

    async start() {
        this.progressBar.node.active = true;
        this.startGame.node.active = false;
        this.startGame.node.on(Button.EventType.CLICK, LoadManager.runGameScene.bind(this, LoadManager.clubScene), this);
        await this.getAPI();
        this.preloadGameScene();
    }

    update(deltaTime: number) {

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
        director.preloadScene(LoadManager.clubScene, (finished: number, total: number, item: AssetManager.RequestItem) => {
            this.totalArr[0] = total;
            this.finishedArr[0] = finished;
            this.showprogressBar();
        }, (err: Error) => {
            if (err) {
                error(err);
            }
        });
        director.preloadScene(LoadManager.gameScene, (finished: number, total: number, item: AssetManager.RequestItem) => {
            this.totalArr[1] = total;
            this.finishedArr[1] = finished;
            this.showprogressBar();
        }, (err: Error) => {
            if (err) {
                error(err);
            }
        });
    }

    showprogressBar() {
        const finished = this.finishedArr[0] + this.finishedArr[1];
        const total = this.totalArr[0] + this.totalArr[1];
        const progres = finished / total;
        this.progressBar.node.active = true;
        this.progressBar.progress = progres;
        if(progres >= 1) {
            this.progressBar.node.active = false;
            this.startGame.node.active = true;
        }
    }

    /**
     * 運行場景
     * @param scene 場景名稱
     * @param self 按鈕自身
     */
    static runGameScene(scene: string, self: Button): void {
        director.loadScene(scene);
    }
}


