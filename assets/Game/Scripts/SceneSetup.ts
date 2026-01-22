import { _decorator, Component, Node, Label, Button, Sprite, Color, UITransform, Widget, Layout, Toggle, Vec3, Size, director } from 'cc';

const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 場景設置腳本
 * 用於在編輯器中一鍵生成 SCENE_SETUP_GUIDE.md 定義的 UI 結構
 *
 * 使用方法：
 * 1. 將此腳本掛載到 Canvas 下的任意空節點
 * 2. 在編輯器中點擊 "Setup Scene" 按鈕
 * 3. 完成後可移除此腳本
 */
@ccclass('SceneSetup')
@executeInEditMode
export class SceneSetup extends Component {

    @property
    setupOnStart: boolean = false;

    start() {
        if (this.setupOnStart) {
            this.setupScene();
        }
    }

    /**
     * 一鍵設置場景 UI 結構
     */
    setupScene() {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) {
            console.error('[SceneSetup] Canvas not found!');
            return;
        }

        // 找到或創建 UI 節點
        let ui = canvas.getChildByPath('Camera/UI');
        if (!ui) {
            console.error('[SceneSetup] UI node not found!');
            return;
        }

        console.log('[SceneSetup] Starting scene setup...');

        // 1. 設置 TopBar
        this.setupTopBar(ui);

        // 2. 設置 LeftPanel
        this.setupLeftPanel(ui);

        // 3. 創建 CenterPanel
        this.setupCenterPanel(ui);

        // 4. 創建 RightPanel
        this.setupRightPanel(ui);

        // 5. 創建 BottomBar
        this.setupBottomBar(ui);

        // 6. 創建 Popups
        this.setupPopups(ui);

        // 7. 創建 UIManager 節點
        this.setupUIManager(ui);

