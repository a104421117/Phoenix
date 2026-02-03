export enum GmaeModel {
    ID = "ID",
    Name = "Name",
    Balance = "Balance",
    BetOptions = "BetOptions",
    MaxBetCount = "MaxBetCount",
    RoundHistory = "RoundHistory",
    AddRoundHistory = "AddRoundHistory",
    BettingStart = "BettingStart",
    BettingCountdown = "BettingCountdown",
    RoundCountdown = "RoundCountdown",
    Multiplier = "Multiplier",
    Explode = "Explode",
};

export type GmaeModelMap = {
    [GmaeModel.ID]: string;
    [GmaeModel.Name]: string;
    [GmaeModel.Balance]: number;
    [GmaeModel.BetOptions]: number[];
    [GmaeModel.MaxBetCount]: number;
    [GmaeModel.RoundHistory]: number[];
    [GmaeModel.AddRoundHistory]: number;
    [GmaeModel.BettingStart]: number;
    [GmaeModel.BettingCountdown]: number;
    [GmaeModel.RoundCountdown]: number;
    [GmaeModel.Multiplier]: number;
    [GmaeModel.Explode]: number;
}
