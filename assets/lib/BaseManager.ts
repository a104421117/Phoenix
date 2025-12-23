import { _decorator, CCFloat, Component, director, ISchedulable, Label, macro } from "cc";

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

export namespace Base {
    type TimeObj = { uuid: string, function: Function };
    export class Timer {
        private static timeMap = new Map<string, ISchedulable>();
        public static createCountdown(onTick: Function, onComplete: Function, time: number, id: string = "Countdown", deltaTime: number = 1,): TimeObj {
            let timer = time;
            const timeMap = this.timeMap;
            const uuid = UIDUtils.generateUID();
            const target: ISchedulable = {
                id: id,
                uuid: uuid
            };
            let tick = function () {
                timer -= deltaTime;
                if (timer > 0) {
                    if (onTick) onTick(timer);
                } else {
                    Timer.stopTimer(timeObj, onComplete);
                }
            }
            director.getScheduler().schedule(tick, target, deltaTime);
            timeMap.set(uuid, target);
            const timeObj: TimeObj = {
                uuid: uuid,
                function: tick
            };
            return timeObj;
        }
        public static createCount(onTick: Function, onComplete: Function, time: number, id: string = "Count", deltaTime: number = 1): TimeObj {
            let count = 0;
            const timeMap = this.timeMap;
            const uuid = UIDUtils.generateUID();
            const target: ISchedulable = {
                id: id,
                uuid: uuid
            }
            let tick = function () {
                count += deltaTime;
                if (count > time) {
                    Timer.stopTimer(timeObj, onComplete);
                } else {
                    if (onTick) onTick(count);
                }
            }
            director.getScheduler().schedule(tick, target, deltaTime);
            timeMap.set(uuid, target);
            const timeObj: TimeObj = {
                uuid: uuid,
                function: tick
            };
            return timeObj;
        }
        public static stopTimer(timer: TimeObj, onComplete: Function): Map<string, ISchedulable> {
            let target = this.timeMap.get(timer.uuid);
            this.timeMap.delete(timer.uuid);
            director.getScheduler().unschedule(timer.function, target);
            if (onComplete) onComplete();
            return this.timeMap;
        }
    }
    export class UIDUtils {
        /** * 生成混淆 ID
         * 結構: 時間戳(36進制) + 隨機數
         */
        public static generateUID(): string {
            const timestamp = Date.now().toString(36); // 縮短長度
            const randomPart = Math.random().toString(36).substring(2, 6);
            return `${timestamp}-${randomPart}`;
        }
    }
}

