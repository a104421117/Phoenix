import { _decorator, Button, Component, Label } from 'cc';
import { NodeSwitcher } from '../../Base/NodeSwitcher';
import { BaseModel } from '../../Base/BaseModel';
import { GameData, GmaeModel } from '../Model/GameData';
import { CrashBetPayload, CashoutPayload, ExistingBet, ExistingBetStatus } from '../Model/GameModel';
const { ccclass, property } = _decorator;

/** BetState 列舉。 */
enum BetState {
    Bet = 0,
    Run = 1,
    Win = 2,
    Lose = 3,
}

@ccclass('BetInfoView')
export class BetInfoView extends Component {
    /** 欄位設定。 */
    @property({ type: NodeSwitcher })
    private betStateSwitcher: NodeSwitcher = null;

    /** 欄位設定。 */
    @property({ type: Label })
    private betUnitsLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private runningElapsedLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private payoutGrossLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Label })
    private cashoutMultiplierLabel: Label = null;
    /** 欄位設定。 */
    @property({ type: Button })
    private cashoutBtn: Button = null;

    /** betAmount 欄位。 */
    private betAmount: number = 0;
    /** betIndex 欄位。 */
    private betIndex: number = 0;
    /** hasCashedOut 欄位。 */
    private hasCashedOut: boolean = false;
    /** slotIndex 欄位。 */
    private slotIndex: number = -1;

    /** 由外部（例如 GameStateView 動態生成時）注入注單索引 */
    public setSlotIndex(index: number) {
        this.slotIndex = index;
        this.betIndex = index;
    }

    /** start。 */
    start() {
        const gameData = GameData.getInstance();
        gameData.on(GmaeModel.CrashBet, this.onCrashBet, this);
        gameData.on(GmaeModel.Multiplier, this.onRunning, this);
        gameData.on(GmaeModel.Cashout, this.onCashout, this);
        gameData.on(GmaeModel.Explode, this.onCrashed, this);

        this.cashoutBtn.node.on(Button.EventType.CLICK, this.onCashoutClick, this);

        this.betStateSwitcher.switch(BetState.Bet);
    }

    /** 下注成功 */
    private onCrashBet(payload: CrashBetPayload) {
        if (typeof payload?.betAmount !== 'number' || typeof payload?.betIndex !== 'number') return;
        if (this.slotIndex >= 0 && payload.betIndex !== this.slotIndex) return;
        this.applyExistingBet({
            betId: payload.betId,
            betIndex: payload.betIndex,
            betAmount: payload.betAmount,
            status: 'Pending',
            autoCashoutMultiplier: payload.autoCashoutMultiplier,
        });
    }

    /** Running：顯示即時利潤 */
    private onRunning(multiplier: number) {
        if (this.betAmount <= 0 || this.hasCashedOut) return;
        this.betStateSwitcher.switch(BetState.Run);
        const profit = multiplier * this.betAmount;
        this.runningElapsedLabel.string = BaseModel.getFormatNum(profit);
    }

    /** 兌現成功 */
    private onCashout(payload: CashoutPayload) {
        if (this.slotIndex >= 0 && payload.betIndex !== this.slotIndex) return;
        this.applyExistingBet({
            betIndex: payload.betIndex,
            betAmount: this.betAmount,
            status: 'CashedOut',
            cashoutMultiplier: payload.cashoutMultiplier,
            payoutGross: payload.payoutGross,
            serviceFee: payload.serviceFee,
            payoutNet: payload.payoutNet,
        });
    }

    /** Crashed：未兌現 = 輸 */
    private onCrashed() {
        if (this.betAmount > 0 && !this.hasCashedOut) {
            this.betStateSwitcher.switch(BetState.Lose);
        }
    }

    /** 點擊兌現按鈕 */
    private onCashoutClick() {
        if (this.betAmount <= 0 || this.hasCashedOut) return;
        GameData.getInstance().sendCashout(this.betIndex);
    }

    /** 還原或更新單筆注單狀態（existingBets / 動態事件共用） */
    public applyExistingBet(bet: ExistingBet | null) {
        if (!bet) {
            this.betAmount = 0;
            this.betIndex = this.slotIndex >= 0 ? this.slotIndex : 0;
            this.hasCashedOut = false;
            this.betStateSwitcher.switch(BetState.Bet);
            this.betUnitsLabel.string = '';
            this.runningElapsedLabel.string = '';
            this.payoutGrossLabel.string = '';
            this.cashoutMultiplierLabel.string = '';
            return;
        }

        if (this.slotIndex >= 0 && bet.betIndex !== this.slotIndex) return;

        this.betAmount = bet.betAmount;
        this.betIndex = bet.betIndex;
        this.betUnitsLabel.string = BaseModel.getFormatNum(bet.betAmount);

        const status = (bet.status ?? 'Pending') as ExistingBetStatus;
        const isCashedOut = status === 'CashedOut' || status === 'CashoutPending' || typeof bet.cashoutMultiplier === 'number';
        this.hasCashedOut = isCashedOut;

        if (status === 'Lost') {
            this.betStateSwitcher.switch(BetState.Lose);
            this.runningElapsedLabel.string = '';
            this.payoutGrossLabel.string = '';
            this.cashoutMultiplierLabel.string = '';
            return;
        }

        if (isCashedOut) {
            this.betStateSwitcher.switch(BetState.Win);
            const payout = typeof bet.payoutGross === 'number'
                ? bet.payoutGross
                : (typeof bet.payoutNet === 'number' ? bet.payoutNet : 0);
            this.payoutGrossLabel.string = payout > 0 ? BaseModel.getFormatNum(payout) : '';
            this.cashoutMultiplierLabel.string = typeof bet.cashoutMultiplier === 'number'
                ? `${BaseModel.getRoundToStr(bet.cashoutMultiplier, 2)}x`
                : '';
            this.runningElapsedLabel.string = '';
            return;
        }

        if (typeof bet.currentProfit === 'number') {
            this.betStateSwitcher.switch(BetState.Run);
            this.runningElapsedLabel.string = BaseModel.getFormatNum(bet.currentProfit);
            this.payoutGrossLabel.string = '';
            this.cashoutMultiplierLabel.string = '';
            return;
        }

        this.betStateSwitcher.switch(BetState.Bet);
        this.runningElapsedLabel.string = '';
        this.payoutGrossLabel.string = '';
        this.cashoutMultiplierLabel.string = '';
    }
}
