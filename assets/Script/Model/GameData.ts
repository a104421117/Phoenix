import { _decorator, Component, Node, EventTarget, log } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { GmaeModel, GmaeModelMap } from './GameModel';
import { Bet, BetOK, BettingStart, ClientCmd, Explode, Flying, Login, ServerCmd } from './WebsocketModel';
import { WebsocketManager } from './WebsocketManager';

export { GmaeModel, type GmaeModelMap } from './GameModel';
export class GameData extends BaseModel.GameEvent<GmaeModel, GmaeModelMap> {
    private constructor() {
        super();
    }
    private static instance: GameData = null;
    private id: string = '';
    private name: string = '';
    private balance: number = 0;
    private betOptions: number[] = [];
    private maxBetCount: number = 0;
    private roundHistory: number[] = [];
    private amountArr: number[] = [0, 0, 0, 0, 0];
    private betIndex: number = 0;

    public get ID(): string { return this.id; }
    public set ID(id: string) {
        this.eventTarget.emit(GmaeModel.ID, id);
        this.id = id;
    }

    public get Name(): string { return this.name; }
    private set Name(name: string) {
        this.eventTarget.emit(GmaeModel.Name, name);
        this.name = name;
    }

    public get Balance(): number { return this.balance; }
    private set Balance(balance: number) {
        this.eventTarget.emit(GmaeModel.Balance, balance);
        this.balance = balance;
    }

    public get BetOptions(): number[] { return this.betOptions; }
    private set BetOptions(betOptions: number[]) {
        this.eventTarget.emit(GmaeModel.BetOptions, betOptions);
        this.betOptions = betOptions;
    }

    public get MaxBetCount(): number { return this.maxBetCount; }
    private set MaxBetCount(maxBetCount: number) {
        this.eventTarget.emit(GmaeModel.MaxBetCount, maxBetCount);
        this.maxBetCount = maxBetCount;
    }

    public get RoundHistory(): number[] { return this.roundHistory; }
    private set RoundHistory(roundHistory: number[]) {
        this.eventTarget.emit(GmaeModel.RoundHistory, roundHistory);
        this.roundHistory = roundHistory;
    }

    public static getInstance(): GameData {
        if (!this.instance) this.instance = new GameData();
        return this.instance;
    }

    public login(data: Login) {
        log(data);
        this.ID = data.id;
        this.Name = data.name;
        this.Balance = data.balance;
        this.BetOptions = data.betOptions;
        this.MaxBetCount = data.maxBetCount;
        this.RoundHistory = data.roundHistory;
    }

    private cancelBettingCountdown: () => void = null;
    private cancelRoundCountdown: () => void = null;

    public bettingStart(data: BettingStart) {
        log("BettingStart", data);
        if (this.cancelBettingCountdown) this.cancelBettingCountdown();
        this.cancelBettingCountdown = BaseModel.countdown(
            data.seconds,
            (remaining) => this.eventTarget.emit(GmaeModel.BettingCountdown, remaining),
        );
        this.betIndex = 0;
    }

    public betOK(data: BetOK) {
        log(data);
        if (data.index < this.maxBetCount - 1) {
            this.betIndex = data.index + 1;
        }
        this.amountArr[data.index];
        this.eventTarget.emit(GmaeModel.BetOK, data);
    }

    public flying(data: Flying) {
        log("Flying", data);
        this.eventTarget.emit(GmaeModel.Multiplier, data.multiplier);
        this.eventTarget.emit(GmaeModel.Multiplier, data.multiplier);
    }

    public explode(data: Explode) {
        log(data);
        this.eventTarget.emit(GmaeModel.Explode, data.multiplier);
        this.addRoundHistory(data.multiplier);
        if (this.cancelRoundCountdown) this.cancelRoundCountdown();
        this.cancelRoundCountdown = BaseModel.countdown(
            data.seconds,
            (remaining) => this.eventTarget.emit(GmaeModel.RoundCountdown, remaining),
        );
    }

    /** 新增歷史紀錄 */
    private addRoundHistory(roundHistory: number) {
        this.roundHistory.push(roundHistory);
        this.eventTarget.emit(GmaeModel.RoundHistory, this.roundHistory);
    }

    public sendBet(amount: number) {
        const bet: Bet = {
            index: this.betIndex,
            amount: amount
        }
        WebsocketManager.getInstance().send(ClientCmd.Bet, bet);
    }
}
