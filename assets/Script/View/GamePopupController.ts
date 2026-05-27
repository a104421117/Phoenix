import {
    _decorator,
    Button,
    Color,
    Component,
    director,
    instantiate,
    Label,
    Node,
    ScrollView,
    Sprite,
    UITransform,
} from 'cc';
import { NodeSwitcher } from '../../Game.Client.Common/NodeSwitcher';
import { GameController } from '../Controller/GameController';
import { GameData, GmaeModel, RoundState } from '../Model/GameData';

const { ccclass, property } = _decorator;

enum PopupIndex {
    Settings = 0,
    Help = 1,
    BetHistory = 2,
    Audio = 3,
    Leave = 4,
    AfkMultiplier = 5,
    CrashHistory = 6,
    Afk = 7,
    RoundWait = 8,
}

type ButtonBinding = {
    button: Button;
    handler: () => void;
};

type ReplayHistoryRow = {
    time: string;
    orderNo: string;
    cashoutMultiplier: string;
    betAmount: string;
    profit: string;
    profitValue: number | null;
};

@ccclass('GamePopupController')
export class GamePopupController extends Component {
    private static readonly REPLAY_HISTORY_URL = 'https://dev-replay.jutechs.com/replay/history?gameCode=phoenix&limit=100';
    private static readonly REPLAY_HISTORY_TOKEN = 'phoenix-test-e15bcb2770924204b8fc643b99af560d';
    private static readonly PROFIT_COLOR = new Color(245, 213, 98, 255);
    private static readonly LOSS_COLOR = new Color(196, 91, 88, 255);
    private static readonly ROW_DARK_COLOR = new Color(63, 33, 17, 178);
    private static readonly ROW_LIGHT_COLOR = new Color(108, 61, 36, 178);

    @property({ type: NodeSwitcher })
    private popupsSwitcher: NodeSwitcher = null;

    @property({ type: Button })
    private settingsOpenButton: Button = null;

    @property({ type: Button })
    private helpOpenButton: Button = null;

    @property({ type: Button })
    private betHistoryOpenButton: Button = null;

    @property({ type: ScrollView })
    private betHistoryScrollView: ScrollView = null;

    @property({ type: Node })
    private betHistoryRowsContent: Node = null;

    @property({ type: Node })
    private betHistoryRowTemplate: Node = null;

    @property({ type: Label })
    private betHistoryStatusLabel: Label = null;

    @property({ type: Button })
    private audioOpenButton: Button = null;

    @property({ type: Button })
    private leaveOpenButton: Button = null;

    @property({ type: Button })
    private afkMultiplierOpenButton: Button = null;

    @property({ type: Button })
    private crashHistoryOpenButton: Button = null;

    @property({ type: Button })
    private afkOpenButton: Button = null;

    @property({ type: [Button] })
    private closeButtons: Button[] = [];

    @property({ type: Button })
    private backToLobbyButton: Button = null;

    private initialized: boolean = false;
    private buttonBindings: ButtonBinding[] = [];
    private betHistoryFetching: boolean = false;

    start() {
        this.initialize();
        this.openPopup(PopupIndex.RoundWait);
        GameData.getInstance().onGameState(GmaeModel.RoundStateChanged, this.onRoundStateChanged, this);
    }

    protected onEnable(): void {
        this.initialize();
    }

    protected onDisable(): void {
        this.closeAll();
        this.unbindAllButtons();
        this.initialized = false;
    }

    protected onDestroy(): void {
        this.unbindAllButtons();
        GameData.getInstance().offGameState(GmaeModel.RoundStateChanged, this.onRoundStateChanged, this);
    }

    private onRoundStateChanged(state: RoundState) {
        if (state !== RoundState.Betting) return;
        this.closeAll();
        GameData.getInstance().offGameState(GmaeModel.RoundStateChanged, this.onRoundStateChanged, this);
    }

    public initialize() {
        if (this.initialized) {
            return;
        }

        this.ensureSwitcher();
        if (!this.popupsSwitcher) {
            return;
        }

        const seen = new Set<Node>();
        this.bindOpenButtons(seen);
        this.bindCloseButtons(seen);
        this.bindBackToLobbyButton(seen);
        this.closeAll();
        this.initialized = true;
    }

