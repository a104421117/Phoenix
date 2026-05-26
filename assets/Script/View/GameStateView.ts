import { _decorator, Button, Component, Label, Node, Prefab, Slider, instantiate, sp } from 'cc';
import { NodeSwitcher } from '../../Game.Client.Common/NodeSwitcher';
import { NumberSelector } from '../../Game.Client.Common/NumberSelector';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { GameData } from '../Model/GameData';
import { GmaeModel, ExistingBet, ExistingBetStatus, GameErrorPrompt, RoundState } from '../Model/GameData';
import { type CrashBetItemContract, type CrashCashoutItemContract } from '../Model/WebsocketManager';
import { GameController } from '../Controller/GameController';
import { AudioModel, SfxName } from '../Model/AudioModel';

const { ccclass, property } = _decorator;

enum State {
    Betting = 0,
    Running = 1,
    Crashed = 2,
}

enum ActionState {
    Betting = 0,
    Running = 1,
    Crashed = -1,
}

enum BetState {
    Bet = 0,
    Run = 1,
    Win = 2,
    Lose = 3,
}

type BetItemView = {
    node: Node;
    slotIndex: number;
    betStateSwitcher: NodeSwitcher | null;
    betUnitsLabel: Label | null;
    runningElapsedLabel: Label | null;
    payoutGrossLabel: Label | null;
    cashoutMultiplierLabel: Label | null;
    cashoutBtn: Button | null;
    cashoutHandler: (() => void) | null;
    betAmount: number;
    betIndex: number;
    hasCashedOut: boolean;
};

const AFK_AUTO_CASHOUT_MIN = 1.01;
const AFK_AUTO_CASHOUT_MAX = 20;
const AFK_AUTO_ROUND_OPTIONS = [1, 5, 10, 20, 50, 100, 200, 500];

@ccclass('GameStateView')
export class GameStateView extends Component {
    @property({ type: NodeSwitcher })
    private stateSwitcher: NodeSwitcher = null;

    @property({ type: NodeSwitcher })
    private actionSwitcher: NodeSwitcher = null;

    @property({ type: Label })
    private countdownLabel: Label = null;

    @property({ type: sp.Skeleton, tooltip: '倒數最後 5 秒的 Spine（skin 用數字、animation 用 animation）' })
    private countdownSpine: sp.Skeleton = null;

    /** 倒數 Spine 的動畫名稱（直接寫死於程式中）。 */
    private countdownSpineAnimationName: string = 'animation';

    private lastCountdownSecond: number = -1;
    private playedCountdownSpineSeconds: Set<number> = new Set();

    @property({ type: Label })
    private multiplierLabel: Label = null;

    @property({ type: Label })
    private crashLabel: Label = null;

    @property({ type: Label })
    private crashedCountdownLabel: Label = null;

    @property({ type: Label, tooltip: 'Label for crash.cashout payload.totalPayout.' })
    private totalPayoutLabel: Label = null;

    @property({ type: Node, tooltip: 'Parent node for totalPayout UI. Show on cashout only.' })
    private totalPayoutParentNode: Node = null;

    @property({ type: Label, tooltip: 'Label for player total: cashed-out uses payoutGross, otherwise betAmount * currentMultiplier.' })
    private playerCashoutTotalLabel: Label = null;

    @property({ type: Button })
    private betBtn: Button = null;

    @property({ type: Button, tooltip: 'Cashout all active bets button.' })
    private cashoutAllBtn: Button = null;

    @property({ type: Prefab, tooltip: 'Instantiate by maxBetsPerPlayer.' })
    private betItemPrefab: Prefab = null;

    @property({ type: Node, tooltip: 'Container for bet item prefabs.' })
    private betItemContainer: Node = null;

    @property({ type: Node, tooltip: '掛機：每局投注次數 NumberSelector root.' })
    private afkBetPerRoundNode: Node = null;

    @property({ type: Node, tooltip: '掛機：每注投注金額 NumberSelector root.' })
    private afkBetNode: Node = null;

    @property({ type: Node, tooltip: '掛機：自動局數 NumberSelector root.' })
    private afkAutoRoundNode: Node = null;

    @property({ type: Slider, tooltip: '掛機：自動領回倍數 slider.' })
    private afkAutoCashoutSlider: Slider = null;

    @property({ type: Label, tooltip: '掛機：自動領回倍數 label.' })
    private afkAutoCashoutLabel: Label = null;

