import { _decorator, Node, Label, Color, tween, Vec3 } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents, GameState } from '../Lib/Constants';
import { ModelManager } from '../Model/ModelManager';

const { ccclass, property } = _decorator;

/**
 * 倍數顯示管理器
 */
@ccclass('MultipleManager')
export class MultipleManager extends BaseManager {
    private static _inst: MultipleManager;
    public static get instance(): MultipleManager {
        return MultipleManager._inst;
    }

    @property(Label)
    private multipleLabel: Label = null;

    @property(Node)
    private crashNode: Node = null;

    @property(Label)
    private crashLabel: Label = null;

    @property(Label)
    private statusLabel: Label = null;

    // 顏色配置
    private readonly COLOR_NORMAL = new Color(255, 255, 255);
    private readonly COLOR_LOW = new Color(255, 77, 77);       // 紅色 < 2x
    private readonly COLOR_MID = new Color(255, 193, 7);       // 黃色 2x-5x
    private readonly COLOR_HIGH = new Color(76, 175, 80);      // 綠色 5x-10x
    private readonly COLOR_SUPER = new Color(33, 150, 243);    // 藍色 > 10x
    private readonly COLOR_CRASH = new Color(255, 0, 0);       // 崩潰紅色

    private _originalScale: Vec3 = new Vec3(1, 1, 1);

    protected onManagerLoad(): void {
        MultipleManager._inst = this;
        if (this.multipleLabel) {
            this._originalScale = this.multipleLabel.node.scale.clone();
        }
    }

    public init(): void {
        this._registerEvents();
        this._reset();
    }

    public reset(): void {
        this._reset();
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.MULTIPLE_UPDATE, this._onMultipleUpdate, this);
        EventManager.instance.on(GameEvents.GAME_CRASH, this._onGameCrash, this);
        EventManager.instance.on(GameEvents.GAME_STATE_CHANGED, this._onStateChanged, this);
    }

    private _onStateChanged(data: { from: GameState; to: GameState }): void {
        switch (data.to) {
            case GameState.IDLE:
                this._showIdle();
                break;
            case GameState.WAGER:
                this._reset();
                this._showWaiting();
                break;
            case GameState.RUNNING:
                this._showRunning();
                break;
            case GameState.CRASHED:
                // 由 _onGameCrash 處理
                break;
            case GameState.SETTLE:
                // 保持崩潰顯示
                break;
        }
    }

    private _onMultipleUpdate(data: { multiple: number }): void {
        this._updateDisplay(data.multiple);
    }

    private _onGameCrash(data: { crashPoint: number }): void {
        this._showCrash(data.crashPoint);
    }

    private _updateDisplay(multiple: number): void {
        if (!this.multipleLabel) return;

        this.multipleLabel.string = multiple.toFixed(2) + 'x';

        // 根據倍數更新顏色
        this.multipleLabel.color = this._getColorForMultiple(multiple);

        // 倍數越大，字體越大（動態縮放效果）
        const scale = Math.min(1 + (multiple - 1) * 0.02, 1.5);
        this.multipleLabel.node.setScale(
            this._originalScale.x * scale,
            this._originalScale.y * scale,
            this._originalScale.z
        );
    }

    private _getColorForMultiple(multiple: number): Color {
        if (multiple < 2.0) return this.COLOR_LOW;
        if (multiple < 5.0) return this.COLOR_MID;
        if (multiple < 10.0) return this.COLOR_HIGH;
        return this.COLOR_SUPER;
    }

    private _showCrash(crashPoint: number): void {
        if (this.multipleLabel) {
            this.multipleLabel.string = crashPoint.toFixed(2) + 'x';
            this.multipleLabel.color = this.COLOR_CRASH;

            // 崩潰動畫
            tween(this.multipleLabel.node)
                .to(0.1, { scale: new Vec3(
                    this._originalScale.x * 1.3,
                    this._originalScale.y * 1.3,
                    this._originalScale.z
                )})
                .to(0.1, { scale: this._originalScale })
                .union()
                .repeat(2)
                .start();
        }

        if (this.crashNode) {
            this.crashNode.active = true;
        }
        if (this.crashLabel) {
            this.crashLabel.string = `CRASHED @ ${crashPoint.toFixed(2)}x`;
        }

        if (this.statusLabel) {
            this.statusLabel.string = '已崩潰';
            this.statusLabel.color = this.COLOR_CRASH;
        }
    }

    private _showIdle(): void {
        if (this.multipleLabel) {
            this.multipleLabel.string = '---';
            this.multipleLabel.color = this.COLOR_NORMAL;
            this.multipleLabel.node.setScale(this._originalScale);
        }
        if (this.crashNode) {
            this.crashNode.active = false;
        }
        if (this.statusLabel) {
            this.statusLabel.string = '等待中';
            this.statusLabel.color = this.COLOR_NORMAL;
        }
    }

    private _showWaiting(): void {
        if (this.multipleLabel) {
            this.multipleLabel.string = '準備開始';
            this.multipleLabel.color = this.COLOR_NORMAL;
            this.multipleLabel.node.setScale(this._originalScale);
        }
        if (this.crashNode) {
            this.crashNode.active = false;
        }
        if (this.statusLabel) {
            this.statusLabel.string = '押注中';
            this.statusLabel.color = this.COLOR_MID;
        }
    }

    private _showRunning(): void {
        if (this.crashNode) {
            this.crashNode.active = false;
        }
        if (this.statusLabel) {
            this.statusLabel.string = '運行中';
            this.statusLabel.color = this.COLOR_HIGH;
        }
    }

    private _reset(): void {
        if (this.multipleLabel) {
            this.multipleLabel.string = '1.00x';
            this.multipleLabel.color = this.COLOR_NORMAL;
            this.multipleLabel.node.setScale(this._originalScale);
        }
        if (this.crashNode) {
            this.crashNode.active = false;
        }
    }
}
