import { _decorator, Button, Label, Node, Tween, UIOpacity, Vec3, director, tween } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { GameData, GmaeModel } from '../Model/GameData';

const { ccclass, property } = _decorator;

type ErrorPopupPayload = {
    message: string;
};

@ccclass('ErrorPopupView')
export class ErrorPopupView extends BaseModel.ComponentSingleton {
    @property({ type: Node, tooltip: 'Popup root node（控制顯示 / 隱藏 active，不做縮放）。' })
    private popupNode: Node = null;

    @property({ type: Node, tooltip: '彈窗縮放動畫的目標 Node（通常是 popupNode 內的內容容器）；未指定則 fallback 用 popupNode。' })
    private popupScaleNode: Node = null;

    @property({ type: UIOpacity, tooltip: 'UIOpacity component on popupNode for fade in/out.' })
    private popupOpacity: UIOpacity = null;

    @property({ type: Label, tooltip: 'Error message label.' })
    private messageLabel: Label = null;

    @property({ type: Button, tooltip: 'Confirm button.' })
    private confirmBtn: Button = null;

    @property({ tooltip: 'Show: scale 0.88 to 1.04 duration (sec).' })
    private showScaleUpDuration: number = 0.15;

    @property({ tooltip: 'Show: scale 1.04 to 1.00 duration (sec).' })
    private showScaleSettleDuration: number = 0.10;

    @property({ tooltip: 'Show: opacity 0 to 255 duration (sec).' })
    private showFadeInDuration: number = 0.25;

    @property({ tooltip: 'Hide duration (sec) for both scale and opacity.' })
    private hideDuration: number = 0.15;

    onLoad() {
        super.onLoad();
        if (this.node.parent && this.node.parent === director.getScene()) {
            director.addPersistRootNode(this.node);
        }

        if (this.popupNode) this.popupNode.active = false;
        if (this.confirmBtn) {
            this.confirmBtn.node.on(Button.EventType.CLICK, this.hide, this);
        }

        GameData.getInstance().onGameState(GmaeModel.ShowError, this.onShowError, this);
        GameData.getInstance().onGameState(GmaeModel.HideError, this.hide, this);
    }

    onDestroy() {
        GameData.getInstance().offGameState(GmaeModel.ShowError, this.onShowError, this);
        GameData.getInstance().offGameState(GmaeModel.HideError, this.hide, this);
        if (this.confirmBtn) {
            this.confirmBtn.node.off(Button.EventType.CLICK, this.hide, this);
        }
    }

    public show(payload: ErrorPopupPayload) {
        this.onShowError(payload);
    }

    public hide() {
        if (!this.popupNode) return;
        const scaleNode = this.popupScaleNode ?? this.popupNode;

        Tween.stopAllByTarget(scaleNode);
        if (this.popupOpacity) Tween.stopAllByTarget(this.popupOpacity);

        tween(scaleNode)
            .to(this.hideDuration, { scale: new Vec3(0.96, 0.96, 1) }, { easing: 'quadIn' })
            .start();

        if (this.popupOpacity) {
            tween(this.popupOpacity)
                .to(this.hideDuration, { opacity: 0 }, { easing: 'quadIn' })
                .call(() => {
                    this.popupNode.active = false;
                })
                .start();
        } else {
            tween(scaleNode)
                .delay(this.hideDuration)
                .call(() => {
                    this.popupNode.active = false;
                })
                .start();
        }
    }

    private onShowError(payload: ErrorPopupPayload) {
        if (!this.popupNode) return;
        const scaleNode = this.popupScaleNode ?? this.popupNode;

        if (this.messageLabel) {
            this.messageLabel.string = payload.message ?? '';
        }

        Tween.stopAllByTarget(scaleNode);
        if (this.popupOpacity) Tween.stopAllByTarget(this.popupOpacity);

        scaleNode.setScale(0.88, 0.88, 1);
        if (this.popupOpacity) this.popupOpacity.opacity = 0;
        this.popupNode.active = true;

        tween(scaleNode)
            .to(this.showScaleUpDuration, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
            .to(this.showScaleSettleDuration, { scale: new Vec3(1.00, 1.00, 1) }, { easing: 'quadOut' })
            .start();

        if (this.popupOpacity) {
            tween(this.popupOpacity)
                .to(this.showFadeInDuration, { opacity: 255 }, { easing: 'quadOut' })
                .start();
        }
    }
}