    @property({ type: Button, tooltip: '掛機：開始/停止 button.' })
    private afkStartButton: Button = null;

    @property({ type: Label, tooltip: '掛機：開始/停止 button label.' })
    private afkStartButtonLabel: Label = null;

    private generatedBetNodes: Node[] = [];
    private betItemViews: BetItemView[] = [];
    private maxBetCount: number = 0;
    private afkBetPerRoundSelector: NumberSelector = null;
    private afkBetUnitsSelector: NumberSelector = null;
    private afkAutoRoundSelector: NumberSelector = null;
    private afkBetPerRound: number = 1;
    private afkBetUnits: number = 0;
    private afkAutoRounds: number = 10;
    private afkAutoCashoutMultiplier: number = 2;
    private afkRunning: boolean = false;
    private afkStopAfterCurrentRound: boolean = false;
    private afkRemainingRounds: number = 0;
    private afkBettingRoundOpen: boolean = false;
    private afkBetPlacedThisRound: boolean = false;
    private afkCashoutRequestedThisRound: boolean = false;
    private afkRoundBetIndexes: number[] = [];

    start() {
        const gameData = GameData.getInstance();
        GameData.getInstance().onGameState(GmaeModel.BetLevels, this.onBetLevels, this);
        GameData.getInstance().onGameState(GmaeModel.MaxBetCount, this.onMaxBetCount, this);
        GameData.getInstance().onGameState(GmaeModel.ExistingBets, this.onExistingBets, this);
        GameData.getInstance().onGameState(GmaeModel.BettingCountdown, this.onBetting, this);
        GameData.getInstance().onGameState(GmaeModel.CrashBet, this.onCrashBet, this);
        GameData.getInstance().onGameState(GmaeModel.Cashout, this.onCashout, this);
        GameData.getInstance().onGameState(GmaeModel.CashoutTotalPayout, this.onCashoutTotalPayout, this);
        GameData.getInstance().onGameState(GmaeModel.Multiplier, this.onRunning, this);
        GameData.getInstance().onGameState(GmaeModel.Explode, this.onCrashed, this);
        GameData.getInstance().onGameState(GmaeModel.CrashedCountdown, this.onCrashedCountdown, this);
        GameData.getInstance().onGameState(GmaeModel.Settled, this.onSettled, this);

        this.betBtn.node.on(Button.EventType.CLICK, this.onBetClick, this);
        this.cashoutAllBtn.node.on(Button.EventType.CLICK, this.onCashoutAllClick, this);
        this.bindAfkControls();

        this.switchState(ActionState.Crashed);
        this.switchActionState(ActionState.Crashed);

        this.onMaxBetCount(gameData.MaxBetCount);
        this.onBetLevels(gameData.BetLevels);
        this.onExistingBets(gameData.ExistingBets);

        this.updateTotalPayoutLabel(null);
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
    }

    private onMaxBetCount(maxBetsPerPlayer: number) {
        this.maxBetCount = Math.max(0, Math.floor(maxBetsPerPlayer || 0));
        this.configureAfkBetPerRoundSelector();

        if (!this.betItemPrefab) {
            return;
        }

        this.onExistingBets(GameData.getInstance().ExistingBets);
    }

    private onBetLevels(_: number[]) {
        this.configureAfkBetUnitsSelector();
    }

    private clearGeneratedBetNodes() {
        this.betItemViews.forEach((view) => {
            if (view.cashoutBtn && view.cashoutHandler) {
                view.cashoutBtn.node?.off(Button.EventType.CLICK, view.cashoutHandler);
            }
        });
        this.generatedBetNodes.forEach((node) => node?.destroy());
        this.generatedBetNodes.length = 0;
        this.betItemViews.length = 0;
    }

    private onBetting(countdown: number) {
        if (!this.afkBettingRoundOpen) {
            this.afkBettingRoundOpen = true;
            this.afkBetPlacedThisRound = false;
            this.afkCashoutRequestedThisRound = false;
            this.afkRoundBetIndexes.length = 0;
            this.lastCountdownSecond = -1;
            this.playedCountdownSpineSeconds.clear();
        }

        this.switchState(State.Betting);
        this.switchActionState(ActionState.Betting);
        const seconds = Math.ceil(countdown);
        this.countdownLabel.string = `${seconds}s`;
        this.updateCountdownSpine(seconds);
        this.updateTotalPayoutLabel(null);
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
        this.tryPlaceAfkBets();
    }

