import { _decorator, Component, Node, sp, Vec3, tween, UIOpacity } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, gameEvents, GameEvent } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('PhoenixController')
export class PhoenixController extends Component {
    @property(sp.Skeleton)
    eggSpine: sp.Skeleton = null;

    @property(sp.Skeleton)
    phoenixSpine: sp.Skeleton = null;

    @property(sp.Skeleton)
    startVfxSpine: sp.Skeleton = null;

    @property(sp.Skeleton)
    featherSpine: sp.Skeleton = null;

    @property(Node)
    phoenixContainer: Node = null;

    // 飛行軌跡設定
    @property
    flyStartY: number = 0;

    @property
    flyMaxY: number = 400;

    @property
    flyAmplitude: number = 30;

    // 狀態
    private _isFlying: boolean = false;
    private _flyTime: number = 0;
    private _initialPos: Vec3 = new Vec3();

    onLoad() {
        // 監聽遊戲事件
        gameEvents.on(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.on(GameEvent.MULTIPLIER_UPDATED, this.onMultiplierUpdated, this);

        // 保存初始位置
        if (this.phoenixContainer) {
            this._initialPos = this.phoenixContainer.position.clone();
        }

        // 初始顯示蛋
        this.showEgg();
    }

    onDestroy() {
        gameEvents.off(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.off(GameEvent.MULTIPLIER_UPDATED, this.onMultiplierUpdated, this);
    }

    private onGameStateChanged(state: number) {
        switch (state) {
            case GameConfig.STATE_BETTING:
                this.showEgg();
                break;
            case GameConfig.STATE_FLYING:
                // startFlying 會被 GameManager 直接調用
                break;
            case GameConfig.STATE_CRASHED:
                // crash 會被 GameManager 直接調用
                break;
        }
    }

    private onMultiplierUpdated(multiplier: number) {
        if (this._isFlying) {
            this.updateFlyPosition(multiplier);
        }
    }

    /**
     * 顯示蛋狀態
     */
    showEgg() {
        this._isFlying = false;

        // 重置位置
        if (this.phoenixContainer) {
            this.phoenixContainer.setPosition(this._initialPos);
        }

        // 顯示蛋，隱藏鳳凰
        if (this.eggSpine) {
            this.eggSpine.node.active = true;
            this.playAnimation(this.eggSpine, 'idle', true);
        }

        if (this.phoenixSpine) {
            this.phoenixSpine.node.active = false;
        }

        if (this.startVfxSpine) {
            this.startVfxSpine.node.active = false;
        }
    }

    /**
     * 開始飛行
     */
    startFlying() {
        this._isFlying = true;
        this._flyTime = 0;

        // 播放開始特效
        if (this.startVfxSpine) {
            this.startVfxSpine.node.active = true;
            this.playAnimation(this.startVfxSpine, 'StarGane-VFX', false);
        }

        // 隱藏蛋，顯示鳳凰
        if (this.eggSpine) {
            this.eggSpine.node.active = false;
        }

        if (this.phoenixSpine) {
            this.phoenixSpine.node.active = true;
            this.playAnimation(this.phoenixSpine, 'fly', true);
        }

        console.log('[PhoenixController] 開始飛行');
    }

    /**
     * 更新飛行位置
     */
    private updateFlyPosition(multiplier: number) {
        if (!this.phoenixContainer) return;

        this._flyTime += 0.016; // 約60fps

        // Y軸位置：根據倍數上升
        // 使用對數函數讓高倍數時上升變慢
        const normalizedMult = Math.log(multiplier) / Math.log(GameConfig.MAX_MULTIPLIER);
        const targetY = this.flyStartY + normalizedMult * (this.flyMaxY - this.flyStartY);

        // 加入上下飄動效果
        const wobble = Math.sin(this._flyTime * 3) * this.flyAmplitude;

        const newPos = new Vec3(
            this._initialPos.x,
            targetY + wobble,
            this._initialPos.z
        );

        this.phoenixContainer.setPosition(newPos);
    }

    /**
     * 爆炸
     */
    crash() {
        this._isFlying = false;

        // 播放爆炸動畫
        if (this.phoenixSpine) {
            // 嘗試播放爆炸動畫，如果沒有則播放消失效果
            const hasExplodeAnim = this.playAnimation(this.phoenixSpine, 'explode', false);
            if (!hasExplodeAnim) {
                // 使用透明度漸變代替
                const opacity = this.phoenixSpine.node.getComponent(UIOpacity);
                if (opacity) {
                    tween(opacity)
                        .to(0.5, { opacity: 0 })
                        .call(() => {
                            this.phoenixSpine.node.active = false;
                            opacity.opacity = 255;
                        })
                        .start();
                }
            }
        }

        // 播放羽毛特效
        if (this.featherSpine) {
            this.featherSpine.node.active = true;
            this.playAnimation(this.featherSpine, 'animation', false);
        }

        console.log('[PhoenixController] 爆炸!');
    }

    /**
     * 播放動畫
     */
    private playAnimation(skeleton: sp.Skeleton, animName: string, loop: boolean): boolean {
        if (!skeleton) return false;

        try {
            skeleton.setAnimation(0, animName, loop);
            return true;
        } catch (e) {
            console.warn(`[PhoenixController] 動畫 '${animName}' 不存在`);
            return false;
        }
    }

    update(deltaTime: number) {
        // 更新飛行時間（用於飄動效果）
        if (this._isFlying) {
            this._flyTime += deltaTime;
        }
    }
}
