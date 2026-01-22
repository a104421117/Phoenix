export interface TimerConfig {
    duration: number;           // 總時長（秒）
    interval?: number;          // 更新間隔（秒），默認 0.1
    onUpdate?: (remaining: number) => void;
    onComplete?: () => void;
}

/**
 * 計時器工具類
 */
export class Timer {
    private _remaining: number = 0;
    private _interval: number = 0.1;
    private _timerId: number | null = null;
    private _onUpdate?: (remaining: number) => void;
    private _onComplete?: () => void;
    private _isPaused: boolean = false;
    private _isRunning: boolean = false;

    /**
     * 開始計時
     */
    public start(config: TimerConfig): void {
        this.stop();
        this._remaining = config.duration;
        this._interval = config.interval ?? 0.1;
        this._onUpdate = config.onUpdate;
        this._onComplete = config.onComplete;
        this._isPaused = false;
        this._isRunning = true;
        this._tick();
    }

    private _tick(): void {
        if (this._isPaused || !this._isRunning) return;

        this._onUpdate?.(this._remaining);

        if (this._remaining <= 0) {
            this._isRunning = false;
            this._onComplete?.();
            return;
        }

        this._timerId = window.setTimeout(() => {
            this._remaining = Math.max(0, this._remaining - this._interval);
            this._tick();
        }, this._interval * 1000);
    }

    /**
     * 停止計時
     */
    public stop(): void {
        if (this._timerId !== null) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
        this._isRunning = false;
        this._isPaused = false;
    }

    /**
     * 暫停計時
     */
    public pause(): void {
        this._isPaused = true;
        if (this._timerId !== null) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
    }

    /**
     * 恢復計時
     */
    public resume(): void {
        if (this._isPaused && this._isRunning) {
            this._isPaused = false;
            this._tick();
        }
    }

    /**
     * 獲取剩餘時間
     */
    public get remaining(): number {
        return this._remaining;
    }

    /**
     * 是否正在運行
     */
    public get isRunning(): boolean {
        return this._isRunning && !this._isPaused;
    }

    /**
     * 是否已暫停
     */
    public get isPaused(): boolean {
        return this._isPaused;
    }
}

/**
 * 倍數計時器（用於平滑顯示倍數增長）
 */
export class MultipleTimer {
    private _startTime: number = 0;
    private _growthRate: number = 0.06;
    private _isRunning: boolean = false;
    private _animFrameId: number | null = null;
    private _onUpdate?: (multiple: number) => void;

    /**
     * 開始倍數增長
     */
    public start(growthRate: number, onUpdate: (multiple: number) => void): void {
        this.stop();
        this._startTime = Date.now();
        this._growthRate = growthRate;
        this._onUpdate = onUpdate;
        this._isRunning = true;
        this._update();
    }

    private _update(): void {
        if (!this._isRunning) return;

        const multiple = this.getCurrentMultiple();
        this._onUpdate?.(multiple);

        this._animFrameId = requestAnimationFrame(() => this._update());
    }

    /**
     * 獲取當前倍數
     */
    public getCurrentMultiple(): number {
        if (!this._isRunning || this._startTime === 0) return 1.00;
        const elapsed = (Date.now() - this._startTime) / 1000;
        return Math.exp(this._growthRate * elapsed);
    }

    /**
     * 停止
     */
    public stop(): void {
        this._isRunning = false;
        if (this._animFrameId !== null) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
    }

    public get isRunning(): boolean {
        return this._isRunning;
    }
}
