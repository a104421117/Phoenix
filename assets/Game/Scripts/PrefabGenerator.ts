import { _decorator, Component, Node, Label, Button, Sprite, Color, UITransform, Toggle, Size } from 'cc';

const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Prefab 生成器
 * 用於在編輯器中生成 UI 項目的 Prefab 模板
 *
 * 使用方法：
 * 1. 將此腳本掛載到場景中的空節點
 * 2. 運行場景或點擊生成按鈕
 * 3. 將生成的節點拖曳到 assets/Game/Prefab 資料夾變成 Prefab
 */
@ccclass('PrefabGenerator')
@executeInEditMode
export class PrefabGenerator extends Component {

    @property
    generateOnStart: boolean = false;

    @property(Node)
    outputContainer: Node = null;

    start() {
        if (this.generateOnStart && this.outputContainer) {
            this.generateAllPrefabs();
        }
    }

    /**
     * 生成所有 Prefab 模板
     */
    generateAllPrefabs() {
        if (!this.outputContainer) {
            console.error('[PrefabGenerator] Output container not set!');
            return;
        }

        // 清空容器
        this.outputContainer.removeAllChildren();

        // 生成各個 Prefab
        this.generateHistoryItem();
        this.generatePlayerRankItem();
        this.generateBetItem();
        this.generateAFKPopup();

        console.log('[PrefabGenerator] All prefabs generated! Drag them to Prefab folder.');
    }

    /**
     * 生成 HistoryItem Prefab
     * 尺寸：60 x 30
     */
    generateHistoryItem() {
        const item = this.createNode('HistoryItem', this.outputContainer);
        this.setTransform(item, 60, 30);

        // Background
        const bg = this.createNode('Background', item);
        this.setTransform(bg, 60, 30);
        bg.addComponent(Sprite);

        // MultiplierLabel
        const labelNode = this.createNode('MultiplierLabel', item);
        this.setTransform(labelNode, 50, 25);
        const label = labelNode.addComponent(Label);
        label.string = '1.23';
        label.fontSize = 16;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = Color.WHITE;

        console.log('[PrefabGenerator] HistoryItem created');
    }

    /**
     * 生成 PlayerRankItem Prefab（1.9重新設計）
     * 尺寸：170 x 48
     */
    generatePlayerRankItem() {
        const item = this.createNode('PlayerRankItem', this.outputContainer);
        this.setTransform(item, 170, 48);

        // Background
        const bg = this.createNode('Background', item);
        this.setTransform(bg, 170, 48);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(40, 55, 70, 230);

        // RankNumber (排名) - 金色數字
        const rankNode = this.createNode('RankLabel', item);
        this.setTransform(rankNode, 20, 20);
        rankNode.setPosition(-75, 0, 0);
        const rankLabel = rankNode.addComponent(Label);
        rankLabel.string = '1';
        rankLabel.fontSize = 16;
        rankLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        rankLabel.color = new Color(255, 215, 0); // 金色 #FFD700

        // AvatarSprite (頭像)
        const avatar = this.createNode('AvatarSprite', item);
        this.setTransform(avatar, 38, 38);
        avatar.setPosition(-50, 0, 0);
        avatar.addComponent(Sprite);

        // StatusLights (狀態燈號容器)
        const lightsContainer = this.createNode('StatusLightsContainer', item);
        this.setTransform(lightsContainer, 50, 10);
        lightsContainer.setPosition(-25, 18, 0);

        // 5個狀態燈
        for (let i = 0; i < 5; i++) {
            const light = this.createNode(`Light${i + 1}`, lightsContainer);
            this.setTransform(light, 8, 8);
            light.setPosition(-20 + i * 10, 0, 0);
            const lightSprite = light.addComponent(Sprite);
            lightSprite.color = new Color(80, 80, 80); // 灰色
        }

        // AmountLabel (金額)
        const amountNode = this.createNode('AmountLabel', item);
        this.setTransform(amountNode, 90, 30);
        amountNode.setPosition(30, 0, 0);
        const amountLabel = amountNode.addComponent(Label);
        amountLabel.string = '10,000';
        amountLabel.fontSize = 16;
        amountLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        amountLabel.color = Color.WHITE;

        // MultiplierLabel (取出倍數)
        const multNode = this.createNode('MultiplierLabel', item);
        this.setTransform(multNode, 40, 15);
        multNode.setPosition(70, 15, 0);
        multNode.active = false; // 初始隱藏
        const multLabel = multNode.addComponent(Label);
        multLabel.string = '2.00x';
        multLabel.fontSize = 12;
        multLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        multLabel.color = new Color(255, 215, 0);

        console.log('[PrefabGenerator] PlayerRankItem created');
    }

