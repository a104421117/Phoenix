type EventCallback = (...args: any[]) => void;

interface EventBinding {
    callback: EventCallback;
    target?: any;
}

/**
 * 全局事件管理器（單例模式）
 */
export class EventManager {
    private static _instance: EventManager;
    private _events: Map<string, EventBinding[]> = new Map();

    private constructor() {}

    public static get instance(): EventManager {
        if (!EventManager._instance) {
            EventManager._instance = new EventManager();
        }
        return EventManager._instance;
    }

    /**
     * 註冊事件監聽
     */
    public on(event: string, callback: EventCallback, target?: any): void {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event)!.push({ callback, target });
    }

    /**
     * 移除事件監聽
     */
    public off(event: string, callback?: EventCallback, target?: any): void {
        if (!callback) {
            this._events.delete(event);
            return;
        }

        const bindings = this._events.get(event);
        if (bindings) {
            const index = bindings.findIndex(
                b => b.callback === callback && (!target || b.target === target)
            );
            if (index > -1) {
                bindings.splice(index, 1);
            }
        }
    }

    /**
     * 移除目標對象的所有監聽
     */
    public offTarget(target: any): void {
        this._events.forEach((bindings, event) => {
            const filtered = bindings.filter(b => b.target !== target);
            if (filtered.length > 0) {
                this._events.set(event, filtered);
            } else {
                this._events.delete(event);
            }
        });
    }

    /**
     * 發送事件
     */
    public emit(event: string, ...args: any[]): void {
        const bindings = this._events.get(event);
        if (bindings) {
            bindings.forEach(binding => {
                try {
                    if (binding.target) {
                        binding.callback.call(binding.target, ...args);
                    } else {
                        binding.callback(...args);
                    }
                } catch (error) {
                    console.error(`Event handler error for "${event}":`, error);
                }
            });
        }
    }

    /**
     * 清除所有事件
     */
    public clear(): void {
        this._events.clear();
    }

    /**
     * 檢查事件是否有監聽
     */
    public hasListener(event: string): boolean {
        const bindings = this._events.get(event);
        return bindings !== undefined && bindings.length > 0;
    }
}
