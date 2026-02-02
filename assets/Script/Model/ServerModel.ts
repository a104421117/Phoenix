/** 伺服器 → 客戶端 指令 */
export enum ServerCmd {
    Login = 'Login',
    BettingStart = 'BettingStart',
    BetOK = 'BetOK',
    RoundStart = 'RoundStart',
    Flying = 'Flying',
    Win = 'Win',
    Explode = 'Explode',
    Lose = 'Lose',
}

/** 伺服器指令 → 資料型別映射 */
export type ServerCmdMap = {
    [ServerCmd.Login]: Login;
    [ServerCmd.BettingStart]: BettingStart;
    [ServerCmd.BetOK]: BetOK;
    [ServerCmd.RoundStart]: RoundStart;
    [ServerCmd.Flying]: Flying;
    [ServerCmd.Win]: Win;
    [ServerCmd.Explode]: Explode;
    [ServerCmd.Lose]: Lose;
}

export type Login = {
    id: string;
    name: string;
    balance: number;
    betOptions: number[];
    maxBetCount: number;
    roundHistory: number[];
}

export type BettingStart = { seconds: number; };

export type BetOK = { index: number; };

export type RoundStart = {};

export type Flying = {
    serverTime: Date;
    elapsed: number;
    multiplier: number;
};

export type Win = {
    index: number;
    amount: number;
    multiplier: number;
    win: number;
};

export type Explode = { multiplier: number; };

export type Lose = { index: number; };