    /**
     * 生成 BetItem Prefab（1.9優化）
     * 尺寸：170 x 45
     */
    generateBetItem() {
        const item = this.createNode('BetItem', this.outputContainer);
        this.setTransform(item, 170, 45);

        // Background
        const bg = this.createNode('Background', item);
        this.setTransform(bg, 170, 45);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(200, 150, 50, 255); // 橙黃色

        // CoinIcon
        const coin = this.createNode('CoinIcon', item);
        this.setTransform(coin, 25, 25);
        coin.setPosition(-65, 0, 0);
        coin.addComponent(Sprite);

        // AmountLabel
        const amountNode = this.createNode('AmountLabel', item);
        this.setTransform(amountNode, 80, 30);
        amountNode.setPosition(-10, 0, 0);
        const amountLabel = amountNode.addComponent(Label);
        amountLabel.string = '1,000';
        amountLabel.fontSize = 16;
        amountLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        amountLabel.color = Color.WHITE;

        // CashoutButton
        const cashoutBtn = this.createNode('CashoutButton', item);
        this.setTransform(cashoutBtn, 45, 35);
        cashoutBtn.setPosition(55, 0, 0);
        cashoutBtn.addComponent(Button);
        cashoutBtn.addComponent(Sprite);

        const cashoutLabelNode = this.createNode('CashoutLabel', cashoutBtn);
        this.setTransform(cashoutLabelNode, 40, 30);
        const cashoutLabel = cashoutLabelNode.addComponent(Label);
        cashoutLabel.string = '取';
        cashoutLabel.fontSize = 18;
        cashoutLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        cashoutLabel.color = Color.WHITE;

        // MultiplierLabel (取出後顯示)
        const multNode = this.createNode('MultiplierLabel', item);
        this.setTransform(multNode, 45, 15);
        multNode.setPosition(55, 10, 0);
        multNode.active = false;
        const multLabel = multNode.addComponent(Label);
        multLabel.string = '1.08x';
        multLabel.fontSize = 12;
        multLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        multLabel.color = new Color(0, 255, 100);

        // CheckIcon (取出後顯示)
        const checkIcon = this.createNode('CheckIcon', item);
        this.setTransform(checkIcon, 20, 20);
        checkIcon.setPosition(55, -5, 0);
        checkIcon.active = false;
        checkIcon.addComponent(Sprite);

        console.log('[PrefabGenerator] BetItem created');
    }

