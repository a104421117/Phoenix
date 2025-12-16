import { _decorator, Enum, Node } from 'cc';
import { Base, Manager, getInstance } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import * as View from "db://assets/Script/View/View";
import { TakeOutManager } from '../View/TakeOutManager';
import { GameModel } from '../Model/Model';
import { SpineManager } from '../View/SpineManager';
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
        getInstance(ModelManager).createrSocket("", () => {
            this.GameState = GameState.Idle;
        });
        // console.log(GameManager.getInstance(GameManager));
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
                this.Run(10, 5, 0.05);
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
        getInstance(View.Bet).showBetNode();
        getInstance(View.Timer).showWagerTime();
        getInstance(View.Timer).changeWagerTime(time);
        getInstance(SpineManager).eggIdle();
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
        getInstance(View.Multiple).showMultiple();
        getInstance(View.Multiple).changeMultiple(0);
        getInstance(View.Bet).closeBetNode();
        getInstance(View.Bet).closeBetBtn();
        getInstance(TakeOutManager).showBottomButtonPickall();
        getInstance(TakeOutManager).runTakeOut();
        getInstance(SpineManager).PhoenixFly();
        Base.Timer.createCount((t: number) => {
            const runMultiple = GameModel.getFloor(t * multiple / time, 2);
            getInstance(ModelManager).MultipleModel.runMultiple = runMultiple;
            getInstance(View.Multiple).changeMultiple(runMultiple);
            getInstance(TakeOutManager).changeTakeOut(runMultiple);
            getInstance(SpineManager).PhoenixMove(t);
        }, () => {
            getInstance(ModelManager).MultipleModel.runMultiple = multiple;
            getInstance(View.Multiple).changeMultiple(multiple);
            getInstance(View.Multiple).closeTextC();
            getInstance(SpineManager).closePhoenix();
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
        Base.Timer.createCountdown((t: number) => {
            getInstance(View.Timer).changeDeadTime(t);
        }, () => {
            getInstance(View.Timer).closeDeadTime();
            getInstance(View.Multiple).closemultipleLabel();
            getInstance(TakeOutManager).closeTakeOut();
            getInstance(TakeOutManager).resetTakeOut();
            this.GameState = GameState.Idle;
        }, time, this.GameState, 1);
    }
}


