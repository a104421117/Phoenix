import { _decorator, Enum, game, Node } from 'cc';
import { Base, Manager, getInstance } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import * as View from "db://assets/Script/View/View";
import { TakeOutManager } from '../View/TakeOutManager';
import { GameModel } from '../Model/Model';
import { PhoenixState, SpineManager } from '../View/SpineManager';
import { FlyState, Move } from '../View/Move';
import { WebSocketManager } from '../Model/WebSocketManager';
import { AutoManager } from '../View/AutoManager';
import { HistoryManager } from '../View/HistoryManager';
import { InfiniteScroll, ScrollState } from '../View/InfiniteScroll';
import { RankData, RankManager, RankType } from '../View/RankManager';
const { ccclass, property } = _decorator;

enum GameState {
    Idle = "Idle",
    Wager = "Wager",
    Run = "Run",
    Dead = "Dead"
}

@ccclass('GameManager')
export class GameManager extends Manager {
    @property({ type: Enum(GameState), readonly: true }) private gameState: GameState = GameState.Idle;
    private set GameState(value: GameState) {
        this.gameState = value;
        this.runState(value);
    }

    public get isRun() {
        return this.gameState === GameState.Run;
    }

    public get isWager() {
        return this.gameState === GameState.Wager;
    }

    async start() {
        // const socketUrl = "ws://192.168.1.113:8080/ws/fengfeifei%40%24_%24%40Jack?table=A";
        const socketUrl = "http://localhost:8080/";
        // const socketUrl = "";
        getInstance(WebSocketManager).createrSocket(socketUrl, () => {
            this.GameState = GameState.Idle;
        });
    }

    update(deltaTime: number) {

    }

    private runState(state: GameState) {
        let model = getInstance(ModelManager);
        switch (state) {
            case GameState.Idle:
                this.Idle();
                break;
            case GameState.Wager:
                this.Wager(model.Wager.wagerTime);
                break;
            case GameState.Run:
                const multiple = GameModel.getFloor(Math.random() * 25, 2);
                const runTime = multiple * 4;
                this.Run(runTime, multiple, 0.05);
                break;
            case GameState.Dead:
                this.Dead(model.Wager.deadTime);
                break;
        }
    }

    /**
     * 閒置狀態
     */
    private Idle(): void {
        //取得socket結果
        //待實作
        this.GameState = GameState.Wager;
    }

    /**
     * 可下注狀態
     * @param time 時間
     */
    private Wager(time: number): void {
        if (getInstance(AutoManager).IsAuto === true) {
            const autoData = getInstance(AutoManager).getAutoData();
            getInstance(TakeOutManager).autoTakeOut(autoData.bet, autoData.betCount);
        }
        getInstance(View.Bet).showBetNode();
        getInstance(View.Timer).showWagerTime();
        getInstance(View.Timer).changeWagerTime(time);
        getInstance(SpineManager).eggIdle();
        getInstance(Move).state = FlyState.Reset;
        InfiniteScroll.scrollState = ScrollState.Move;
        //時間遞減
        Base.Timer.createCountdown((t: number) => {
            getInstance(View.Timer).changeWagerTime(t);
        }, () => {
            getInstance(View.Timer).closeWagerTime();
            getInstance(SpineManager).closeEgg();
            this.GameState = GameState.Run;
        }, time, this.GameState, 1);
    }

    /**
     * 可取出狀態
     * @param time 最大存活時間
     * @param multiple 最大存活倍數
     * @param deltaTime 倍數更新速率
     */
    private Run(time: number, multiple: number, deltaTime: number): void {
        const rankData: RankData[] = [];
        for (let i = 0; i < 6; i++) {
            const data: RankData = {
                spriteFrame: null,
                bet: 0,
                betCount: [RankType.GRAY, RankType.GRAY, RankType.GRAY, RankType.GRAY, RankType.GRAY],
                multiple: 0
            }
            rankData.push(data);
        }
        getInstance(View.Multiple).showMultiple();
        getInstance(View.Multiple).changeMultiple(0);
        getInstance(View.Bet).closeBetNode();
        getInstance(View.Bet).closeBetBtn();
        getInstance(TakeOutManager).showBottomButtonPickall();
        getInstance(TakeOutManager).runTakeOut();
        getInstance(SpineManager).State = PhoenixState.Move;
        InfiniteScroll.scrollState = ScrollState.Fly;
        Base.Timer.createCount((t: number) => {
            const runMultiple = GameModel.getFloor(t * multiple / time, 2);
            getInstance(ModelManager).MultipleModel.runMultiple = runMultiple;
            getInstance(View.Multiple).changeMultiple(runMultiple);
            getInstance(TakeOutManager).changeTakeOut(runMultiple);
            if (runMultiple >= getInstance(AutoManager).CashOutNum) {
                getInstance(TakeOutManager).takeOut();
            }
            rankData.forEach((rank) => {
                rank.bet++;
                rank.multiple = 0;
            });
            getInstance(RankManager).changeRank(rankData);
        }, () => {
            getInstance(AutoManager).minusRunCount();
            getInstance(ModelManager).MultipleModel.runMultiple = multiple;
            getInstance(View.Multiple).changeMultiple(multiple);
            getInstance(View.Multiple).closeTextC();
            getInstance(SpineManager).closePhoenix();
            getInstance(HistoryManager).addHistory(multiple);
            this.GameState = GameState.Dead;
        }, time, this.GameState, deltaTime);
    }

    /**
     * 
     * 
     * 
     * @param time 
     */
    private Dead(time: number): void {
        getInstance(View.Timer).showDeadTime();
        getInstance(View.Timer).changeDeadTime(time);
        getInstance(TakeOutManager).closeBottomButtonPickall();
        getInstance(TakeOutManager).showRepeatBtn();
        getInstance(TakeOutManager).closeWin();
        getInstance(SpineManager).eggDie();
        getInstance(Move).state = FlyState.None;
        InfiniteScroll.scrollState = ScrollState.Move;
        Base.Timer.createCountdown((t: number) => {
            getInstance(View.Timer).changeDeadTime(t);
        }, () => {
            getInstance(View.Timer).closeDeadTime();
            getInstance(View.Multiple).closemultipleLabel();
            getInstance(TakeOutManager).resetTakeOut();
            getInstance(TakeOutManager).closeTakeOut();
            this.GameState = GameState.Idle;
        }, time, this.GameState, 1);
    }
}