    private ensureSwitcher() {
        if (!this.popupsSwitcher) {
            this.popupsSwitcher = this.getComponent(NodeSwitcher);
        }
    }

    private bindOpenButtons(seen: Set<Node>) {
        this.bindOpenButtonByIndex(this.settingsOpenButton, PopupIndex.Settings, seen);
        this.bindOpenButtonByIndex(this.helpOpenButton, PopupIndex.Help, seen);
        this.bindSingleButton(this.betHistoryOpenButton, seen, () => this.onBetHistoryOpenClick());
        this.bindOpenButtonByIndex(this.audioOpenButton, PopupIndex.Audio, seen);
        this.bindOpenButtonByIndex(this.leaveOpenButton, PopupIndex.Leave, seen);
        this.bindOpenButtonByIndex(this.afkMultiplierOpenButton, PopupIndex.AfkMultiplier, seen);
        this.bindOpenButtonByIndex(this.crashHistoryOpenButton, PopupIndex.CrashHistory, seen);
        this.bindOpenButtonByIndex(this.afkOpenButton, PopupIndex.Afk, seen);
    }

    private bindOpenButtonByIndex(button: Button | null, popupIndex: number, seen: Set<Node>) {
        this.bindSingleButton(button, seen, () => this.openPopup(popupIndex));
    }

    private bindCloseButtons(seen: Set<Node>) {
        this.bindButtons(this.closeButtons, seen, () => this.closeAll());
    }

    private bindBackToLobbyButton(seen: Set<Node>) {
        this.bindSingleButton(this.backToLobbyButton, seen, () => this.onBackToLobbyClick());
    }

    private bindButtons(buttons: Button[], seen: Set<Node>, handler: () => void) {
        if (!Array.isArray(buttons) || buttons.length <= 0) {
            return;
        }

        buttons.forEach((button) => {
            this.bindSingleButton(button, seen, handler);
        });
    }

    private bindSingleButton(button: Button | null, seen: Set<Node>, handler: () => void) {
        if (!button?.node || seen.has(button.node)) {
            return;
        }
        seen.add(button.node);
        this.bindButton(button, handler);
    }

    private bindButton(button: Button, handler: () => void) {
        button.node.on(Button.EventType.CLICK, handler, this);
        this.buttonBindings.push({ button, handler });
    }

    private unbindAllButtons() {
        this.buttonBindings.forEach((binding) => {
            binding.button?.node?.off(Button.EventType.CLICK, binding.handler, this);
        });
        this.buttonBindings.length = 0;
    }

    private openPopup(index: number) {
        if (!this.popupsSwitcher) {
            return;
        }
        this.popupsSwitcher.switch(index);
    }

    public closeAll() {
        if (!this.popupsSwitcher) {
            return;
        }
        this.popupsSwitcher.switch(-1);
    }

    private async onBetHistoryOpenClick() {
        this.openPopup(PopupIndex.BetHistory);
        await this.loadBetHistory();
    }

    private async loadBetHistory() {
        if (this.betHistoryFetching) {
            return;
        }

        this.assertBetHistoryBindings();
        this.betHistoryFetching = true;
        this.clearBetHistoryRows();
        this.setBetHistoryStatus('載入中...');

        try {
            const response = await fetch(GamePopupController.REPLAY_HISTORY_URL, {
                method: 'GET',
                headers: {
                    'X-Player-Token': GamePopupController.REPLAY_HISTORY_TOKEN,
                },
            });

            if (!response.ok) {
                throw new Error(`[GamePopupController.loadBetHistory] replay history http ${response.status}`);
            }

            const raw = await response.json();
            const rows = this.normalizeReplayHistory(raw).slice(0, 100);
            this.renderBetHistoryRows(rows);
            this.setBetHistoryStatus(rows.length > 0 ? '' : '暫無歷史紀錄');
        } catch (error) {
            console.error('[GamePopupController.loadBetHistory] failed', error);
            this.setBetHistoryStatus('歷史紀錄載入失敗');
        } finally {
            this.betHistoryFetching = false;
        }
    }