    /** 倒數最後 5 秒：切換 skin = 數字，播一次 animation；同步隱藏 countdownLabel。同一秒不重觸發。 */
    private updateCountdownSpine(seconds: number) {
        if (!this.countdownSpine) return;
        if (!Number.isFinite(seconds)) return;

        const inLastFive = seconds <= 5 && seconds > 0;
        this.countdownSpine.node.active = inLastFive;
        if (this.countdownLabel && this.countdownLabel.node) {
            this.countdownLabel.node.active = !inLastFive;
        }

        if (!inLastFive) {
            this.lastCountdownSecond = seconds;
            return;
        }

        if (seconds !== this.lastCountdownSecond) {
            this.countdownSpine.setSkin(String(seconds));
            this.lastCountdownSecond = seconds;
        }

        if (this.playedCountdownSpineSeconds.has(seconds)) return;
        this.playedCountdownSpineSeconds.add(seconds);
        this.countdownSpine.setAnimation(0, this.countdownSpineAnimationName, false);
    }

    private hideCountdownSpine() {
        if (this.countdownSpine && this.countdownSpine.node) {
            this.countdownSpine.node.active = false;
        }
        if (this.countdownLabel && this.countdownLabel.node) {
            this.countdownLabel.node.active = true;
        }
        this.lastCountdownSecond = -1;
    }

    private onCrashBet(payload: CrashBetItemContract) {
        if (typeof payload?.betIndex !== 'number') return;
        const index = Math.floor(payload.betIndex);
        if (!Number.isInteger(index) || index < 0) return;
        if (this.maxBetCount > 0 && index >= this.maxBetCount) return;

        const node = this.getOrCreateBetItem(index);
        if (!node) return;
        const view = this.betItemViews[index];
        if (!view) return;

        node.active = true;
        this.applyBetToItem(view, {
            betIndex: payload.betIndex,
            betAmount: payload.betAmount as unknown as number,
            status: ExistingBetStatus.Pending,
            cashoutMultiplier: null,
            payoutGross: null,
            payoutNet: null,
            currentProfit: null,
        });
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
        this.tryAfkAutoCashout(GameData.getInstance().Multiplier);
    }

    private onCashout(payload: CrashCashoutItemContract) {
        if (typeof payload?.betIndex !== 'number') return;
        const index = Math.floor(payload.betIndex);
        if (!Number.isInteger(index) || index < 0) return;
        if (this.maxBetCount > 0 && index >= this.maxBetCount) return;

        const node = this.getOrCreateBetItem(index);
        if (!node) return;
        const view = this.betItemViews[index];
        if (!view) return;

        node.active = true;
        this.applyBetToItem(view, {
            betIndex: payload.betIndex,
            betAmount: view.betAmount,
            status: ExistingBetStatus.CashedOut,
            cashoutMultiplier: payload.cashoutMultiplier,
            payoutGross: payload.payoutGross as unknown as number,
            payoutNet: payload.payoutNet as unknown as number,
            currentProfit: null,
        });
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
        this.stopAfkIfCurrentRoundDone();
    }

    private onRunning(multiplier: number) {
        if (GameData.getInstance().RoundState !== RoundState.Running) return;

        this.afkBettingRoundOpen = false;
        this.hideCountdownSpine();
        this.switchState(State.Running);
        this.switchActionState(ActionState.Running);
        this.multiplierLabel.string = `${BaseModel.getFloorStr(multiplier, 2)}x`;

        this.betItemViews.forEach((view) => {
            if (!view.node?.active || view.betAmount <= 0 || view.hasCashedOut) {
                return;
            }

            view.betStateSwitcher?.switch(BetState.Run);
            const gross = multiplier * view.betAmount;
            if (view.runningElapsedLabel) {
                view.runningElapsedLabel.string = BaseModel.getFloorStr(gross, 2);
            }
        });
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
        this.tryAfkAutoCashout(GameData.getInstance().Multiplier);
    }

    private onCrashed(crashPoint: number) {
        this.afkBettingRoundOpen = false;
        this.afkBetPlacedThisRound = false;
        this.afkCashoutRequestedThisRound = false;
        this.afkRoundBetIndexes.length = 0;
        this.hideCountdownSpine();

        this.switchState(State.Crashed);
        this.switchActionState(ActionState.Crashed);
        this.crashLabel.string = `${BaseModel.getFloorStr(crashPoint, 2)}x`;

        this.betItemViews.forEach((view) => {
            if (!view.node?.active || view.betAmount <= 0 || view.hasCashedOut) {
                return;
            }
            view.betStateSwitcher?.switch(BetState.Lose);
        });
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
        this.stopAfkIfComplete();
    }

