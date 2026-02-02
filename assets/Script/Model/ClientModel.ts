/** 客戶端 → 伺服器 指令 */
export enum ClientCmd {
    Bet = 'Bet',
    Cashout = 'Cashout',
}

/** 伺服器指令 → 資料型別映射 */
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