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
import { BUILD } from 'cc/env';
// import { WebsocketManager } from '../../Script/Model/WebsocketManager';
import { GameData } from '../../Script/Model/GameData';
import { GameController } from '../../Script/Controller/GameController';

const { ccclass, property } = _decorator;

@ccclass('LoadSceneManager')
export class LoadSceneManager extends Component {
    private readonly mainBundleName = 'main';
    private static readonly LOCALE = 'zh-TW';

    @property({ type: ProgressBar })
    private progressBar: ProgressBar = null;

    @property({ type: Label })
    private progressLabel: Label = null;

    @property({ type: Button })
    private startBtn: Button = null;

    private readonly scenes = ['RoomScene', 'GameScene'];
    private sceneProgress: number[] = [];
    private preloadedSceneAssets: (SceneAsset | null)[] = [];
    private hasRequestedSocketConnect = false;

    start() {
        view.resizeWithBrowserSize(true);
        view.setOrientation(macro.ORIENTATION_LANDSCAPE);
        this.startBtn.node.active = false;
        this.startBtn.node.on(Button.EventType.CLICK, this.onStartGame, this);
        this.preloadScenes();
    }

    onDestroy() {
        this.startBtn?.node?.off(Button.EventType.CLICK, this.onStartGame, this);
    }

    private preloadScenes() {
        this.sceneProgress = this.scenes.map(() => 0);
        this.preloadedSceneAssets = this.scenes.map(() => null);

        assetManager.loadBundle(this.mainBundleName, (bundleError: Error | null, bundle: AssetManager.Bundle) => {
            if (bundleError || !bundle) {
                console.error(`[LoadSceneManager] load bundle failed: ${this.mainBundleName}`, bundleError);
                return;
            }

            this.scenes.forEach((scene, index) => {
                this.preloadSceneAsset(bundle, scene, index);
            });
        });
    }

    private preloadSceneAsset(bundle: AssetManager.Bundle, scene: string, index: number) {
        console.info(`[LoadSceneManager] preload start: ${scene}`);

        bundle.loadScene(
            scene,
            (completedCount: number, totalCount: number) => {
                if (!this.node?.isValid) return;
                const progress = totalCount > 0 ? completedCount / totalCount : 0;
                this.sceneProgress[index] = Math.min(Math.max(progress, 0), 1);
                this.updateProgress();
            },
            (error: Error | null, sceneAsset: SceneAsset | null) => {
                if (!this.node?.isValid) return;
                if (error || !sceneAsset) {
                    console.error(`[LoadSceneManager] preload failed: ${scene}`, error);
                    return;
                }

                this.preloadedSceneAssets[index] = sceneAsset;
                this.sceneProgress[index] = 1;
                this.updateProgress();
                console.info(`[LoadSceneManager] preload done: ${scene}`);
                this.checkAllLoaded();
            }
        );
    }

    private updateProgress() {
        if (!this.progressBar || !this.progressLabel || this.scenes.length === 0) {
            return;
        }

        const total = this.sceneProgress.reduce((a, b) => a + b, 0) / this.scenes.length;
        this.progressBar.progress = total;
        this.progressLabel.string = `${Math.floor(total * 100)}%`;
    }

    private checkAllLoaded() {
        if (this.hasRequestedSocketConnect) {
            return;
        }

        if (this.sceneProgress.length === this.scenes.length && this.sceneProgress.every((p) => p >= 1)) {
            this.hasRequestedSocketConnect = true;
            const started = this.connectWebSocket();
            if (!started) {
                this.hasRequestedSocketConnect = false;
            }
        }
    }

    private connectWebSocket(): boolean {
        const gameData = GameData.getInstance();
        let wsUrl: string;
        let token: string;

        if (BUILD && typeof window !== 'undefined') {
            const config = (window as any).GAME_CONFIG ?? {};
            const configWsUrl = typeof config.wsUrl === 'string' ? config.wsUrl.trim() : '';
            const configToken = typeof config.token === 'string' ? config.token.trim() : '';

            if (!configWsUrl || !configToken) {
                console.error('[LoadSceneManager] BUILD mode requires window.GAME_CONFIG.wsUrl and window.GAME_CONFIG.token');
                return false;
            }

            wsUrl = configWsUrl;
            token = configToken;
        } else {
            wsUrl = gameData.FallbackWsUrl;
            token = gameData.DevToken;
        }

        // 在 WS 連線前先實例化 GameController，確保 Server* 事件有訂閱者。
        GameController.getInstance();
        // WebsocketManager.getInstance().connect(
        //     this.buildWebSocketUrl(wsUrl, token),
        //     () => {
        //         if (this.startBtn?.node?.isValid) {
        //             this.startBtn.node.active = true;
        //         }
        //     },
        //     (_event: CloseEvent) => {
        //         // no-op
        //     }
        // );

        // WS 已停用 — 直接顯示開始按鈕讓 UI 流程可繼續
        if (this.startBtn?.node?.isValid) {
            this.startBtn.node.active = true;
        }

        return true;
    }

    private buildWebSocketUrl(wsUrl: string, token: string): string {
        try {
            const url = new URL(wsUrl);
            url.searchParams.set('token', token);
            url.searchParams.set('locale', LoadSceneManager.LOCALE);
            return url.toString();
        } catch {
            const separator = wsUrl.includes('?')
                ? (wsUrl.endsWith('?') || wsUrl.endsWith('&') ? '' : '&')
                : '?';
            return `${wsUrl}${separator}token=${encodeURIComponent(token)}&locale=${encodeURIComponent(LoadSceneManager.LOCALE)}`;
        }
    }

    private onStartGame() {
        director.loadScene('RoomScene');
    }
}
