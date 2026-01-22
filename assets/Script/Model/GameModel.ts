import { GameState } from '../Lib/Constants';

/**
 * 遊戲狀態數據模型
 */
export class GameModel {
    private _currentState: GameState = GameState.IDLE;
    private _roundId: string = '';
    private _crashPoint: number = 0;
    private _wagerEndTime: number = 0;

    /**
     * 當前遊戲狀態
     */
    public get currentState(): GameState {
        return this._currentState;
    }

    /**
     * 當前回合 ID
     */
    public get roundId(): string {
        return this._roundId;
    }

    /**
     * 崩潰點倍數
     */
    public get crashPoint(): number {
        return this._crashPoint;
    }

    /**
     * 押注結束時間
     */
    public get wagerEndTime(): number {
        return this._wagerEndTime;
    }

    /**
     * 更新遊戲狀態
     */
    public updateState(state: string, roundId: string): void {
        this._currentState = state as GameState;
        this._roundId = roundId;

        if (state === GameState.WAGER) {
            this._crashPoint = 0;
        }
    }

    /**
     * 設置崩潰點
     */
    public setCrashPoint(point: number): void {
        this._crashPoint = point;
    }

    /**
     * 設置押注結束時間
     */
    public setWagerEndTime(time: number): void {
        this._wagerEndTime = time;
    }

    /**
     * 重置狀態
     */
    public reset(): void {
        this._currentState = GameState.IDLE;
        this._roundId = '';
        this._crashPoint = 0;
        this._wagerEndTime = 0;
    }

    /**
     * 是否處於押注階段
     */
    public isWagerPhase(): boolean {
        return this._currentState === GameState.WAGER;
    }

    /**
     * 是否處於運行階段
     */
    public isRunningPhase(): boolean {
        return this._currentState === GameState.RUNNING;
    }

    /**
     * 是否已崩潰
     */
    public isCrashed(): boolean {
        return this._currentState === GameState.CRASHED;
    }

    /**
     * 是否處於結算階段
     */
    public isSettlePhase(): boolean {
        return this._currentState === GameState.SETTLE;
    }

    /**
     * 是否空閒
     */
    public isIdle(): boolean {
        return this._currentState === GameState.IDLE;
    }
}
