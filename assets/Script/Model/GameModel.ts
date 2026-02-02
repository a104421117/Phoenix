export enum GmaeModel {
    ID = "ID",
    Name = "Name",
    Balance = "Balance",
    BetOptions = "BetOptions",
    MaxBetCount = "MaxBetCount",
    RoundHistory = "RoundHistory",
    AddRoundHistory = "AddRoundHistory",
    BettingCountdown = "BettingCountdown",
};

export type GmaeModelMap = {
    [GmaeModel.ID]: string;
    [GmaeModel.Name]: string;
    [GmaeModel.Balance]: number;
    [GmaeModel.BetOptions]: number[];
    [GmaeModel.MaxBetCount]: number;
    [GmaeModel.RoundHistory]: number[];
    [GmaeModel.AddRoundHistory]: number;
    [GmaeModel.BettingCountdown]: number;
}
