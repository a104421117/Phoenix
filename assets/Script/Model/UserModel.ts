/**
 * 用戶信息接口
 */
export interface UserInfo {
    userId: string;
    username: string;
    avatar: string;
    balance: number;
}

/**
 * 用戶數據模型
 */
export class UserModel {
    private _userInfo: UserInfo = {
        userId: '',
        username: '',
        avatar: '',
        balance: 0
    };

    /**
     * 用戶信息
     */
    public get userInfo(): UserInfo {
        return { ...this._userInfo };
    }

    /**
     * 用戶 ID
     */
    public get userId(): string {
        return this._userInfo.userId;
    }

    /**
     * 用戶名
     */
    public get username(): string {
        return this._userInfo.username;
    }

    /**
     * 頭像
     */
    public get avatar(): string {
        return this._userInfo.avatar;
    }

    /**
     * 餘額
     */
    public get balance(): number {
        return this._userInfo.balance;
    }

    /**
     * 更新用戶信息
     */
    public updateUserInfo(info: Partial<UserInfo>): void {
        Object.assign(this._userInfo, info);
    }

    /**
     * 設置餘額
     */
    public setBalance(balance: number): void {
        this._userInfo.balance = balance;
    }

    /**
     * 扣除餘額
     */
    public deductBalance(amount: number): void {
        this._userInfo.balance = Math.max(0, this._userInfo.balance - amount);
    }

    /**
     * 增加餘額
     */
    public addBalance(amount: number): void {
        this._userInfo.balance += amount;
    }

    /**
     * 檢查是否有足夠餘額
     */
    public canAfford(amount: number): boolean {
        return this._userInfo.balance >= amount;
    }

    /**
     * 重置狀態
     */
    public reset(): void {
        this._userInfo = {
            userId: '',
            username: '',
            avatar: '',
            balance: 0
        };
    }

    /**
     * 是否已登錄
     */
    public isLoggedIn(): boolean {
        return this._userInfo.userId !== '';
    }

    /**
     * 格式化餘額顯示
     */
    public formatBalance(): string {
        return this._userInfo.balance.toLocaleString();
    }

    /**
     * 格式化金額（帶縮略）
     */
    public static formatAmount(amount: number): string {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toString();
    }
}
