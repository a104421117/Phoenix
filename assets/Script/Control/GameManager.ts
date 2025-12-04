import { _decorator, Component, Enum, Node } from 'cc';
import { BetManager } from '../View/BetManager';
import { Base } from '../../lib/DataManager';
const { ccclass, property } = _decorator;

enum GameState {
    Idle,
    Bet,
    Run,
    Dead
}

@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager;
    public static getInstance(): GameManager {
        return this._instance;
    }
    @property({ type: Enum(GameState), readonly: true }) private gameState: GameState = GameState.Idle;
    private set GameState(value: GameState) {
        this.gameState = value;
        this.runState(value);
    }
    public isRun() {
        return this.gameState === GameState.Run;
    }
    public isBet() {
        return this.gameState === GameState.Bet;
    }
    protected onLoad(): void {
        GameManager._instance = this;
    }

    start() {
        BetManager.getInstance().closeBetTime();
        BetManager.getInstance().closeBetMultiple();
        BetManager.getInstance().closeDeadTime();
        this.GameState = GameState.Bet;
    }

    update(deltaTime: number) {

    }

    private runState(state: GameState) {
        switch (state) {
            case GameState.Idle:
                this.Idle();
                break;
            case GameState.Bet:
                this.Bet(BetManager.getInstance().betTime);
                break;
            case GameState.Run:
                this.Run(BetManager.getInstance().runTime, BetManager.getInstance().maxMultiple, BetManager.getInstance().runDeltaTime);
                break;
            case GameState.Dead:
                this.Dead(BetManager.getInstance().deadTime);
                break;
        }
    }

    /**
     * 閒置狀態
     */
    private Idle(): void {
        this.GameState = GameState.Bet;
    }

    /**
     * 可下注狀態
     * @param time 時間
     */
    private Bet(time: number): void {
        BetManager.getInstance().showBetTime();
        BetManager.getInstance().changeBetTime(time);
        BetManager.getInstance().showBetNode();
        BetManager.getInstance().resetTakeOut();
        //時間遞減
        Base.createCountdown((t: number) => {
            BetManager.getInstance().changeBetTime(t);
        }, () => {
            BetManager.getInstance().closeBetTime();
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
        BetManager.getInstance().showBetMultiple();
        BetManager.getInstance().changeBetMultiple(0);
        BetManager.getInstance().closeBetNode();
        BetManager.getInstance().closeRateButton();
        Base.createCountdown((t: number) => {
            const runMultiple = (time - t + deltaTime) * multiple / time;
            BetManager.getInstance().runMultiple = runMultiple;
            BetManager.getInstance().changeBetMultiple(runMultiple);
        }, () => {
            BetManager.getInstance().closeBetMultiple();
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
        BetManager.getInstance().showDeadTime();
        BetManager.getInstance().changeDeadTime(time);
        Base.createCountdown((t: number) => {
            BetManager.getInstance().changeDeadTime(t);
        }, () => {
            BetManager.getInstance().closeDeadTime();
            this.GameState = GameState.Idle;
        }, time).start();
    }
}