        console.log('[SceneSetup] Scene setup complete!');
    }

    // ==================== TopBar ====================
    private setupTopBar(ui: Node) {
        let topBar = ui.getChildByName('TopBar');
        if (!topBar) {
            topBar = this.createNode('TopBar', ui);
        }

        // 設置 TopBar 屬性
        this.setTransform(topBar, 1280, 50);
        topBar.setPosition(0, 262.5, 0);

        // Widget
        const widget = topBar.getComponent(Widget) || topBar.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.left = 0;
        widget.right = 0;

        // HistoryBar
        let historyBar = topBar.getChildByName('HistoryBar');
        if (!historyBar) {
            historyBar = this.createNode('HistoryBar', topBar);
            this.setTransform(historyBar, 530, 35);
            historyBar.setPosition(0, -25, 0);

            // HistoryContainer
            const historyContainer = this.createNode('HistoryContainer', historyBar);
            this.setTransform(historyContainer, 500, 32);
            historyContainer.setPosition(0, 0, 0);

            // Layout
            const layout = historyContainer.addComponent(Layout);
            layout.type = Layout.Type.HORIZONTAL;
            layout.spacingX = 6;
        }

        // LastRoundButton
        let lastRoundBtn = topBar.getChildByName('LastRoundButton');
        if (!lastRoundBtn) {
            lastRoundBtn = this.createNode('LastRoundButton', topBar);
            this.setTransform(lastRoundBtn, 60, 30);
            lastRoundBtn.setPosition(600, -25, 0);

            lastRoundBtn.addComponent(Button);
            const label = this.createLabel(lastRoundBtn, '上局');
            label.fontSize = 16;
        }

        console.log('[SceneSetup] TopBar setup complete');
    }

    // ==================== LeftPanel ====================
    private setupLeftPanel(ui: Node) {
        let leftPanel = ui.getChildByName('LeftPanel');
        if (!leftPanel) {
            leftPanel = this.createNode('LeftPanel', ui);
        }

        this.setTransform(leftPanel, 180, 320);
        leftPanel.setPosition(-540, 0, 0);

        // Widget
        const widget = leftPanel.getComponent(Widget) || leftPanel.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.left = 10;

        // RankContainer
        let rankContainer = leftPanel.getChildByName('RankContainer');
        if (!rankContainer) {
            rankContainer = this.createNode('RankContainer', leftPanel);
            this.setTransform(rankContainer, 170, 310);
            rankContainer.setPosition(0, 0, 0);

            // Layout
            const layout = rankContainer.addComponent(Layout);
            layout.type = Layout.Type.VERTICAL;
            layout.spacingY = 5;
        }

        console.log('[SceneSetup] LeftPanel setup complete');
    }

    // ==================== CenterPanel ====================
    private setupCenterPanel(ui: Node) {
        let centerPanel = ui.getChildByName('CenterPanel');
        if (!centerPanel) {
            centerPanel = this.createNode('CenterPanel', ui);
        }

        this.setTransform(centerPanel, 300, 130);
        centerPanel.setPosition(0, 60, 0);

        // StateLabel
        let stateLabel = centerPanel.getChildByName('StateLabel');
        if (!stateLabel) {
            stateLabel = this.createNode('StateLabel', centerPanel);
            this.setTransform(stateLabel, 200, 25);
            stateLabel.setPosition(0, 50, 0);
            const label = this.createLabel(stateLabel, '押注倒數');
            label.fontSize = 20;
            label.color = Color.WHITE;
        }

        // CountdownLabel
        let countdownLabel = centerPanel.getChildByName('CountdownLabel');
        if (!countdownLabel) {
            countdownLabel = this.createNode('CountdownLabel', centerPanel);
            this.setTransform(countdownLabel, 150, 60);
            countdownLabel.setPosition(0, 0, 0);
            const label = this.createLabel(countdownLabel, '12s');
            label.fontSize = 48;
            label.color = Color.WHITE;
        }

        // MultiplierLabel
        let multiplierLabel = centerPanel.getChildByName('MultiplierLabel');
        if (!multiplierLabel) {
            multiplierLabel = this.createNode('MultiplierLabel', centerPanel);
            this.setTransform(multiplierLabel, 300, 80);
            multiplierLabel.setPosition(0, 0, 0);
            multiplierLabel.active = false; // 初始隱藏
            const label = this.createLabel(multiplierLabel, '1.00x');
            label.fontSize = 64;
            label.color = new Color(0, 200, 0);
        }

        console.log('[SceneSetup] CenterPanel setup complete');
    }

    // ==================== RightPanel ====================
    private setupRightPanel(ui: Node) {
        let rightPanel = ui.getChildByName('RightPanel');
        if (!rightPanel) {
            rightPanel = this.createNode('RightPanel', ui);
        }

        this.setTransform(rightPanel, 180, 300);
        rightPanel.setPosition(540, 20, 0);

        // Widget
        const widget = rightPanel.getComponent(Widget) || rightPanel.addComponent(Widget);
        widget.isAlignRight = true;
        widget.right = 10;

        // RoundProfitLabel
        let roundProfitLabel = rightPanel.getChildByName('RoundProfitLabel');
        if (!roundProfitLabel) {
            roundProfitLabel = this.createNode('RoundProfitLabel', rightPanel);
            this.setTransform(roundProfitLabel, 170, 30);
            roundProfitLabel.setPosition(0, 135, 0);
            const label = this.createLabel(roundProfitLabel, '');
            label.fontSize = 18;
        }

        // BetListContainer
        let betListContainer = rightPanel.getChildByName('BetListContainer');
        if (!betListContainer) {
            betListContainer = this.createNode('BetListContainer', rightPanel);
            this.setTransform(betListContainer, 170, 250);
            betListContainer.setPosition(0, -10, 0);

            // Layout
            const layout = betListContainer.addComponent(Layout);
            layout.type = Layout.Type.VERTICAL;
            layout.spacingY = 5;
        }

        console.log('[SceneSetup] RightPanel setup complete');
    }

    // ==================== BottomBar ====================
    private setupBottomBar(ui: Node) {
        let bottomBar = ui.getChildByName('BottomBar');
        if (!bottomBar) {
            bottomBar = this.createNode('BottomBar', ui);
        }

        this.setTransform(bottomBar, 900, 80);
        bottomBar.setPosition(0, -250, 0);

        // Widget
        const widget = bottomBar.getComponent(Widget) || bottomBar.addComponent(Widget);
        widget.isAlignBottom = true;
        widget.bottom = 10;

        // LeftInfo
        this.setupLeftInfo(bottomBar);

        // PlayerInfo
        this.setupPlayerInfo(bottomBar);

        // BetAmountPanel
        this.setupBetAmountPanel(bottomBar);

        // BetButton
        this.setupBetButton(bottomBar);

        // AFKButton
        this.setupAFKButton(bottomBar);

        // AutoCashoutPanel
        this.setupAutoCashoutPanel(bottomBar);

        console.log('[SceneSetup] BottomBar setup complete');
    }

    private setupLeftInfo(parent: Node) {
        let leftInfo = parent.getChildByName('LeftInfo');
        if (!leftInfo) {
            leftInfo = this.createNode('LeftInfo', parent);
        }
        this.setTransform(leftInfo, 200, 70);
        leftInfo.setPosition(-380, 0, 0);

        // SettlementLine1
        let line1 = leftInfo.getChildByName('SettlementLine1');
        if (!line1) {
            line1 = this.createNode('SettlementLine1', leftInfo);
            this.setTransform(line1, 200, 20);
            line1.setPosition(0, 15, 0);
            const label = this.createLabel(line1, '');
            label.fontSize = 12;
        }

        // SettlementLine2
        let line2 = leftInfo.getChildByName('SettlementLine2');
        if (!line2) {
            line2 = this.createNode('SettlementLine2', leftInfo);
            this.setTransform(line2, 200, 20);
            line2.setPosition(0, -10, 0);
            const label = this.createLabel(line2, '');
            label.fontSize = 12;
        }
    }

    private setupPlayerInfo(parent: Node) {
        let playerInfo = parent.getChildByName('PlayerInfo');
        if (!playerInfo) {
            playerInfo = this.createNode('PlayerInfo', parent);
        }
        this.setTransform(playerInfo, 150, 60);
        playerInfo.setPosition(-180, 0, 0);

        // PlayerAvatar
        let avatar = playerInfo.getChildByName('PlayerAvatar');
        if (!avatar) {
            avatar = this.createNode('PlayerAvatar', playerInfo);
            this.setTransform(avatar, 45, 45);
            avatar.setPosition(-50, 0, 0);
            avatar.addComponent(Sprite);
        }

        // PlayerNameLabel
        let nameLabel = playerInfo.getChildByName('PlayerNameLabel');
        if (!nameLabel) {
            nameLabel = this.createNode('PlayerNameLabel', playerInfo);
            this.setTransform(nameLabel, 80, 18);
            nameLabel.setPosition(20, 10, 0);
            const label = this.createLabel(nameLabel, '玩家');
            label.fontSize = 14;
        }

        // BalanceLabel
        let balanceLabel = playerInfo.getChildByName('BalanceLabel');
        if (!balanceLabel) {
            balanceLabel = this.createNode('BalanceLabel', playerInfo);
            this.setTransform(balanceLabel, 80, 22);
            balanceLabel.setPosition(20, -12, 0);
            const label = this.createLabel(balanceLabel, '10,000');
            label.fontSize = 16;
            label.color = new Color(255, 215, 0);
        }
    }

    private setupBetAmountPanel(parent: Node) {
        let betPanel = parent.getChildByName('BetAmountPanel');
        if (!betPanel) {
            betPanel = this.createNode('BetAmountPanel', parent);
        }
        this.setTransform(betPanel, 160, 45);
        betPanel.setPosition(20, 0, 0);

        // MinusButton
        let minusBtn = betPanel.getChildByName('MinusButton');
        if (!minusBtn) {
            minusBtn = this.createNode('MinusButton', betPanel);
            this.setTransform(minusBtn, 35, 35);
            minusBtn.setPosition(-55, 0, 0);
            minusBtn.addComponent(Button);
            minusBtn.addComponent(Sprite);
            const label = this.createLabel(minusBtn, '-');
            label.fontSize = 24;
        }

        // BetAmountLabel
        let amountLabel = betPanel.getChildByName('BetAmountLabel');
        if (!amountLabel) {
            amountLabel = this.createNode('BetAmountLabel', betPanel);
            this.setTransform(amountLabel, 70, 35);
            amountLabel.setPosition(0, 0, 0);
            const label = this.createLabel(amountLabel, '1,000');
            label.fontSize = 18;
        }

        // PlusButton
        let plusBtn = betPanel.getChildByName('PlusButton');
        if (!plusBtn) {
            plusBtn = this.createNode('PlusButton', betPanel);
            this.setTransform(plusBtn, 35, 35);
            plusBtn.setPosition(55, 0, 0);
            plusBtn.addComponent(Button);
            plusBtn.addComponent(Sprite);
            const label = this.createLabel(plusBtn, '+');
            label.fontSize = 24;
        }
    }

    private setupBetButton(parent: Node) {
        let betBtn = parent.getChildByName('BetButton');
        if (!betBtn) {
            betBtn = this.createNode('BetButton', parent);
        }
        this.setTransform(betBtn, 100, 45);
        betBtn.setPosition(170, 0, 0);
        betBtn.addComponent(Button);
        betBtn.addComponent(Sprite);

        let btnLabel = betBtn.getChildByName('Label');
        if (!btnLabel) {
            btnLabel = this.createNode('Label', betBtn);
            this.setTransform(btnLabel, 90, 35);
            const label = this.createLabel(btnLabel, '押注');
            label.fontSize = 20;
        }
    }

    private setupAFKButton(parent: Node) {
        let afkBtn = parent.getChildByName('AFKButton');
        if (!afkBtn) {
            afkBtn = this.createNode('AFKButton', parent);
        }
        this.setTransform(afkBtn, 60, 35);
        afkBtn.setPosition(280, 0, 0);
        afkBtn.addComponent(Button);
        afkBtn.addComponent(Sprite);

        let btnLabel = afkBtn.getChildByName('Label');
        if (!btnLabel) {
            btnLabel = this.createNode('Label', afkBtn);
            this.setTransform(btnLabel, 50, 30);
            const label = this.createLabel(btnLabel, '掛機');
            label.fontSize = 14;
        }
    }

    private setupAutoCashoutPanel(parent: Node) {
        let autoPanel = parent.getChildByName('AutoCashoutPanel');
        if (!autoPanel) {
            autoPanel = this.createNode('AutoCashoutPanel', parent);
        }
        this.setTransform(autoPanel, 100, 35);
        autoPanel.setPosition(370, 0, 0);

        // AutoCashoutToggle
        let toggle = autoPanel.getChildByName('AutoCashoutToggle');
        if (!toggle) {
            toggle = this.createNode('AutoCashoutToggle', autoPanel);
            this.setTransform(toggle, 30, 18);
            toggle.setPosition(-30, 0, 0);
            toggle.addComponent(Toggle);
            toggle.addComponent(Sprite);
        }

        // AutoCashoutValueBtn
        let valueBtn = autoPanel.getChildByName('AutoCashoutValueBtn');
        if (!valueBtn) {
            valueBtn = this.createNode('AutoCashoutValueBtn', autoPanel);
            this.setTransform(valueBtn, 60, 30);
            valueBtn.setPosition(25, 0, 0);
            valueBtn.addComponent(Button);
            valueBtn.addComponent(Sprite);

            const label = this.createLabel(valueBtn, '2.00x');
            label.fontSize = 14;
        }
    }

    // ==================== Popups ====================
    private setupPopups(ui: Node) {
        let popups = ui.getChildByName('Popups');
        if (!popups) {
            popups = this.createNode('Popups', ui);
        }
        this.setTransform(popups, 1280, 585);
        popups.setPosition(0, 0, 0);

        // AutoCashoutPopup
        this.createPopupPlaceholder(popups, 'AutoCashoutPopup');

        // AFKPopup
        this.createPopupPlaceholder(popups, 'AFKPopup');

        // HistoryPopup
        this.createPopupPlaceholder(popups, 'HistoryPopup');

        // LeaderboardPopup
        this.createPopupPlaceholder(popups, 'LeaderboardPopup');

        // SettingsPopup
        this.createPopupPlaceholder(popups, 'SettingsPopup');

        console.log('[SceneSetup] Popups setup complete');
    }

    private createPopupPlaceholder(parent: Node, name: string) {
        let popup = parent.getChildByName(name);
        if (!popup) {
            popup = this.createNode(name, parent);
            this.setTransform(popup, 350, 280);
            popup.setPosition(0, 0, 0);
            popup.active = false; // 初始隱藏
        }
    }

    // ==================== UIManager ====================
    private setupUIManager(ui: Node) {
        let uiManager = ui.getChildByName('UIManager');
        if (!uiManager) {
            uiManager = this.createNode('UIManager', ui);
        }
        this.setTransform(uiManager, 100, 100);
        uiManager.setPosition(0, 0, 0);

        console.log('[SceneSetup] UIManager node created - attach UIManager.ts script manually');
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

    private createLabel(parent: Node, text: string): Label {
        let labelNode = parent.getChildByName('Label');
        if (!labelNode) {
            labelNode = this.createNode('Label', parent);
        }
        let label = labelNode.getComponent(Label);
        if (!label) {
            label = labelNode.addComponent(Label);
        }
        label.string = text;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        return label;
    }
}