    private onCrashedCountdown(countdown: number) {
        this.crashedCountdownLabel.string = `${Math.ceil(countdown)}s`;
    }

    private onSettled() {
        this.afkBettingRoundOpen = false;
        this.afkBetPlacedThisRound = false;
        this.afkCashoutRequestedThisRound = false;
        this.afkRoundBetIndexes.length = 0;
        this.hideCountdownSpine();

        this.switchState(-1);
        this.switchActionState(-1);
        this.updateTotalPayoutLabel(null);
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
        this.stopAfkIfComplete();
    }

    private onCashoutTotalPayout(totalPayout: number) {
        this.updateTotalPayoutLabel(totalPayout);
    }

    private onBetClick() {
        if (this.afkRunning) {
            this.showError(GameErrorPrompt.AfkActionBlocked);
            return;
        }
        GameData.getInstance().emitAudio(AudioModel.PlaySfx, SfxName.BtnBet);
        GameController.getInstance().sendBet();
    }

    private onExistingBets(existingBets: ExistingBet[]) {
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
            const view = this.betItemViews[index];
            if (!view) return;

            if (this.maxBetCount > 0 && index >= this.maxBetCount) {
                node.active = false;
                this.applyBetToItem(view, null);
                return;
            }

            const bet = map.get(index) ?? null;
            node.active = !!bet;
            this.applyBetToItem(view, bet);
        });
        this.updatePlayerCashoutTotalLabel();
        this.refreshCashoutAllButton();
    }

    private getOrCreateBetItem(index: number): Node | null {
        if (!this.betItemPrefab || index < 0) {
            return null;
        }

        const container = this.betItemContainer ?? this.node;
        for (let i = this.generatedBetNodes.length; i <= index; i++) {
            const node = instantiate(this.betItemPrefab);
            node.name = `${this.betItemPrefab.name}_${i + 1}`;
            node.active = false;

            const view = this.buildBetItemView(node, i);
            container.addChild(node);
            this.generatedBetNodes.push(node);
            this.betItemViews.push(view);
        }

        return this.generatedBetNodes[index] ?? null;
    }

    private buildBetItemView(node: Node, slotIndex: number): BetItemView {
        const cashoutBtn = this.findButton(node, 'RunNode/button-pick-normal');
        const view: BetItemView = {
            node,
            slotIndex,
            betStateSwitcher: node.getComponent(NodeSwitcher),
            betUnitsLabel: this.findLabel(node, 'BetNode/H3-D'),
            runningElapsedLabel: this.findLabel(node, 'RunNode/H3-D'),
            payoutGrossLabel: this.findLabel(node, 'WinNode/H3-C'),
            cashoutMultiplierLabel: this.findLabel(node, 'WinNode/H5-A'),
            cashoutBtn,
            cashoutHandler: null,
            betAmount: 0,
            betIndex: slotIndex,
            hasCashedOut: false,
        };

        const cashoutHandler = () => this.onCashoutClick(slotIndex);
        view.cashoutHandler = cashoutHandler;
        view.cashoutBtn?.node?.on(Button.EventType.CLICK, cashoutHandler);

        this.applyBetToItem(view, null);
        return view;
    }

    private applyBetToItem(view: BetItemView, bet: ExistingBet | null) {
        if (!bet) {
            view.betAmount = 0;
            view.betIndex = view.slotIndex;
            view.hasCashedOut = false;
            view.betStateSwitcher?.switch(BetState.Bet);
            if (view.betUnitsLabel) {
                view.betUnitsLabel.string = '';
            }
            if (view.runningElapsedLabel) {
                view.runningElapsedLabel.string = '';
            }
            if (view.payoutGrossLabel) {
                view.payoutGrossLabel.string = '';
            }
            if (view.cashoutMultiplierLabel) {
                view.cashoutMultiplierLabel.string = '';
            }
            return;
        }

        if (bet.betIndex !== view.slotIndex) {
            return;
        }

        view.betAmount = bet.betAmount;
        view.betIndex = bet.betIndex;
        if (view.betUnitsLabel) {
            view.betUnitsLabel.string = BaseModel.getMoneyStr(bet.betAmount);
        }

        const isCashedOut = bet.status === ExistingBetStatus.CashedOut
            || bet.status === ExistingBetStatus.CashoutPending
            || bet.cashoutMultiplier !== null;
        view.hasCashedOut = isCashedOut;

        if (bet.status === ExistingBetStatus.Lost) {
            view.betStateSwitcher?.switch(BetState.Lose);
            if (view.runningElapsedLabel) {
                view.runningElapsedLabel.string = '';
            }
            if (view.payoutGrossLabel) {
                view.payoutGrossLabel.string = '';
            }
            if (view.cashoutMultiplierLabel) {
                view.cashoutMultiplierLabel.string = '';
            }
            return;
        }

        if (isCashedOut) {
            view.betStateSwitcher?.switch(BetState.Win);
            const payoutNet = bet.payoutNet ?? bet.payoutGross;
            if (view.payoutGrossLabel) {
                view.payoutGrossLabel.string = this.formatPayoutNet(payoutNet);
            }
            if (view.cashoutMultiplierLabel) {
                view.cashoutMultiplierLabel.string = bet.cashoutMultiplier !== null
                    ? `${BaseModel.getFloorStr(bet.cashoutMultiplier, 2)}x`
                    : '';
            }
            if (view.runningElapsedLabel) {
                view.runningElapsedLabel.string = '';
            }
            return;
        }

        if (bet.currentProfit !== null) {
            view.betStateSwitcher?.switch(BetState.Run);
            if (view.runningElapsedLabel) {
                view.runningElapsedLabel.string = BaseModel.getFloorStr(bet.currentProfit, 2);
            }
            if (view.payoutGrossLabel) {
                view.payoutGrossLabel.string = '';
            }
            if (view.cashoutMultiplierLabel) {
                view.cashoutMultiplierLabel.string = '';
            }
            return;
        }

        view.betStateSwitcher?.switch(BetState.Bet);
        if (view.runningElapsedLabel) {
            view.runningElapsedLabel.string = '';
        }
        if (view.payoutGrossLabel) {
            view.payoutGrossLabel.string = '';
        }
        if (view.cashoutMultiplierLabel) {
            view.cashoutMultiplierLabel.string = '';
        }
    }

    private onCashoutClick(slotIndex: number) {
        const view = this.betItemViews[slotIndex];
        if (!view || !view.node?.active || view.betAmount <= 0 || view.hasCashedOut) {
            return;
        }
        GameData.getInstance().emitAudio(AudioModel.PlaySfx, SfxName.BtnGet);
        GameController.getInstance().sendCashout(view.betIndex);
    }

    private onCashoutAllClick() {
        const betIndexes = this.getPendingCashoutBetIndexes();
        if (betIndexes.length <= 0) {
            return;
        }
        GameData.getInstance().emitAudio(AudioModel.PlaySfx, SfxName.BtnGet);
        GameController.getInstance().sendCashoutAll(betIndexes);
    }

    private bindAfkControls() {
        this.afkBetPerRoundSelector = this.afkBetPerRoundNode.getComponentInChildren(NumberSelector);
        this.afkBetUnitsSelector = this.afkBetNode.getComponentInChildren(NumberSelector);
        this.afkAutoRoundSelector = this.afkAutoRoundNode.getComponentInChildren(NumberSelector);

        this.afkBetPerRoundSelector.addValueChangedListener(this.onAfkBetPerRoundChanged, this);
        this.afkBetUnitsSelector.addValueChangedListener(this.onAfkBetUnitsChanged, this);
        this.afkAutoRoundSelector.addValueChangedListener(this.onAfkAutoRoundChanged, this);
        this.afkAutoCashoutSlider.node.on('slide', this.onAfkAutoCashoutSlide, this);
        this.afkStartButton.node.on(Button.EventType.CLICK, this.onAfkStartClick, this);

        this.configureAfkBetPerRoundSelector();
        this.configureAfkBetUnitsSelector();
        this.configureAfkAutoRoundSelector();
        this.setAfkAutoCashoutMultiplier(this.afkAutoCashoutMultiplier, true);
        this.updateAfkStartButtonLabel();
    }

    private unbindAfkControls() {
        this.afkBetPerRoundSelector.removeValueChangedListener(this.onAfkBetPerRoundChanged, this);
        this.afkBetUnitsSelector.removeValueChangedListener(this.onAfkBetUnitsChanged, this);
        this.afkAutoRoundSelector.removeValueChangedListener(this.onAfkAutoRoundChanged, this);
        this.afkAutoCashoutSlider.node.off('slide', this.onAfkAutoCashoutSlide, this);
        this.afkStartButton.node.off(Button.EventType.CLICK, this.onAfkStartClick, this);
    }

    private configureAfkBetPerRoundSelector() {
        const maxBetCount = Math.max(1, this.maxBetCount || GameData.getInstance().MaxBetCount || 1);
        const values = Array.from({ length: maxBetCount }, (_, index) => index + 1);
        this.setSelectorValues(this.afkBetPerRoundSelector, values, this.afkBetPerRound);
        this.afkBetPerRound = this.afkBetPerRoundSelector.currentValue || 1;
    }

    private configureAfkBetUnitsSelector() {
        const gameData = GameData.getInstance();
        const options = gameData.BetLevels.length > 0
            ? gameData.BetLevels
            : [gameData.SelectedBetUnits || this.afkBetUnits || 1];
        const currentValue = this.afkBetUnits > 0
            ? this.afkBetUnits
            : (gameData.SelectedBetUnits || options[0] || 1);

        this.setSelectorValues(this.afkBetUnitsSelector, options, currentValue);
        this.afkBetUnits = this.afkBetUnitsSelector.currentValue || currentValue;
    }

    private configureAfkAutoRoundSelector() {
        this.setSelectorValues(this.afkAutoRoundSelector, AFK_AUTO_ROUND_OPTIONS, this.afkAutoRounds);
        this.afkAutoRounds = this.afkAutoRoundSelector.currentValue || this.afkAutoRounds;
    }

    private setSelectorValues(selector: NumberSelector, values: number[], currentValue: number) {
        const normalizedValues = [...new Set(values
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0))]
            .sort((a, b) => a - b);
        const safeValues = normalizedValues.length > 0 ? normalizedValues : [1];
        selector.setValues(safeValues, true);

        if (selector.setValue(currentValue, false)) {
            return;
        }

        const nearestIndex = safeValues.reduce((bestIndex, value, index) => {
            const best = safeValues[bestIndex];
            return Math.abs(value - currentValue) < Math.abs(best - currentValue) ? index : bestIndex;
        }, 0);
        selector.setIndex(nearestIndex, false);
    }

    private onAfkBetPerRoundChanged(value: number) {
        if (this.afkRunning) {
            this.showError(GameErrorPrompt.AfkActionBlocked);
            this.configureAfkBetPerRoundSelector();
            return;
        }
        this.afkBetPerRound = Math.max(1, Math.floor(value || 1));
    }

    private onAfkBetUnitsChanged(value: number) {
        if (this.afkRunning) {
            this.showError(GameErrorPrompt.AfkActionBlocked);
            this.configureAfkBetUnitsSelector();
            return;
        }
        this.afkBetUnits = Math.max(0, Number(value) || 0);
    }

    private onAfkAutoRoundChanged(value: number) {
        if (this.afkRunning) {
            this.showError(GameErrorPrompt.AfkActionBlocked);
            this.configureAfkAutoRoundSelector();
            return;
        }
        this.afkAutoRounds = Math.max(1, Math.floor(value || 1));
        if (!this.afkRunning) {
            this.afkRemainingRounds = this.afkAutoRounds;
        }
    }

    private onAfkAutoCashoutSlide() {
        if (this.afkRunning) {
            this.showError(GameErrorPrompt.AfkActionBlocked);
            this.setAfkAutoCashoutMultiplier(this.afkAutoCashoutMultiplier, true);
            return;
        }
        this.setAfkAutoCashoutMultiplier(
            this.progressToAfkAutoCashoutMultiplier(this.afkAutoCashoutSlider.progress),
            false,
        );
    }

    private onAfkStartClick() {
        if (this.afkRunning) {
            this.stopAfkSession();
            return;
        }

        this.syncAfkSettingsFromControls();
        if (!GameController.getInstance().canAffordBets(this.resolveAfkBetUnits(), this.afkBetPerRound)) {
            this.showError(GameErrorPrompt.InsufficientBalanceWithPeriod);
            return;
        }
        this.afkRunning = true;
        this.afkStopAfterCurrentRound = false;
        this.afkRemainingRounds = this.afkAutoRounds;
        this.afkBetPlacedThisRound = false;
        this.afkCashoutRequestedThisRound = false;
        this.afkRoundBetIndexes.length = 0;
        this.updateAfkStartButtonLabel();
        this.tryPlaceAfkBets();
    }

    private syncAfkSettingsFromControls() {
        this.afkBetPerRound = Math.max(1, Math.floor(this.afkBetPerRoundSelector.currentValue || 1));
        this.afkBetUnits = Math.max(0, Number(this.afkBetUnitsSelector.currentValue) || 0);
        this.afkAutoRounds = Math.max(1, Math.floor(this.afkAutoRoundSelector.currentValue || 1));
        this.setAfkAutoCashoutMultiplier(
            this.progressToAfkAutoCashoutMultiplier(this.afkAutoCashoutSlider.progress),
            false,
        );
    }

    private tryPlaceAfkBets() {
        if (!this.afkRunning || this.afkBetPlacedThisRound || this.afkRemainingRounds <= 0) {
            return;
        }
        if (GameData.getInstance().RoundState !== RoundState.Betting) {
            return;
        }

        const betUnits = this.resolveAfkBetUnits();
        if (betUnits <= 0) {
            return;
        }
        if (!GameController.getInstance().canAffordBets(betUnits, this.afkBetPerRound)) {
            this.stopAfkSession();
            this.showError(GameErrorPrompt.InsufficientBalanceWithPeriod);
            return;
        }

        const betIndexes = GameController.getInstance().sendBets(
            betUnits,
            this.afkBetPerRound,
            this.afkAutoCashoutMultiplier,
        );
        if (betIndexes.length <= 0) {
            return;
        }

        this.afkRoundBetIndexes = betIndexes;
        this.afkBetPlacedThisRound = true;
        this.afkCashoutRequestedThisRound = false;
        this.afkRemainingRounds = Math.max(0, this.afkRemainingRounds - 1);
        if (this.afkRemainingRounds <= 0) {
            this.afkStopAfterCurrentRound = true;
        }
        this.updateAfkStartButtonLabel();
    }

    private tryAfkAutoCashout(multiplier: number) {
        if ((!this.afkRunning && !this.afkStopAfterCurrentRound) || this.afkCashoutRequestedThisRound) {
            return;
        }
        if (!Number.isFinite(multiplier) || multiplier < this.afkAutoCashoutMultiplier) {
            return;
        }

        const betIndexes = this.getPendingAfkCashoutBetIndexes();
        if (betIndexes.length <= 0) {
            return;
        }

        this.afkCashoutRequestedThisRound = true;
        GameController.getInstance().sendCashoutAll(betIndexes);
    }

    private getPendingAfkCashoutBetIndexes(): number[] {
        if (GameData.getInstance().RoundState !== RoundState.Running) {
            return [];
        }

        const indexSet = new Set(this.afkRoundBetIndexes);
        if (indexSet.size <= 0) {
            return [];
        }

        return (GameData.getInstance().ExistingBets ?? [])
            .filter((bet) => indexSet.has(bet.betIndex))
            .filter((bet) => bet.status !== ExistingBetStatus.CashedOut
                && bet.status !== ExistingBetStatus.CashoutPending
                && bet.status !== ExistingBetStatus.Lost
                && bet.cashoutMultiplier === null)
            .map((bet) => bet.betIndex);
    }

    private resolveAfkBetUnits(): number {
        if (Number.isFinite(this.afkBetUnits) && this.afkBetUnits > 0) {
            return this.afkBetUnits;
        }

        const gameData = GameData.getInstance();
        return gameData.SelectedBetUnits || gameData.BetLevels[0] || 0;
    }

    private setAfkAutoCashoutMultiplier(multiplier: number, updateSlider: boolean) {
        const normalized = Math.max(
            AFK_AUTO_CASHOUT_MIN,
            Math.min(AFK_AUTO_CASHOUT_MAX, Number(multiplier) || 2),
        );
        this.afkAutoCashoutMultiplier = Math.round(normalized * 100) / 100;

        if (updateSlider) {
            this.afkAutoCashoutSlider.progress = this.afkAutoCashoutMultiplierToProgress(this.afkAutoCashoutMultiplier);
        }
        this.afkAutoCashoutLabel.string = `${BaseModel.getFloorStr(this.afkAutoCashoutMultiplier, 2)}X`;
    }

    private afkAutoCashoutMultiplierToProgress(multiplier: number): number {
        const progress = (multiplier - AFK_AUTO_CASHOUT_MIN) / (AFK_AUTO_CASHOUT_MAX - AFK_AUTO_CASHOUT_MIN);
        return Math.max(0, Math.min(1, progress));
    }

    private progressToAfkAutoCashoutMultiplier(progress: number): number {
        const normalizedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
        return AFK_AUTO_CASHOUT_MIN
            + (AFK_AUTO_CASHOUT_MAX - AFK_AUTO_CASHOUT_MIN) * normalizedProgress;
    }

    private stopAfkIfComplete() {
        if (!this.afkStopAfterCurrentRound || this.afkRemainingRounds > 0) {
            return;
        }
        this.stopAfkSession(false);
    }

    private stopAfkIfCurrentRoundDone() {
        if (!this.afkStopAfterCurrentRound || this.afkRemainingRounds > 0) {
            return;
        }
        if (this.getPendingAfkCashoutBetIndexes().length > 0) {
            return;
        }
        this.stopAfkSession(false);
    }

    private stopAfkSession(clearRoundState: boolean = true) {
        this.afkRunning = false;
        this.afkStopAfterCurrentRound = false;
        this.afkRemainingRounds = this.afkAutoRounds;
        this.afkBetPlacedThisRound = false;
        this.afkCashoutRequestedThisRound = false;
        if (clearRoundState) {
            this.afkRoundBetIndexes.length = 0;
        }
        this.updateAfkStartButtonLabel();
    }

    private updateAfkStartButtonLabel() {
        this.afkStartButtonLabel.string = this.afkRunning ? '停止' : '開始';
    }
    private showError(message: GameErrorPrompt | string) {
        GameData.getInstance().emitGameState(GmaeModel.ShowError, { message });
    }

    private formatPayoutNet(value: number | null): string {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return '';
        }
        const formatted = BaseModel.getMoneyStr(value);
        return value > 0 ? `+${formatted}` : formatted;
    }

    private updateTotalPayoutLabel(value: number | null) {
        const hasValue = typeof value === 'number' && Number.isFinite(value);
        this.totalPayoutParentNode.active = hasValue;
        this.totalPayoutLabel.string = hasValue ? this.formatPayoutNet(value) : '';
    }

    private updatePlayerCashoutTotalLabel() {
        const total = this.getPlayerCashoutTotal();
        this.playerCashoutTotalLabel.string = BaseModel.getMoneyStr(total);

        if (GameData.getInstance().RoundState === RoundState.Running) {
            const isZeroTotal = Math.abs(total) < 0.000001;
            this.switchActionState(isZeroTotal ? ActionState.Crashed : ActionState.Running);
        }
    }

    private switchState(index: number) {
        if (this.stateSwitcher.Index === index) return;
        this.stateSwitcher.switch(index);
    }

    private switchActionState(index: number) {
        if (this.actionSwitcher.Index === index) return;
        this.actionSwitcher.switch(index);
    }

    private getPlayerCashoutTotal(): number {
        const existingBets = GameData.getInstance().ExistingBets ?? [];
        // multiplier 由 GameController normalize 後寫入 GameData，view 端直接讀
        const multiplier = GameData.getInstance().Multiplier;

        return existingBets.reduce((sum, bet) => {
            const betAmount = Number(bet?.betAmount);
            if (!Number.isFinite(betAmount) || betAmount <= 0) {
                return sum;
            }

            const isCashedOut = bet.status === ExistingBetStatus.CashedOut
                || bet.status === ExistingBetStatus.CashoutPending
                || bet.cashoutMultiplier !== null;

            if (isCashedOut) {
                return sum + this.resolveBetPayout(bet);
            }
            return sum + betAmount * multiplier;
        }, 0);
    }

    private resolveBetPayout(bet: ExistingBet): number {
        return bet.payoutGross !== null && Number.isFinite(bet.payoutGross) ? bet.payoutGross : 0;
    }

    private refreshCashoutAllButton() {
        this.cashoutAllBtn.interactable = this.getPendingCashoutBetIndexes().length > 0;
    }

    private getPendingCashoutBetIndexes(): number[] {
        if (GameData.getInstance().RoundState !== RoundState.Running) {
            return [];
        }
        return this.betItemViews
            .filter((view) => !!view && !!view.node?.active && view.betAmount > 0 && !view.hasCashedOut)
            .map((view) => view.betIndex);
    }

    private findLabel(root: Node, path: string): Label | null {
        return root.getChildByPath(path)?.getComponent(Label) ?? null;
    }

    private findButton(root: Node, path: string): Button | null {
        return root.getChildByPath(path)?.getComponent(Button) ?? null;
    }
}
