import { _decorator, Component, log, warn } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
import { GameData } from '../Model/GameData';
import { WebsocketManager, ClientOp, ServerCmd } from '../Model/WebsocketManager';
import { GameAction, GameInit, RoomRoundEnded, RoomRoundState } from '../Model/WebsocketModel';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends BaseModel.Singleton<GameManager> {
    /** 簡易測試：檢查每回合是否都有收到 Settled */
    @property({ tooltip: '是否啟用每回合 Settled 接收測試' })
    private settledTestEnabled: boolean = false;
    /** 目前追蹤中的 roundId。 */
    private settledTestCurrentRoundId: string = '';
    /** 已觀測回合數。 */
    private settledTestRoundsSeen: number = 0;
    /** 已收到 Settled 次數。 */
    private settledTestSettledReceived: number = 0;
    /** 缺少 Settled 的次數。 */
    private settledTestMissingSettled: number = 0;
    /** roundId -> 是否已收到 Settled。 */
    private settledTestRoundSettledMap: Map<string, boolean> = new Map();

    /** 初始化 WebSocket 事件轉發與遊戲狀態同步。 */
    start() {
        const ws = WebsocketManager.getInstance();
        const gameData = GameData.getInstance();

        /** 遊戲回合狀態廣播 */
        ws.on(ServerCmd.RoomRoundState, (data: RoomRoundState) => {
            log('RoomRoundState', data);
            this.trackSettledByRoundState(data);
            switch (data.state) {
                case 'Betting':
                    gameData.onBetting(data.bettingCountdown);
                    break;
                case 'Running':
                    gameData.onRunning(data.currentMultiplier, data.runningElapsed);
                    break;
                case 'Crashed':
                    gameData.onCrashed(data.crashPoint, data.crashedCountdown, data.runningElapsed);
                    break;
            }
            /** 狀態處理後再更新 leaderboard，避免 Settled 期間被舊資料覆蓋 */
            if (gameData.RoundState !== 'Settled') {
                gameData.onLeaderboard(data.leaderboard);
            }
        });

        /** 回合結束（Settled） */
        ws.on(ServerCmd.RoomRoundEnded, (data: RoomRoundEnded) => {
            log('RoomRoundEnded', data);
            this.trackSettledByRoundEnded(data);
            gameData.onSettled();
        });

        /** game.init 回傳（補抓 existingBets / maxBetsPerPlayer） */
        ws.on(ServerCmd.GameInit, (data: GameInit) => {
            log('GameInit', data);
            const init = data?.gameState ?? data?.gameInit;
            if (!init) return;
            gameData.BetOptions = init.betOptions ?? [];
            gameData.MaxBetCount = init.maxBetsPerPlayer ?? init.betOptions?.length ?? 0;
            gameData.setExistingBets(init.existingBets);
            gameData.setMultiplierCurve(init.multiplierCurve);
        });

        /** game.action 回傳（crash.bet / crash.cashout） */
        ws.on(ServerCmd.GameAction, (data: GameAction) => {
            log('GameAction', data);
            switch (data.method) {
                case 'crash.bet':
                    gameData.onCrashBet(data.payload ?? data);
                    break;
                case 'crash.cashout':
                    gameData.onCashout(data.payload ?? data);
                    break;
                case 'crash.roundHistory':
                    gameData.onRoundHistory(data.payload ?? data);
                    break;
                case 'crash.bets':
                    gameData.onCrashBets(data.payload ?? data);
                    break;
            }
        });

        /** 主動補拉一次 game.init，避免只收到 room.join 但未收到 game.init 推播時缺資料（如 multiplierCurve） */
        if (gameData.RoomId) {
            ws.send(ClientOp.GameInit, { roomId: gameData.RoomId });
        }

        if (gameData.RoomId) {
            gameData.sendRoundHistory();
            gameData.sendCrashBets();
        }
    }

    /** 元件銷毀時輸出 Settled 測試摘要。 */
    protected onDestroy(): void {
        this.printSettledTestSummary('onDestroy');
    }

    /**
     * 依 `room.round.state` 追蹤每回合是否收到 Settled。
     * @param data 回合狀態資料
     */
    private trackSettledByRoundState(data: RoomRoundState) {
        if (!this.settledTestEnabled) return;
        if (!data?.roundId) return;

        const nextRoundId = data.roundId;
        if (!this.settledTestRoundSettledMap.has(nextRoundId)) {
            this.settledTestRoundSettledMap.set(nextRoundId, false);
        }

        if (!this.settledTestCurrentRoundId) {
            this.settledTestCurrentRoundId = nextRoundId;
            this.settledTestRoundsSeen += 1;
            log(`[SettledTest] start round=${nextRoundId}, roundsSeen=${this.settledTestRoundsSeen}`);
            return;
        }

        if (nextRoundId === this.settledTestCurrentRoundId) {
            return;
        }

        const prevSettled = this.settledTestRoundSettledMap.get(this.settledTestCurrentRoundId) === true;
        if (!prevSettled) {
            this.settledTestMissingSettled += 1;
            warn(`[SettledTest] missing Settled for round=${this.settledTestCurrentRoundId}`);
        }

        this.settledTestCurrentRoundId = nextRoundId;
        this.settledTestRoundsSeen += 1;
        log(`[SettledTest] start round=${nextRoundId}, roundsSeen=${this.settledTestRoundsSeen}`);
    }

    /**
     * 依 `room.round.ended` 記錄 Settled 收到狀況。
     * @param data 回合結束資料
     */
    private trackSettledByRoundEnded(data: RoomRoundEnded) {
        if (!this.settledTestEnabled) return;
        if (!data?.roundId || data.state !== 'Settled') return;

        this.settledTestRoundSettledMap.set(data.roundId, true);
        this.settledTestSettledReceived += 1;
        log(
            `[SettledTest] settled round=${data.roundId}, settledReceived=${this.settledTestSettledReceived}, missing=${this.settledTestMissingSettled}`,
        );
    }

    /**
     * 輸出 Settled 測試摘要。
     * @param source 觸發來源
     */
    private printSettledTestSummary(source: string) {
        if (!this.settledTestEnabled) return;
        log(
            `[SettledTest] summary(${source}) roundsSeen=${this.settledTestRoundsSeen}, settledReceived=${this.settledTestSettledReceived}, missing=${this.settledTestMissingSettled}, currentRound=${this.settledTestCurrentRoundId || 'N/A'}`,
        );
    }
}
