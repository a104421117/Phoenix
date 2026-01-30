import { _decorator, Component, Node, EventTarget } from 'cc';
import { Login } from './SocketManager';

export class GameData {
    private constructor() { }
    private static instance: GameData = null;
    public static getInstance(): GameData {
        if (!this.instance) this.instance = new GameData();
        return this.instance;
    }

    private id: string = '';
    private name: string = '';
    private balance: number = 0;
    private betOptions: number[] = [];
    private maxBetCount: number = 0;
    private roundHistory: number[] = [];
    private eventTarget: EventTarget = new EventTarget();

    public get ID(): string { return this.id; }
    public set ID(id: string) {
        this.eventTarget.emit(Model.ID, id);
        this.id = id;
    }

    public get Name(): string { return this.name; }
    private set Name(name: string) {
        this.eventTarget.emit(Model.Name, name);
        this.name = name;
    }

    public get Balance(): number { return this.balance; }
    private set Balance(balance: number) {
        this.eventTarget.emit(Model.Balance, balance);
        this.balance = balance;
    }

    public get BetOptions(): number[] { return this.betOptions; }
    private set BetOptions(betOptions: number[]) {
        this.eventTarget.emit(Model.BetOptions, betOptions);
        this.betOptions = betOptions;
    }

    public get MaxBetCount(): number { return this.maxBetCount; }
    private set MaxBetCount(maxBetCount: number) {
        this.eventTarget.emit(Model.MaxBetCount, maxBetCount);
        this.maxBetCount = maxBetCount;
    }

    public get RoundHistory(): number[] { return this.roundHistory; }
    private set RoundHistory(roundHistory: number[]) {
        this.eventTarget.emit(Model.RoundHistory, roundHistory);
        this.roundHistory = roundHistory;
    }

    public init(data: Login) {
        this.ID = data.id;
        this.Name = data.name;
        this.Balance = data.balance;
        this.BetOptions = data.betOptions;
        this.MaxBetCount = data.maxBetCount;
        this.RoundHistory = data.roundHistory;
    }


    /** 監聽伺服器指令事件 */
    public on<T extends Model>(cmd: T, callback: (data: ModelMap[T]) => void, target?: any) {
        this.eventTarget.on(cmd, callback, target);
    }

    /** 取消監聯伺服器指令事件 */
    public off<T extends Model>(cmd: T, callback: (data: ModelMap[T]) => void, target?: any) {
        this.eventTarget.off(cmd, callback, target);
    }

    /** 新增歷史紀錄 */
    public addRoundHistory(roundHistory: number) {
        this.eventTarget.emit(Model.AddRoundHistory, roundHistory);
        this.roundHistory.push(roundHistory);
    }
}

export enum Model {
    ID = "ID",
    Name = "Name",
    Balance = "Balance",
    BetOptions = "BetOptions",
    MaxBetCount = "MaxBetCount",
    RoundHistory = "RoundHistory",
    AddRoundHistory = "AddRoundHistory"
};

type ModelMap = {
    [Model.ID]: string;
    [Model.Name]: string;
    [Model.Balance]: number;
    [Model.BetOptions]: number[];
    [Model.MaxBetCount]: number;
    [Model.RoundHistory]: number[];
    [Model.AddRoundHistory]: number;
}
