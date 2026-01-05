import { _decorator, Asset, AssetManager, assetManager, CCFloat, Component, director, ISchedulable, Label, log, macro } from "cc";

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
            this.node.destroy();
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
            const uuid = UIDUtils.generateUID();
            const target: ISchedulable = {
                id: id,
                uuid: uuid
            };
            const tick = function () {
                timer -= deltaTime;
                if (timer > 0) {
                    if (onTick) onTick(timer);
                } else {
                    Timer.stopTimer(timeObj, onComplete);
                }
            }
            director.getScheduler().schedule(tick, target, deltaTime);
            this.timeMap.set(uuid, target);
            const timeObj: TimeObj = {
                uuid: uuid,
                function: tick
            };
            return timeObj;
        }
        public static createCount(onTick: Function, onComplete: Function, time: number, id: string = "Count", deltaTime: number = 1): TimeObj {
            let count = 0;
            const uuid = UIDUtils.generateUID();
            const target: ISchedulable = {
                id: id,
                uuid: uuid
            }
            const tick = function () {
                count += deltaTime;
                if (count > time) {
                    Timer.stopTimer(timeObj, onComplete);
                } else {
                    if (onTick) onTick(count);
                }
            }
            director.getScheduler().schedule(tick, target, deltaTime);
            this.timeMap.set(uuid, target);
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
    /**
     * 載入資源config
     * @returns 資源config
     */
    function LoadBundle(url: string): Promise<AssetManager.Bundle> {
        return new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(url, (error: Error, bundle: AssetManager.Bundle) => {
                if (error === null) {
                    resolve(bundle);
                } else {
                    reject(error);
                }
            });
        });
    }
    /**
     * 載入
     * @param bundle 資源config
     * @param dir 檔案位置
     * @returns 檔案
     */
    function LoadObj<T extends Asset>(bundle: AssetManager.Bundle, dir: string): Promise<Array<T>> {
        return new Promise<Array<T>>((resolve, reject) => {
            bundle.loadDir<T>(dir, (finished: number, total: number, item: AssetManager.RequestItem) => {
                const msg = `${bundle.name + "/" + dir + ':finished/total: ' + finished / total}`;
                log(msg);
            }, (error: Error, data: Array<T>) => {
                if (error == null) {
                    let TArr: Array<T> = [];
                    data.forEach((e: T) => {
                        if (e.name) {
                            TArr.push(e);
                        }
                    });
                    resolve(TArr);
                } else {
                    reject(error);
                }
            });
        });
    }
    /**
     * 載入
     * @param bundleName bundle名稱
     * @param dir 檔案位置
     * @returns 檔案
     */
    export function Loading<T extends Asset>(bundleName: string, dir: string = ''): Promise<Array<T>> {
        return new Promise<Array<T>>(async (resolve, reject) => {
            try {
                let bundle = await LoadBundle(bundleName);
                let Load = await LoadObj<T>(bundle, dir);
                resolve(Load);
            } catch (error) {
                reject(error);
            }
        });
    }
}


