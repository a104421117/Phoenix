import { _decorator, Button, Component, Label, log, Node, Prefab, instantiate } from 'cc';
import { NodeSwitcher } from '../../Base/NodeSwitcher';
import { BaseModel } from '../../Base/BaseModel';
import { GameData, GmaeModel } from '../Model/GameData';
import { CrashBetPayload, ExistingBet } from '../Model/GameModel';
import { BetInfoView } from './BetInfoView';
const { ccclass, property } = _decorator;

/** State 列舉。 */
enum State {
    Betting = 0,
    Running = 1,
    Crashed = 2,
}

/** ActionState 列舉。 */
enum ActionState {
    Betting = 0,
    Running = 1,
    Crashed = -1,
}

@ccclass('GameStateView')
export class GameStateView extends Component {
    /** 欄位設定。 */
    @property({ type: NodeSwitcher })
    private stateSwitcher: NodeSwitcher = null;
    /** 欄位設定。 */
    @property({ type: NodeSwitcher })
    private actionSwitcher: NodeSwitcher = null;

    /** 欄位設定。 */
    @property({ type: Label })
    private countdownLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private multiplierLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private crashLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private crashedCountdownLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Button })
    private betBtn: Button = null;
    /** 依 maxBetsPerPlayer 生成的注單 Prefab。 */
    @property({ type: Prefab, tooltip: '依 maxBetsPerPlayer 生成的注單 Prefab' })
    private betItemPrefab: Prefab = null;
    /** 注單 Prefab 的父節點。 */
    @property({ type: Node, tooltip: '注單 Prefab 的父節點' })
    private betItemContainer: Node = null;

    /** generatedBetNodes 欄位。 */
    private generatedBetNodes: Node[] = [];
    /** betInfoViews 欄位。 */
    private betInfoViews: BetInfoView[] = [];
    /** maxBetCount 欄位。 */
    private maxBetCount: number = 0;

    /** start。 */
    start() {
        const gameData = GameData.getInstance();
        gameData.on(GmaeModel.MaxBetCount, this.onMaxBetCount, this);
        gameData.on(GmaeModel.ExistingBets, this.onExistingBets, this);
        gameData.on(GmaeModel.BettingCountdown, this.onBetting, this);
        gameData.on(GmaeModel.CrashBet, this.onCrashBet, this);
        gameData.on(GmaeModel.Multiplier, this.onRunning, this);
        gameData.on(GmaeModel.Explode, this.onCrashed, this);
        gameData.on(GmaeModel.CrashedCountdown, this.onCrashedCountdown, this);
        gameData.on(GmaeModel.Settled, this.onSettled, this);

        this.betBtn?.node.on(Button.EventType.CLICK, this.onBetClick, this);

        this.stateSwitcher.switch(ActionState.Crashed);
        this.actionSwitcher.switch(ActionState.Crashed);

        /** 進場時同步目前已載入的 maxBetsPerPlayer（通常在 room.join 後已有值） */
        this.onMaxBetCount(gameData.MaxBetCount);
        this.onExistingBets(gameData.ExistingBets);
    }

    /** onDestroy。 */
    protected onDestroy(): void {
        this.betBtn?.node.off(Button.EventType.CLICK, this.onBetClick, this);
        this.clearGeneratedBetNodes();
    }

    /**
     * onMaxBetCount。
     * @param maxBetsPerPlayer maxBetsPerPlayer
     */
    private onMaxBetCount(maxBetsPerPlayer: number) {
        if (!this.betItemPrefab) {
            return;
        }

        /** 比照 LeaderboardView.itemPrefab：只更新上限，不在這裡預先生成 */
        this.maxBetCount = Math.max(0, Math.floor(maxBetsPerPlayer || 0));
        this.onExistingBets(GameData.getInstance().ExistingBets);
    }

    /** clearGeneratedBetNodes。 */
    private clearGeneratedBetNodes() {
        this.generatedBetNodes.forEach((node) => node?.destroy());
        this.generatedBetNodes.length = 0;
        this.betInfoViews.length = 0;
    }

    /**
     * onBetting。
     * @param countdown countdown
     */
    private onBetting(countdown: number) {
        /** 注單顯示完全由 existingBets 事件驅動，不跟倒數狀態耦合 */
        this.stateSwitcher.switch(State.Betting);
        this.actionSwitcher.switch(ActionState.Betting);
        this.countdownLabel.string = `${Math.ceil(countdown)}s`;
    }

    /**
     * onCrashBet。
     * @param payload payload
     */
    private onCrashBet(payload: CrashBetPayload) {
        if (typeof payload?.betIndex !== 'number') return;
        const index = Math.floor(payload.betIndex);
        if (!Number.isInteger(index) || index < 0) {
            return;
        }
        if (this.maxBetCount > 0 && index >= this.maxBetCount) {
            return;
        }
        const node = this.getOrCreateBetItem(index);
        if (!node) return;
        node.active = true;
        this.betInfoViews[index]?.applyExistingBet({
            betId: payload.betId,
            betIndex: payload.betIndex,
            betAmount: payload.betAmount,
            status: 'Pending',
            autoCashoutMultiplier: payload.autoCashoutMultiplier,
        });
    }

    /**
     * onRunning。
     * @param multiplier multiplier
     */
    private onRunning(multiplier: number) {
        this.stateSwitcher.switch(State.Running);
        this.actionSwitcher.switch(ActionState.Running);
        this.multiplierLabel.string = `${BaseModel.getRoundToStr(multiplier, 2)}x`;
    }

    /**
     * onCrashed。
     * @param crashPoint crashPoint
     */
    private onCrashed(crashPoint: number) {
        this.stateSwitcher.switch(State.Crashed);
        this.actionSwitcher.switch(ActionState.Crashed);
        this.crashLabel.string = `${BaseModel.getRoundToStr(crashPoint, 2)}x`;
    }

    /**
     * onCrashedCountdown。
     * @param countdown countdown
     */
    private onCrashedCountdown(countdown: number) {
        this.crashedCountdownLabel.string = `${Math.ceil(countdown)}s`;
    }

    /** onSettled。 */
    private onSettled() {
        this.stateSwitcher.switch(-1);
        this.actionSwitcher.switch(-1);
    }

    /** onBetClick。 */
    private onBetClick() {
        GameData.getInstance().sendBet();
    }

    /**
     * onExistingBets。
     * @param existingBets existingBets
     */
    private onExistingBets(existingBets: ExistingBet[]) {
        log('[GameStateView] onExistingBets', existingBets);
        const map = new Map<number, ExistingBet>();
        (existingBets ?? []).forEach((bet) => {
            if (!Number.isInteger(bet.betIndex)) return;
            if (this.maxBetCount > 0 && bet.betIndex >= this.maxBetCount) return;
            this.getOrCreateBetItem(bet.betIndex);
            if (this.generatedBetNodes[bet.betIndex]) {
                map.set(bet.betIndex, bet);
            }
        });

        this.generatedBetNodes.forEach((node, index) => {
            if (this.maxBetCount > 0 && index >= this.maxBetCount) {
                if (node) node.active = false;
                this.betInfoViews[index]?.applyExistingBet(null);
                return;
            }
            const bet = map.get(index) ?? null;
            if (node) node.active = !!bet;
            this.betInfoViews[index]?.applyExistingBet(bet);
        });
    }

    /**
     * getOrCreateBetItem。
     * @param index index
     * @returns getOrCreateBetItem 回傳值
     */
    private getOrCreateBetItem(index: number): Node | null {
        if (!this.betItemPrefab) return null;
        if (index < 0) return null;

        const container = this.betItemContainer ?? this.node;
        for (let i = this.generatedBetNodes.length; i <= index; i++) {
            const node = instantiate(this.betItemPrefab);
            node.name = `${this.betItemPrefab.name}_${i + 1}`;
            node.active = false;
            const betInfoView = node.getComponent(BetInfoView);
            betInfoView?.setSlotIndex(i);
            container.addChild(node);
            this.generatedBetNodes.push(node);
            this.betInfoViews.push(betInfoView);
        }
        return this.generatedBetNodes[index] ?? null;
    }
}