    /**
     * 生成 AFKPopup Prefab（1.9新增）
     * 尺寸：350 x 280
     */
    generateAFKPopup() {
        const popup = this.createNode('AFKPopup', this.outputContainer);
        this.setTransform(popup, 350, 280);

        // Background
        const bg = this.createNode('Background', popup);
        this.setTransform(bg, 350, 280);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(30, 40, 60, 240);

        // TitleLabel
        const titleNode = this.createNode('TitleLabel', popup);
        this.setTransform(titleNode, 200, 30);
        titleNode.setPosition(0, 120, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '掛機設定';
        titleLabel.fontSize = 24;
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        titleLabel.color = Color.WHITE;

        // CloseButton
        const closeBtn = this.createNode('CloseButton', popup);
        this.setTransform(closeBtn, 40, 40);
        closeBtn.setPosition(155, 120, 0);
        closeBtn.addComponent(Button);
        closeBtn.addComponent(Sprite);

        // Row1: 每局投注
        this.createAFKRow(popup, 'Row1_BetPerRound', '1', '每局投注', '1,000', 70, false);

        // Row2: 投注總額
        this.createAFKRow(popup, 'Row2_TotalBet', '', '投注總額', '100,000', 25, true);

        // Row3: 自動局數
        this.createAFKRow(popup, 'Row3_Rounds', '3', '自動局數', '100', -20, false);

        // Row4: 自動領回
        this.createAFKRow(popup, 'Row4_AutoCashout', '4', '自動領回', '2.00x', -65, true);

        // StartButton
        const startBtn = this.createNode('StartButton', popup);
        this.setTransform(startBtn, 100, 40);
        startBtn.setPosition(0, -115, 0);
        startBtn.addComponent(Button);
        startBtn.addComponent(Sprite);

        const startLabelNode = this.createNode('Label', startBtn);
        this.setTransform(startLabelNode, 90, 35);
        const startLabel = startLabelNode.addComponent(Label);
        startLabel.string = '開始';
        startLabel.fontSize = 18;
        startLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        startLabel.color = Color.WHITE;

        console.log('[PrefabGenerator] AFKPopup created');
    }

    private createAFKRow(parent: Node, name: string, num: string, text: string, value: string, yPos: number, hasToggle: boolean) {
        const row = this.createNode(name, parent);
        this.setTransform(row, 300, 40);
        row.setPosition(0, yPos, 0);

        let xOffset = -130;

        // Toggle 或 數字
        if (hasToggle) {
            const toggle = this.createNode('Toggle', row);
            this.setTransform(toggle, 24, 24);
            toggle.setPosition(xOffset, 0, 0);
            toggle.addComponent(Toggle);
            toggle.addComponent(Sprite);
        } else if (num) {
            const numNode = this.createNode('NumberLabel', row);
            this.setTransform(numNode, 20, 20);
            numNode.setPosition(xOffset, 0, 0);
            const numLabel = numNode.addComponent(Label);
            numLabel.string = num;
            numLabel.fontSize = 14;
            numLabel.color = Color.WHITE;
        }

        // TextLabel
        const textNode = this.createNode('TextLabel', row);
        this.setTransform(textNode, 80, 30);
        textNode.setPosition(-60, 0, 0);
        const textLabel = textNode.addComponent(Label);
        textLabel.string = text;
        textLabel.fontSize = 14;
        textLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        textLabel.color = Color.WHITE;

        // MinusBtn
        const minusBtn = this.createNode('MinusBtn', row);
        this.setTransform(minusBtn, 30, 30);
        minusBtn.setPosition(30, 0, 0);
        minusBtn.addComponent(Button);
        minusBtn.addComponent(Sprite);
        const minusLabelNode = this.createNode('Label', minusBtn);
        const minusLabel = minusLabelNode.addComponent(Label);
        minusLabel.string = '-';
        minusLabel.fontSize = 20;

        // ValueLabel
        const valueNode = this.createNode('ValueLabel', row);
        this.setTransform(valueNode, 70, 30);
        valueNode.setPosition(85, 0, 0);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = value;
        valueLabel.fontSize = 14;
        valueLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        valueLabel.color = new Color(255, 215, 0);

        // PlusBtn
        const plusBtn = this.createNode('PlusBtn', row);
        this.setTransform(plusBtn, 30, 30);
        plusBtn.setPosition(135, 0, 0);
        plusBtn.addComponent(Button);
        plusBtn.addComponent(Sprite);
        const plusLabelNode = this.createNode('Label', plusBtn);
        const plusLabel = plusLabelNode.addComponent(Label);
        plusLabel.string = '+';
        plusLabel.fontSize = 20;
    }

    // ==================== Helper Methods ====================
    private createNode(name: string, parent: Node): Node {
        const node = new Node(name);
        node.parent = parent;
        node.addComponent(UITransform);
        return node;
    }

    private setTransform(node: Node, width: number, height: number) {
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        transform.setContentSize(new Size(width, height));
    }
}