    private assertBetHistoryBindings() {
        if (!this.betHistoryRowsContent) {
            throw new Error('[GamePopupController] betHistoryRowsContent is not assigned');
        }
        if (!this.betHistoryRowTemplate) {
            throw new Error('[GamePopupController] betHistoryRowTemplate is not assigned');
        }
        if (this.betHistoryScrollView) {
            this.betHistoryScrollView.content = this.betHistoryRowsContent;
        }
        this.betHistoryRowTemplate.active = false;
    }

    private clearBetHistoryRows() {
        const template = this.betHistoryRowTemplate;
        const children = [...this.betHistoryRowsContent.children];
        children.forEach((child) => {
            if (child !== template) {
                child.destroy();
            }
        });
        template.active = false;
    }

    private setBetHistoryStatus(message: string) {
        if (!this.betHistoryStatusLabel) {
            return;
        }
        this.betHistoryStatusLabel.string = message;
        this.betHistoryStatusLabel.node.active = message.length > 0;
    }

    private renderBetHistoryRows(rows: ReplayHistoryRow[]) {
        const rowHeight = this.getBetHistoryRowHeight();
        const contentTransform = this.betHistoryRowsContent.getComponent(UITransform);
        if (contentTransform) {
            const contentSize = contentTransform.contentSize;
            contentTransform.setContentSize(contentSize.width, Math.max(contentSize.height, rows.length * rowHeight));
        }

        rows.forEach((row, index) => {
            const rowNode = instantiate(this.betHistoryRowTemplate);
            rowNode.parent = this.betHistoryRowsContent;
            rowNode.setPosition(
                this.betHistoryRowTemplate.position.x,
                -index * rowHeight - rowHeight / 2,
                this.betHistoryRowTemplate.position.z,
            );
            rowNode.active = true;
            this.applyBetHistoryRow(rowNode, row, index);
        });
        this.betHistoryScrollView?.scrollToTop(0);
    }

    private getBetHistoryRowHeight(): number {
        const transform = this.betHistoryRowTemplate.getComponent(UITransform);
        const height = transform?.contentSize?.height ?? 0;
        return height > 0 ? height : 60;
    }

    private applyBetHistoryRow(rowNode: Node, row: ReplayHistoryRow, index: number) {
        const rowBackground = this.findChildByNames(rowNode, ['rowBackground', 'RowBackground'])?.getComponent(Sprite);
        if (rowBackground) {
            rowBackground.color = index % 2 === 0
                ? GamePopupController.ROW_LIGHT_COLOR
                : GamePopupController.ROW_DARK_COLOR;
        }
        this.setRowLabel(rowNode, ['timeOrderLabel', 'TimeOrderLabel', 'timeLabel', 'TimeLabel'], `${row.time}\n${row.orderNo}`);
        const multiplierLabel = this.setRowLabel(rowNode, [
            'cashoutMultiplierLabel',
            'CashoutMultiplierLabel',
            'collectTimeLabel',
            'CollectTimeLabel',
            'multiplierLabel',
            'MultiplierLabel',
        ], row.cashoutMultiplier);
        this.setRowLabel(rowNode, ['betAmountLabel', 'BetAmountLabel', 'amountLabel', 'AmountLabel'], row.betAmount);
        const profitLabel = this.setRowLabel(rowNode, ['profitLabel', 'ProfitLabel', 'payoutLabel', 'PayoutLabel'], row.profit);

        const resultColor = row.profitValue !== null && row.profitValue < 0
            ? GamePopupController.LOSS_COLOR
            : GamePopupController.PROFIT_COLOR;
        multiplierLabel.color = resultColor;
        profitLabel.color = resultColor;
    }

    private setRowLabel(rowNode: Node, labelNames: string[], value: string): Label {
        const label = this.findLabel(rowNode, labelNames);
        label.string = value;
        return label;
    }

    private findLabel(root: Node, labelNames: string[]): Label {
        const node = this.findChildByNames(root, labelNames);
        const label = node?.getComponent(Label);
        if (!label) {
            throw new Error(`[GamePopupController] missing row label: ${labelNames.join(' / ')}`);
        }
        return label;
    }

