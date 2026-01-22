import { _decorator, Node, sp } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents, GameState } from '../Lib/Constants';

const { ccclass, property } = _decorator;

/**
 * Spine 動畫管理器
 */
@ccclass('SpineManager')
export class SpineManager extends BaseManager {
    private static _inst: SpineManager;
    public static get instance(): SpineManager {
        return SpineManager._inst;
    }

    @property(sp.Skeleton)
    private eggSpine: sp.Skeleton = null;

    @property(sp.Skeleton)
    private phoenixSpine: sp.Skeleton = null;

    @property(sp.Skeleton)
    private featherSpine: sp.Skeleton = null;

    @property(sp.Skeleton)
    private startSpine: sp.Skeleton = null;

    // 動畫名稱（根據實際 Spine 動畫調整）
    @property
    private animIdle: string = 'idle';

    @property
    private animFlying: string = 'flying';

    @property
    private animCrash: string = 'crash';

    @property
    private animStart: string = 'start';

    @property
    private animHatch: string = 'hatch';

    private _baseTimeScale: number = 1;

    protected onManagerLoad(): void {
        SpineManager._inst = this;
    }

    public init(): void {
        this._registerEvents();
        this._playIdle();
    }

    public reset(): void {
        this._playIdle();
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.GAME_STATE_CHANGED, this._onStateChanged, this);
        EventManager.instance.on(GameEvents.MULTIPLE_UPDATE, this._onMultipleUpdate, this);
        EventManager.instance.on(GameEvents.WAGER_START, this._onWagerStart, this);
    }

    private _onStateChanged(data: { from: GameState; to: GameState }): void {
        switch (data.to) {
            case GameState.IDLE:
                this._playIdle();
                break;
            case GameState.WAGER:
                this._playWager();
                break;
            case GameState.RUNNING:
                this._playFlying();
                break;
            case GameState.CRASHED:
                this._playCrash();
                break;
            case GameState.SETTLE:
                // 保持崩潰狀態或播放結算動畫
                break;
        }
    }

    private _onWagerStart(data: any): void {
        // 可以播放特殊的押注開始動畫
    }

    private _onMultipleUpdate(data: { multiple: number }): void {
        // 根據倍數調整動畫速度
        const speed = Math.min(1 + (data.multiple - 1) * 0.05, 2);
        this._setAnimationSpeed(speed);
    }

    private _playIdle(): void {
        this._showEgg();

        if (this.eggSpine) {
            this._safePlayAnimation(this.eggSpine, this.animIdle, true);
        }
    }

    private _playWager(): void {
        this._showEgg();

        if (this.eggSpine) {
            // 可以播放待機或輕微晃動動畫
            this._safePlayAnimation(this.eggSpine, this.animIdle, true);
        }

        if (this.startSpine) {
            this.startSpine.node.active = true;
            this._safePlayAnimation(this.startSpine, this.animStart, false);
        }
    }

    private _playFlying(): void {
        this._showPhoenix();

        // 播放孵化動畫（如果有）
        if (this.eggSpine && this.animHatch) {
            this._safePlayAnimation(this.eggSpine, this.animHatch, false);
        }

        // 延遲顯示鳳凰
        setTimeout(() => {
            if (this.phoenixSpine) {
                this.phoenixSpine.node.active = true;
                this._safePlayAnimation(this.phoenixSpine, this.animFlying, true);
            }
            if (this.featherSpine) {
                this.featherSpine.node.active = true;
                this._safePlayAnimation(this.featherSpine, this.animFlying, true);
            }
            if (this.eggSpine) {
                this.eggSpine.node.active = false;
            }
        }, 500);

        if (this.startSpine) {
            this.startSpine.node.active = false;
        }
    }

    private _playCrash(): void {
        if (this.phoenixSpine) {
            this._safePlayAnimation(this.phoenixSpine, this.animCrash, false);
        }
        if (this.featherSpine) {
            this._safePlayAnimation(this.featherSpine, this.animCrash, false);
        }
    }

    private _showEgg(): void {
        if (this.eggSpine) {
            this.eggSpine.node.active = true;
        }
        if (this.phoenixSpine) {
            this.phoenixSpine.node.active = false;
        }
        if (this.featherSpine) {
            this.featherSpine.node.active = false;
        }
        if (this.startSpine) {
            this.startSpine.node.active = false;
        }
    }

    private _showPhoenix(): void {
        // Phoenix 會在動畫過渡後顯示
    }

    private _setAnimationSpeed(speed: number): void {
        if (this.phoenixSpine) {
            this.phoenixSpine.timeScale = this._baseTimeScale * speed;
        }
        if (this.featherSpine) {
            this.featherSpine.timeScale = this._baseTimeScale * speed;
        }
    }

    private _safePlayAnimation(skeleton: sp.Skeleton, animName: string, loop: boolean): void {
        try {
            // 檢查動畫是否存在
            const data = skeleton.skeletonData;
            if (data) {
                skeleton.setAnimation(0, animName, loop);
            }
        } catch (error) {
            console.warn(`Animation "${animName}" not found or error:`, error);
        }
    }

    /**
     * 播放指定動畫
     */
    public playAnimation(spineType: 'egg' | 'phoenix' | 'feather' | 'start', animName: string, loop: boolean = true): void {
        let skeleton: sp.Skeleton | null = null;

        switch (spineType) {
            case 'egg':
                skeleton = this.eggSpine;
                break;
            case 'phoenix':
                skeleton = this.phoenixSpine;
                break;
            case 'feather':
                skeleton = this.featherSpine;
                break;
            case 'start':
                skeleton = this.startSpine;
                break;
        }

        if (skeleton) {
            this._safePlayAnimation(skeleton, animName, loop);
        }
    }

    /**
     * 設置基礎時間縮放
     */
    public setBaseTimeScale(scale: number): void {
        this._baseTimeScale = scale;
    }
}
