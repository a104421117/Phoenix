// ─── Client → Server ─────────────────────────────────────────

/** 客戶端 → 伺服器 指令 */
export enum ClientCmd {
    Bet = 'Bet',
    Cashout = 'Cashout',
}

/** 客戶端指令 → 資料型別映射 */
export type ClientCmdMap = {
    [ClientCmd.Bet]: Bet;
    [ClientCmd.Cashout]: Cashout;
}

export type Bet = {
    index: number;
    amount: number;
};

export type Cashout = { index: number };

export type Client<T extends ClientCmd> = {
    cmd: T;
    data: ClientCmdMap[T];
}

// ─── Server → Client ─────────────────────────────────────────

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

/** 玩家單筆投注資訊 */
export type RankBet = {
    amount: number;
    cashedOut: boolean;
    cashoutMultiplier: number;
    profit: number;
};

/** 排行榜玩家資訊 */
export type RankPlayer = {
    id: string;
    name: string;
    avatar: string;
    totalBet: number;
    bets: RankBet[];
};

export type Flying = {
    serverTime: number;
    elapsed: number;
    multiplier: number;
    rank: RankPlayer[];
};

export type Win = {
    index: number;
    amount: number;
    multiplier: number;
    win: number;
};

export type Explode = {
    multiplier: number;
    seconds: number;
};

export type Lose = { index: number; };
