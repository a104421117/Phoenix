import { _decorator, Enum, Node } from 'cc';
import { Base, Manager, getInstance } from '../../lib/BaseManager';
import { ModelManager } from '../Model/ModelManager';
import * as View from "db://assets/Script/View/View";
import { BetManager } from '../View/BetManager';
const { ccclass, property } = _decorator;

enum GameState {
    Idle,
    Wager,
    Run,
    Dead
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
                this.Run(model.Wager.runTime, model.MultipleModel.maxMultiple, model.Wager.runDeltaTime);
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
        //時間遞減
        Base.createCountdown((t: number) => {
            getInstance(View.Timer).changeWagerTime(t);
        }, () => {
            getInstance(View.Timer).closeWagerTime();
            this.GameState = GameState.Run;
        }, time).start();
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
        getInstance(BetManager).runTakeOut(getInstance(ModelManager).BetModel.takeOutIndex);

        Base.createCountdown((t: number) => {
            const runMultiple = (time - t) * multiple / time;
            getInstance(ModelManager).MultipleModel.runMultiple = runMultiple;
            getInstance(View.Multiple).changeMultiple(runMultiple);
            getInstance(BetManager).changeTakeOut(runMultiple, getInstance(ModelManager).BetModel.takeOutIndex);
            // getInstance(View.Bet).updateProfit(runMultiple);
        }, () => {
            getInstance(ModelManager).MultipleModel.runMultiple = multiple;
            getInstance(View.Multiple).changeMultiple(multiple);
            getInstance(View.Multiple).closeTextC();
            this.GameState = GameState.Dead;
        }, time, deltaTime).start();
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
        Base.createCountdown((t: number) => {
            getInstance(View.Timer).changeDeadTime(t);
        }, () => {
            getInstance(View.Timer).closeDeadTime();
            getInstance(View.Multiple).closemultipleLabel();
            getInstance(View.Bet).closeTakeOutObjArr();
            getInstance(ModelManager).BetModel.resetTakeOut(true);
            this.GameState = GameState.Idle;
        }, time).start();
    }
}


