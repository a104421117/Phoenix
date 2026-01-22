import { _decorator, Label, ProgressBar, Node, Color } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents, GameState } from '../Lib/Constants';
import { GameManager } from '../Control/GameManager';

const { ccclass, property } = _decorator;

/**
 * 倒計時管理器
 */
@ccclass('TimeManager')
export class TimeManager extends BaseManager {
    private static _inst: TimeManager;
    public static get instance(): TimeManager {
        return TimeManager._inst;
    }

    @property(Node)
    private timeNode: Node = null;

    @property(Label)
    private timeLabel: Label = null;

    @property(ProgressBar)
    private progressBar: ProgressBar = null;

    @property(Label)
    private statusLabel: Label = null;

    private _totalDuration: number = 10;

    // 顏色配置
    private readonly COLOR_NORMAL = new Color(255, 255, 255);
    private readonly COLOR_WARNING = new Color(255, 193, 7);
    private readonly COLOR_DANGER = new Color(255, 77, 77);

    protected onManagerLoad(): void {
        TimeManager._inst = this;
    }

    public init(): void {
        this._totalDuration = GameManager.instance.config.wagerDuration;
        this._registerEvents();
        this._hide();
    }

    public reset(): void {
        this._updateDisplay(this._totalDuration);
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.TIME_UPDATE, this._onTimeUpdate, this);
        EventManager.instance.on(GameEvents.GAME_STATE_CHANGED, this._onStateChanged, this);
        EventManager.instance.on(GameEvents.WAGER_START, this._onWagerStart, this);
    }

    private _onStateChanged(data: { from: GameState; to: GameState }): void {
        switch (data.to) {
            case GameState.WAGER:
                this._show();
                break;
            case GameState.RUNNING:
            case GameState.CRASHED:
            case GameState.SETTLE:
            case GameState.IDLE:
                this._hide();
                break;
        }
    }

    private _onWagerStart(data: { countdown: number }): void {
        this._totalDuration = data.countdown;
        this._updateDisplay(data.countdown);
        this._show();
    }

    private _onTimeUpdate(remaining: number): void {
        this._updateDisplay(remaining);
    }

    private _updateDisplay(remaining: number): void {
        const seconds = Math.ceil(remaining);

        if (this.timeLabel) {
            this.timeLabel.string = seconds.toString() + 's';

            // 根據剩餘時間更新顏色
            if (seconds <= 3) {
                this.timeLabel.color = this.COLOR_DANGER;
            } else if (seconds <= 5) {
                this.timeLabel.color = this.COLOR_WARNING;
            } else {
                this.timeLabel.color = this.COLOR_NORMAL;
            }
        }

        if (this.progressBar) {
            this.progressBar.progress = remaining / this._totalDuration;
        }

        if (this.statusLabel) {
            if (seconds <= 3) {
                this.statusLabel.string = '即將開始!';
                this.statusLabel.color = this.COLOR_DANGER;
            } else {
                this.statusLabel.string = '押注中...';
                this.statusLabel.color = this.COLOR_NORMAL;
            }
        }
    }

    private _show(): void {
        if (this.timeNode) {
            this.timeNode.active = true;
        }
        if (this.timeLabel) {
            this.timeLabel.node.active = true;
        }
        if (this.progressBar) {
            this.progressBar.node.active = true;
        }
    }

    private _hide(): void {
        if (this.timeNode) {
            this.timeNode.active = false;
        }
        if (this.timeLabel) {
            this.timeLabel.node.active = false;
        }
        if (this.progressBar) {
            this.progressBar.node.active = false;
        }
    }

    /**
     * 設置倒計時總時長
     */
    public setTotalDuration(duration: number): void {
        this._totalDuration = duration;
    }
}
