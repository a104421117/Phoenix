/**
 * Wire ↔ domain 編解碼層（無狀態純函式）。
 *   - 輸入：server payload 或 client domain 值
 *   - 輸出：domain 物件 或 wire 物件
 *   - 不讀 GameData、不寫 GameData、不持有 singleton。所有外部 context（如 currencyScale）由 caller 帶入。
 */

import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { ExistingBet, ExistingBetStatus } from './GameData';
import type { CrashMultiplierCurvePointContract } from './WebsocketModel';

const MULTIPLIER_SCALE = 2;

/** server 金額字串/數字 → number，按 scale 做精度校正。invalid 直接拋錯。 */
export function decodeBalance(raw: string | number, scale: number): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
        throw new Error(`[WebsocketSerializer.decodeBalance] invalid balance: ${raw}`);
    }
    return BaseModel.getPrecise(n, scale);
}

/** 倍數欄位 wire → number；null/undefined 透傳，invalid 回 null。 */
export function decodeMultiplier(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? BaseModel.getPrecise(n, MULTIPLIER_SCALE) : null;
}

/** server bet levels → 正數 array。非陣列回空。 */
export function decodeBetLevels(raw: unknown): number[] {
    return Array.isArray(raw)
        ? raw
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        : [];
}

/** server 倍率曲線 → 已 round 的 domain 曲線。 */
export function decodeMultiplierCurve(raw: unknown): CrashMultiplierCurvePointContract[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((point: any) => {
            const t = Number(point?.t);
            const m = Number(point?.m);
            if (!Number.isFinite(t) || !Number.isFinite(m)) return null;
            return { t, m: BaseModel.getPrecise(m, MULTIPLIER_SCALE) };
        })
        .filter((point): point is CrashMultiplierCurvePointContract => point !== null);
}

/** server existing bet item → ExistingBet domain；無效回 null。 */
export function decodeExistingBet(raw: any): ExistingBet | null {
    const betIndex = Number(raw?.betIndex);
    const betAmount = Number(raw?.betAmount);
    if (!Number.isInteger(betIndex) || !Number.isFinite(betAmount)) return null;
    const parseNum = (v: unknown): number | null => {
        if (v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const rawStatus = raw?.status;
    const status = (typeof rawStatus === 'string'
        ? rawStatus
        : ExistingBetStatus.Pending) as ExistingBetStatus;
    return {
        betIndex,
        betAmount,
        status,
        cashoutMultiplier: decodeMultiplier(raw?.cashoutMultiplier),
        payoutGross: parseNum(raw?.payoutGross),
        payoutNet: parseNum(raw?.payoutNet),
        currentProfit: parseNum(raw?.currentProfit),
    };
}

/** N 筆 existing bet 一次解 + 依 betIndex 排序。 */
export function decodeExistingBets(raw: unknown): ExistingBet[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => decodeExistingBet(item))
        .filter((item): item is ExistingBet => item !== null)
        .sort((a, b) => a.betIndex - b.betIndex);
}

/** Wire 金額編碼：number → floor 到 scale 位的字串（用 BaseModel.getFloorStr 處理浮點誤差，且無條件捨去確保不送出比 caller 預期還大的值）。 */
export function encodeMoney(value: number, scale: number): string {
    return BaseModel.getFloorStr(value, scale);
}

/** Client auto cashout 倍數：null 透傳（無自動領回），number round 到 MULTIPLIER_SCALE 位。範圍限制由 UI 層擋。 */
export function encodeAutoCashoutMultiplier(value: number | null): number | null {
    return value === null ? null : BaseModel.getPrecise(value, MULTIPLIER_SCALE);
}

