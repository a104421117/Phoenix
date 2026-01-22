import { Component, _decorator } from 'cc';

const { ccclass } = _decorator;

/**
 * 管理器基類
 * 提供單例模式和生命週期管理
 */
@ccclass('BaseManager')
export abstract class BaseManager extends Component {
    private static _instances: Map<string, BaseManager> = new Map();

    /**
     * 獲取管理器實例
     */
    protected static getInstanceByName<T extends BaseManager>(className: string): T | null {
        return BaseManager._instances.get(className) as T | null;
    }

    /**
     * 註冊管理器實例
     */
    protected registerInstance(): boolean {
        const className = this.constructor.name;
        if (BaseManager._instances.has(className)) {
            console.warn(`${className} already exists, destroying duplicate`);
            this.destroy();
            return false;
        }
        BaseManager._instances.set(className, this);
        return true;
    }

    /**
     * 註銷管理器實例
     */
    protected unregisterInstance(): void {
        const className = this.constructor.name;
        BaseManager._instances.delete(className);
    }

    protected onLoad(): void {
        if (!this.registerInstance()) {
            return;
        }
        this.onManagerLoad();
    }

    protected onDestroy(): void {
        this.unregisterInstance();
        this.onManagerDestroy();
    }

    /**
     * 管理器加載時調用（子類實現）
     */
    protected onManagerLoad(): void {}

    /**
     * 管理器銷毀時調用（子類實現）
     */
    protected onManagerDestroy(): void {}

    /**
     * 初始化（在所有管理器加載完成後調用）
     */
    public abstract init(): void;

    /**
     * 重置狀態
     */
    public abstract reset(): void;

    /**
     * 獲取所有已註冊的管理器
     */
    public static getAllInstances(): Map<string, BaseManager> {
        return new Map(BaseManager._instances);
    }

    /**
     * 初始化所有管理器
     */
    public static initAll(): void {
        BaseManager._instances.forEach((manager, name) => {
            try {
                manager.init();
                console.log(`${name} initialized`);
            } catch (error) {
                console.error(`Failed to initialize ${name}:`, error);
            }
        });
    }

    /**
     * 重置所有管理器
     */
    public static resetAll(): void {
        BaseManager._instances.forEach((manager, name) => {
            try {
                manager.reset();
            } catch (error) {
                console.error(`Failed to reset ${name}:`, error);
            }
        });
    }
}
