import { _decorator, Component, Node, EventTarget } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { GmaeModel, GmaeModelMap } from './GameModel';
import { BettingStart, Explode, Flying, Login } from './ServerModel';

export { GmaeModel, type GmaeModelMap } from './GameModel';
export class GameData extends BaseModel.GameEvent<GmaeModel, GmaeModelMap> {
    private constructor() { super(); }
    private static instance: GameData = null;
    private id: string = '';
    private name: string = '';
    private balance: number = 0;
    private betOptions: number[] = [];
    private maxBetCount: number = 0;
    private roundHistory: number[] = [];

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
        if (this.cancelBettingCountdown) this.cancelBettingCountdown();
        this.eventTarget.emit(GmaeModel.BettingStart, data.seconds);
        this.cancelBettingCountdown = BaseModel.countdown(
            data.seconds,
            (remaining) => this.eventTarget.emit(GmaeModel.BettingCountdown, remaining),
        );
    }

    public flying(data: Flying) {
        this.eventTarget.emit(GmaeModel.Multiplier, data.multiplier);
    }

    public explode(data: Explode) {
        if (this.cancelRoundCountdown) this.cancelRoundCountdown();
        this.eventTarget.emit(GmaeModel.Explode, data.multiplier);
        this.cancelRoundCountdown = BaseModel.countdown(
            5,
            (remaining) => this.eventTarget.emit(GmaeModel.RoundCountdown, remaining),
        );
    }

    /** 新增歷史紀錄 */
    public addRoundHistory(roundHistory: number) {
        this.eventTarget.emit(GmaeModel.AddRoundHistory, roundHistory);
        this.roundHistory.push(roundHistory);
    }
}
