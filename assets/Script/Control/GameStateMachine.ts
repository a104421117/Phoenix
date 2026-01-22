import { GameState } from '../Lib/Constants';

/**
 * 狀態處理器接口
 */
export interface StateHandler {
    onEnter?: () => void;
    onExit?: () => void;
    onUpdate?: (dt: number) => void;
}

/**
 * 遊戲狀態機
 */
export class GameStateMachine {
    private _currentState: GameState = GameState.IDLE;
    private _previousState: GameState = GameState.IDLE;
    private _stateHandlers: Map<GameState, StateHandler> = new Map();
    private _onStateChange?: (from: GameState, to: GameState) => void;
    private _isTransitioning: boolean = false;

    /**
     * 當前狀態
     */
    public get currentState(): GameState {
        return this._currentState;
    }

    /**
     * 上一個狀態
     */
    public get previousState(): GameState {
        return this._previousState;
    }

    /**
     * 是否正在轉換狀態
     */
    public get isTransitioning(): boolean {
        return this._isTransitioning;
    }

    /**
     * 註冊狀態處理器
     */
    public registerState(state: GameState, handler: StateHandler): void {
        this._stateHandlers.set(state, handler);
    }

    /**
     * 註銷狀態處理器
     */
    public unregisterState(state: GameState): void {
        this._stateHandlers.delete(state);
    }

    /**
     * 設置狀態變化回調
     */
    public setOnStateChange(callback: (from: GameState, to: GameState) => void): void {
        this._onStateChange = callback;
    }

    /**
     * 切換狀態
     */
    public changeState(newState: GameState): boolean {
        if (this._currentState === newState) {
            return false;
        }

        if (this._isTransitioning) {
            console.warn('State transition in progress, ignoring change to:', newState);
            return false;
        }

        this._isTransitioning = true;
        const oldState = this._currentState;

        try {
            // 退出當前狀態
            const currentHandler = this._stateHandlers.get(this._currentState);
            if (currentHandler?.onExit) {
                currentHandler.onExit();
            }

            // 保存狀態
            this._previousState = this._currentState;
            this._currentState = newState;

            // 進入新狀態
            const newHandler = this._stateHandlers.get(newState);
            if (newHandler?.onEnter) {
                newHandler.onEnter();
            }

            // 通知狀態變化
            if (this._onStateChange) {
                this._onStateChange(oldState, newState);
            }

            console.log(`State changed: ${oldState} -> ${newState}`);
            return true;
        } finally {
            this._isTransitioning = false;
        }
    }

    /**
     * 更新當前狀態
     */
    public update(dt: number): void {
        if (this._isTransitioning) return;

        const handler = this._stateHandlers.get(this._currentState);
        if (handler?.onUpdate) {
            handler.onUpdate(dt);
        }
    }

    /**
     * 檢查是否處於指定狀態
     */
    public isState(state: GameState): boolean {
        return this._currentState === state;
    }

    /**
     * 檢查是否處於指定的任一狀態
     */
    public isAnyState(...states: GameState[]): boolean {
        return states.includes(this._currentState);
    }

    /**
     * 強制設置狀態（不觸發事件）
     */
    public forceState(state: GameState): void {
        this._previousState = this._currentState;
        this._currentState = state;
    }

    /**
     * 重置狀態機
     */
    public reset(): void {
        this._currentState = GameState.IDLE;
        this._previousState = GameState.IDLE;
        this._isTransitioning = false;
    }

    /**
     * 獲取所有已註冊的狀態
     */
    public getRegisteredStates(): GameState[] {
        return Array.from(this._stateHandlers.keys());
    }
}
