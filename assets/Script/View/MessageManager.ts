import { _decorator, assetManager, Component, error, instantiate, JsonAsset, Label, Node, Prefab } from 'cc';
import { Base, Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('MessageManager')
export class MessageManager extends Manager {
    @property({ type: Prefab }) public messageLabelPrefab: Prefab = null;
    @property({ type: Node }) public messageNode: Node = null;
    // @property({ type: Label }) public messageLabel: Label = null;
    jsonData: Record<string, any> = null;
    async start() {
        this.jsonData = await this.loadMessageJson();
    }

    update(deltaTime: number) {

    }

    private async loadMessageJson(): Promise<Record<string, any>> {
        return new Promise<Record<string, any>>(async (resolve, reject) => {
            try {
                const jsonAsset = await Base.Loading<JsonAsset>("lang", "tch/message");
                const jsonData = jsonAsset[0].json;
                resolve(jsonData);
            } catch (error) {
                error("載入訊息失敗:", error);
            }
        });
    }

    setMessage(key: string, variables?: Record<string, any>): void {
        if (this.jsonData && this.jsonData[key]) {
            const node = instantiate(this.messageLabelPrefab);
            this.messageNode.addChild(node);

            const label = node.getComponent(Label);
            const str = this.changeText(this.jsonData[key], variables);
            label.string = str;
        } else {
            error("jsonData沒有" + key);
        }
    }

    private changeText(txt: string, variables?: Record<string, any>): string {
        if (variables !== undefined) {
            txt = txt.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
                return variables[varName]?.toString() || '';
            });
        }
        return txt;
    }
}


