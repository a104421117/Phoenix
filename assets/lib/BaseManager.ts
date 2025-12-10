import { _decorator, CCFloat, Component, director, Label } from "cc";

const { ccclass, property } = _decorator;

/**
 * 繼承 Component 的通用單例基類
 */
@ccclass('Manager')
export class Manager extends Component {
    private static instanceMap = new Map<string, Manager>();
    public static getInstance<T extends Manager>(classConstructor: new (...args: any[]) => T): T {
        const classname = classConstructor.name;
        const instance = this.instanceMap.get(classname) as T;
        return instance;
    }

    private onLoad(): void {
        const classname = this.constructor.name;
        let has = Manager.instanceMap.has(classname);
        if (has === false) {
            Manager.instanceMap.set(classname, this);
            director.addPersistRootNode(this.node);
        } else {
            this.destroy();
        }
    }
}

export function getInstance<T extends Manager>(classConstructor: new (...args: any[]) => T): T {
    return Manager.getInstance(classConstructor);
}

/**倒數 */
type Countdown = {
    /**開始 */
    start(): void;
    /**停止 */
    stop(onStop: Function): void;
}

export class Base {
    /**
     * 倒數函式
     * @param onTick 更新callback
     * @param onComplete 結束callback
     * @param times 更新次數
     * @param tickTime 更新頻率(秒)
     * @returns 
     */
    public static createCountdown(onTick: Function, onComplete: Function, times: number, deltaTime: number = 1, onStop?: Function): Countdown {
        let timerId = null;
        let count = 0;

        function tick() {
            count++;
            if (count >= times) {
                clearInterval(timerId);
                timerId = null;
                if (onComplete) onComplete();
                return;
            }
            if (onTick) onTick(times - count * deltaTime);
        }

        return {
            start(): void {
                if (timerId !== null) return; // 避免重複啟動
                timerId = setInterval(tick, deltaTime * 1000);
            },
            stop(): void {
                clearInterval(timerId);
                onStop(times - count * deltaTime);
                timerId = null;
            }
        };
    }
    /**
     * 計時函式
     * @param onTick 更新callback
     * @param onStop 結束callback
     * @param tickTime 更新頻率(秒)
     * @returns 
     */
    public static createCount(onTick: Function, onStop: Function, tickTime: number = 1): Countdown {
        let timerId = null;
        let count = 0;

        function tick() {
            count++;
            if (onTick) onTick(count);
        }

        return {
            start(): void {
                if (timerId !== null) return; // 避免重複啟動
                timerId = setInterval(tick, tickTime * 1000);
            },
            stop(): void {
                clearInterval(timerId);
                onStop(count);
                timerId = null;
            }
        };
    }
}

