/**
 * 倍數數據模型
 */
export class MultipleModel {
    private _currentMultiple: number = 1.00;
    private _startTime: number = 0;
    private _growthRate: number = 0.06;
    private _isGrowing: boolean = false;

    /**
     * 當前倍數
     */
    public get currentMultiple(): number {
        return this._currentMultiple;
    }

    /**
     * 增長率
     */
    public get growthRate(): number {
        return this._growthRate;
    }

    /**
     * 是否正在增長
     */
    public get isGrowing(): boolean {
        return this._isGrowing;
    }

    /**
     * 設置當前倍數（來自服務器同步）
     */
    public setMultiple(value: number): void {
        this._currentMultiple = value;
    }

    /**
     * 設置增長率
     */
    public setGrowthRate(rate: number): void {
        this._growthRate = rate;
    }

    /**
     * 開始增長
     */
    public startGrowth(): void {
        this._startTime = Date.now();
        this._currentMultiple = 1.00;
        this._isGrowing = true;
    }

    /**
     * 停止增長
     */
    public stopGrowth(): void {
        this._isGrowing = false;
    }

    /**
     * 計算本地倍數（用於平滑顯示）
     * 實際倍數以服務器為準
     */
    public calculateLocalMultiple(): number {
        if (this._startTime === 0 || !this._isGrowing) {
            return this._currentMultiple;
        }

        const elapsed = (Date.now() - this._startTime) / 1000;
        // 指數增長公式：M(t) = e^(growthRate * t)
        return Math.exp(this._growthRate * elapsed);
    }

    /**
     * 重置狀態
     */
    public reset(): void {
        this._currentMultiple = 1.00;
        this._startTime = 0;
        this._isGrowing = false;
    }

    /**
     * 格式化倍數顯示
     */
    public formatMultiple(value?: number): string {
        const v = value ?? this._currentMultiple;
        return v.toFixed(2) + 'x';
    }

    /**
     * 獲取已運行時間（毫秒）
     */
    public getElapsedTime(): number {
        if (this._startTime === 0) return 0;
        return Date.now() - this._startTime;
    }

    /**
     * 根據倍數獲取顏色類型
     */
    public getColorType(multiple?: number): string {
        const m = multiple ?? this._currentMultiple;
        if (m < 2.0) return 'red';
        if (m < 5.0) return 'yellow';
        if (m < 10.0) return 'green';
        return 'blue';
    }
}