    private findChildByNames(root: Node, names: string[]): Node | null {
        const targets = new Set(names);
        const stack = [...root.children];
        while (stack.length > 0) {
            const node = stack.shift();
            if (!node) {
                continue;
            }
            if (targets.has(node.name)) {
                return node;
            }
            stack.push(...node.children);
        }
        return null;
    }

    private normalizeReplayHistory(raw: any): ReplayHistoryRow[] {
        return this.extractHistoryArray(raw)
            .map((item) => this.normalizeReplayHistoryItem(item))
            .filter((item) => item !== null) as ReplayHistoryRow[];
    }

    private normalizeReplayHistoryItem(item: any): ReplayHistoryRow | null {
        if (!item || typeof item !== 'object') {
            return null;
        }

        const time = this.formatDate(this.pickFirst(item, [
            'sortTimeUtc',
            'createdAt',
            'createdTime',
            'betTime',
            'settledAt',
            'time',
            'timestamp',
            'created_at',
        ]));
        const orderNo = this.formatText(this.pickFirst(item, [
            'participantId',
            'orderNo',
            'orderId',
            'betOrderNo',
            'betId',
            'transactionId',
            'id',
        ]));
        const multiplierValue = this.toNumber(this.pickFirst(item, [
            'cashoutMultiplier',
            'settleMultiplier',
            'collectMultiplier',
            'multiplier',
            'crashPoint',
            'odds',
        ]));
        const betAmount = this.pickFirst(item, ['betAmount', 'amount', 'stake', 'wager', 'bet']);
        const profitRaw = this.pickFirst(item, [
            'profit',
            'profitLoss',
            'winLoss',
            'totalPayout',
            'netPayout',
            'payoutNet',
            'payout',
            'payoutGross',
            'winAmount',
        ]);
        const profitValue = this.toNumber(profitRaw);

        return {
            time,
            orderNo,
            cashoutMultiplier: multiplierValue === null ? '-' : `${multiplierValue.toFixed(2)}x`,
            betAmount: this.formatAmount(betAmount),
            profit: this.formatAmount(profitRaw),
            profitValue,
        };
    }

    private extractHistoryArray(raw: any): any[] {
        if (Array.isArray(raw)) {
            return raw;
        }

        const candidates = [
            raw?.data?.items,
            raw?.data?.records,
            raw?.data?.history,
            raw?.data?.list,
            raw?.items,
            raw?.records,
            raw?.history,
            raw?.list,
            raw?.data,
        ];
        return candidates.find((candidate) => Array.isArray(candidate)) ?? [];
    }

    private pickFirst(source: any, keys: string[]): any {
        for (const key of keys) {
            const value = source?.[key];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
        return null;
    }

    private formatDate(value: any): string {
        if (value === null || value === undefined || value === '') {
            return '-';
        }

        const dateValue = typeof value === 'number'
            ? new Date(value < 1000000000000 ? value * 1000 : value)
            : new Date(value);
        if (Number.isNaN(dateValue.getTime())) {
            return String(value);
        }

        const year = dateValue.getFullYear();
        const month = this.pad2(dateValue.getMonth() + 1);
        const day = this.pad2(dateValue.getDate());
        const hour = this.pad2(dateValue.getHours());
        const minute = this.pad2(dateValue.getMinutes());
        const second = this.pad2(dateValue.getSeconds());
        return `${year}/${month}/${day}  ${hour}:${minute}:${second}`;
    }

    private formatText(value: any): string {
        if (value === null || value === undefined || value === '') {
            return '-';
        }
        return String(value);
    }

    private formatAmount(value: any): string {
        const numeric = this.toNumber(value);
        if (numeric === null) {
            return this.formatText(value);
        }
        if (Math.abs(numeric - Math.trunc(numeric)) < 0.000001) {
            return String(Math.trunc(numeric));
        }
        return numeric.toFixed(2);
    }

    private toNumber(value: any): number | null {
        const numeric = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }

    private pad2(value: number): string {
        return value < 10 ? `0${value}` : String(value);
    }

    private onBackToLobbyClick() {
        if (!GameController.getInstance().canLeaveRoom()) {
            return;
        }
        GameController.getInstance().leaveRoom();
        this.navigateToRoomScene();
    }

    private navigateToRoomScene() {
        this.closeAll();
        director.loadScene('RoomScene');
    }
}
