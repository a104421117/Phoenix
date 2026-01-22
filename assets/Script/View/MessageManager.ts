import { _decorator, Node, Label, tween, Vec3, UIOpacity } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents } from '../Lib/Constants';

const { ccclass, property } = _decorator;

interface MessageItem {
    message: string;
    duration: number;
}

/**
 * 消息提示管理器
 */
@ccclass('MessageManager')
export class MessageManager extends BaseManager {
    private static _inst: MessageManager;
    public static get instance(): MessageManager {
        return MessageManager._inst;
    }

    @property(Node)
    private messageNode: Node = null;

    @property(Label)
    private messageLabel: Label = null;

    @property
    private defaultDuration: number = 2;

    @property
    private maxQueueSize: number = 5;

    private _messageQueue: MessageItem[] = [];
    private _isShowing: boolean = false;
    private _uiOpacity: UIOpacity | null = null;

    protected onManagerLoad(): void {
        MessageManager._inst = this;

        if (this.messageNode) {
            this._uiOpacity = this.messageNode.getComponent(UIOpacity);
            if (!this._uiOpacity) {
                this._uiOpacity = this.messageNode.addComponent(UIOpacity);
            }
        }
    }

    public init(): void {
        this._registerEvents();
        this._hide();
    }

    public reset(): void {
        this._messageQueue = [];
        this._isShowing = false;
        this._hide();
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.SHOW_MESSAGE, this._onShowMessage, this);
    }

    private _onShowMessage(message: string, duration?: number): void {
        this.showMessage(message, duration);
    }

    /**
     * 顯示消息
     */
    public showMessage(message: string, duration: number = this.defaultDuration): void {
        // 限制隊列大小
        if (this._messageQueue.length >= this.maxQueueSize) {
            this._messageQueue.shift();
        }

        this._messageQueue.push({ message, duration });

        if (!this._isShowing) {
            this._showNext();
        }
    }

    private _showNext(): void {
        if (this._messageQueue.length === 0) {
            this._isShowing = false;
            return;
        }

        this._isShowing = true;
        const item = this._messageQueue.shift()!;

        if (this.messageLabel) {
            this.messageLabel.string = item.message;
        }

        if (this.messageNode) {
            this.messageNode.active = true;

            // 重置狀態
            this.messageNode.setScale(0.8, 0.8, 1);
            if (this._uiOpacity) {
                this._uiOpacity.opacity = 0;
            }

            // 顯示動畫
            tween(this.messageNode)
                .to(0.2, { scale: new Vec3(1, 1, 1) })
                .start();

            if (this._uiOpacity) {
                tween(this._uiOpacity)
                    .to(0.2, { opacity: 255 })
                    .delay(item.duration)
                    .to(0.2, { opacity: 0 })
                    .call(() => {
                        this._hide();
                        this._showNext();
                    })
                    .start();
            } else {
                // 如果沒有 UIOpacity，使用縮放動畫
                tween(this.messageNode)
                    .delay(item.duration)
                    .to(0.2, { scale: new Vec3(0, 0, 1) })
                    .call(() => {
                        this._hide();
                        this._showNext();
                    })
                    .start();
            }
        } else {
            // 如果沒有節點，只是延遲後處理下一條
            setTimeout(() => {
                this._showNext();
            }, item.duration * 1000);
        }
    }

    private _hide(): void {
        if (this.messageNode) {
            this.messageNode.active = false;
        }
    }

    /**
     * 立即清除所有消息
     */
    public clearAll(): void {
        this._messageQueue = [];
        this._isShowing = false;
        this._hide();

        if (this.messageNode) {
            tween(this.messageNode).stop();
        }
        if (this._uiOpacity) {
            tween(this._uiOpacity).stop();
        }
    }

    /**
     * 顯示成功消息
     */
    public showSuccess(message: string): void {
        this.showMessage('✓ ' + message);
    }

    /**
     * 顯示錯誤消息
     */
    public showError(message: string): void {
        this.showMessage('✗ ' + message);
    }

    /**
     * 顯示警告消息
     */
    public showWarning(message: string): void {
        this.showMessage('⚠ ' + message);
    }
}
