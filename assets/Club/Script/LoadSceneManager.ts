import {
    _decorator,
    Component,
    director,
    Label,
    Button,
    ProgressBar,
    view,
    macro,
    assetManager,
    AssetManager,
    SceneAsset
} from 'cc';
import { GameController } from '../../Script/Controller/GameController';

const { ccclass, property } = _decorator;

/**
 * Bootstrap：bundle + 所有 scene 同時併發下載，進度條顯示合併進度。
 * 全部資源下載完才呼叫 GameController.connect()；連線成功才開啟 Start 按鈕。
 */
@ccclass('LoadSceneManager')
export class LoadSceneManager extends Component {
    private readonly mainBundleName = 'main';

    @property({ type: ProgressBar })
    private progressBar: ProgressBar = null;

    @property({ type: Label })
    private progressLabel: Label = null;

    @property({ type: Button })
    private startBtn: Button = null;

    private readonly scenes = ['RoomScene', 'GameScene'];
    /** 單一進度向量：[bundle, ...scenes]；每個元素 0~1，最後平均 = 進度條值。 */
    private unitProgress: number[] = [];
    private preloadedSceneAssets: (SceneAsset | null)[] = [];

    start() {
        view.resizeWithBrowserSize(true);
        view.setOrientation(macro.ORIENTATION_LANDSCAPE);
        this.startBtn.node.active = false;
        this.startBtn.node.on(Button.EventType.CLICK, this.onStartGame, this);
        this.bootstrap();
    }

    private async bootstrap() {
        // bundle = 1 unit，每個 scene = 1 unit；併發推進共用 unitProgress 向量
        this.unitProgress = new Array(1 + this.scenes.length).fill(0);
        this.preloadedSceneAssets = this.scenes.map(() => null);
        this.updateProgress();

        try {
            const bundle = await this.loadBundle(this.mainBundleName, 0);
            await Promise.all(
                this.scenes.map((scene, index) => this.loadSceneAsset(bundle, scene, index)),
            );
            await GameController.getInstance().connect();
            await GameController.getInstance().roomList();
            await GameController.getInstance().walletBalance();
            this.startBtn.node.active = true;
        } catch (err) {
            console.error('[LoadSceneManager] bootstrap failed', err);
            // TODO: 顯示重試 UI；現在先 log
        }
    }

    /** 載入 bundle；bundle 沒有 progress callback，完成時直接寫 1。 */
    private loadBundle(name: string, unitIndex: number): Promise<AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            assetManager.loadBundle(name, (err: Error | null, bundle: AssetManager.Bundle) => {
                if (err || !bundle) {
                    reject(err ?? new Error(`load bundle failed: ${name}`));
                    return;
                }
                this.unitProgress[unitIndex] = 1;
                this.updateProgress();
                resolve(bundle);
            });
        });
    }

    /** 載入單一 scene；scene 有 progress callback，loading 中持續更新對應 unit。 */
    private loadSceneAsset(bundle: AssetManager.Bundle, scene: string, sceneIndex: number): Promise<SceneAsset> {
        const unitIndex = 1 + sceneIndex; // unitProgress[0] 給 bundle
        return new Promise((resolve, reject) => {
            bundle.loadScene(
                scene,
                (completedCount: number, totalCount: number) => {
                    if (!this.node?.isValid) return;
                    const progress = totalCount > 0 ? completedCount / totalCount : 0;
                    this.unitProgress[unitIndex] = Math.min(Math.max(progress, 0), 1);
                    this.updateProgress();
                },
                (err: Error | null, sceneAsset: SceneAsset | null) => {
                    if (!this.node?.isValid) return;
                    if (err || !sceneAsset) {
                        reject(err ?? new Error(`preload scene failed: ${scene}`));
                        return;
                    }
                    this.preloadedSceneAssets[sceneIndex] = sceneAsset;
                    this.unitProgress[unitIndex] = 1;
                    this.updateProgress();
                    resolve(sceneAsset);
                },
            );
        });
    }

    /** 進度 = unitProgress 平均。 */
    private updateProgress() {
        if (!this.progressBar || !this.progressLabel || this.unitProgress.length === 0) {
            return;
        }
        const total = this.unitProgress.reduce((sum, value) => sum + value, 0) / this.unitProgress.length;
        this.progressBar.progress = total;
        this.progressLabel.string = `${Math.floor(total * 100)}%`;
    }

    private onStartGame() {
        director.loadScene('RoomScene');
    }
}
