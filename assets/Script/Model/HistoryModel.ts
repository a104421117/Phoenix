/**
 * 歷史記錄接口
 */
export interface HistoryRecord {
    roundId: string;
    crashPoint: number;
    timestamp: number;
}

/**
 * 歷史記錄數據模型
 */
export class HistoryModel {
    private _records: HistoryRecord[] = [];
    private _maxRecords: number = 20;

    /**
     * 所有歷史記錄
     */
    public get records(): HistoryRecord[] {
        return [...this._records];
    }

    /**
     * 最近的記錄（前10條）
     */
    public get recentRecords(): HistoryRecord[] {
        return this._records.slice(0, 10);
    }

    /**
     * 記錄數量
     */
    public get count(): number {
        return this._records.length;
    }

    /**
     * 設置歷史記錄（從服務器同步）
     */
    public setRecords(records: HistoryRecord[]): void {
        this._records = records.slice(0, this._maxRecords);
    }

    /**
     * 添加新記錄
     */
    public addRecord(record: HistoryRecord): void {
        this._records.unshift(record);
        if (this._records.length > this._maxRecords) {
            this._records.pop();
        }
    }

    /**
     * 清空記錄
     */
    public clear(): void {
        this._records = [];
    }

    /**
     * 獲取顏色類型
     */
    public getColorType(crashPoint: number): string {
        if (crashPoint < 2.0) return 'red';
        if (crashPoint < 5.0) return 'yellow';
        if (crashPoint < 10.0) return 'green';
        return 'blue';
    }

    /**
     * 獲取平均崩潰點
     */
    public getAverageCrashPoint(): number {
        if (this._records.length === 0) return 0;
        const sum = this._records.reduce((acc, r) => acc + r.crashPoint, 0);
        return sum / this._records.length;
    }

    /**
     * 獲取最高崩潰點
     */
    public getMaxCrashPoint(): number {
        if (this._records.length === 0) return 0;
        return Math.max(...this._records.map(r => r.crashPoint));
    }

    /**
     * 獲取最低崩潰點
     */
    public getMinCrashPoint(): number {
        if (this._records.length === 0) return 0;
        return Math.min(...this._records.map(r => r.crashPoint));
    }

    /**
     * 統計各顏色類型數量
     */
    public getColorStats(): { red: number; yellow: number; green: number; blue: number } {
        const stats = { red: 0, yellow: 0, green: 0, blue: 0 };
        this._records.forEach(r => {
            const color = this.getColorType(r.crashPoint) as keyof typeof stats;
            stats[color]++;
        });
        return stats;
    }

    /**
     * 獲取連續低於某倍數的次數
     */
    public getConsecutiveBelowCount(threshold: number): number {
        let count = 0;
        for (const record of this._records) {
            if (record.crashPoint < threshold) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }
}
