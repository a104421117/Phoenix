import { _decorator, AudioClip } from 'cc';
import { BaseAudioManager } from '../../Base/Scripts/AudioManager';
import { gameEvents, GameEvent } from './GameManager';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * 鳳飛飛遊戲音效管理器
 * 繼承自 BaseAudioManager
 */
@ccclass('GameAudioManager')
export class GameAudioManager extends BaseAudioManager {
    @property(AudioClip)
    bgmClip: AudioClip = null;

    @property(AudioClip)
    betClip: AudioClip = null;

    @property(AudioClip)
    cashoutClip: AudioClip = null;

    @property(AudioClip)
    flyingClip: AudioClip = null;

    @property(AudioClip)
    crashClip: AudioClip = null;

    @property(AudioClip)
    winClip: AudioClip = null;

    @property(AudioClip)
    loseClip: AudioClip = null;

    @property(AudioClip)
    countdownClip: AudioClip = null;

    protected onLoad() {
        super.onLoad();

        // 監聽遊戲事件
        gameEvents.on(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.on(GameEvent.BET_PLACED, this.onBetPlaced, this);
        gameEvents.on(GameEvent.CASHOUT_SUCCESS, this.onCashout, this);
        gameEvents.on(GameEvent.ROUND_END, this.onRoundEnd, this);
    }

    start() {
        // 播放背景音樂
        if (this.bgmClip) {
            this.playBGM(this.bgmClip);
        }
    }

    protected onDestroy() {
        gameEvents.off(GameEvent.STATE_CHANGED, this.onGameStateChanged, this);
        gameEvents.off(GameEvent.BET_PLACED, this.onBetPlaced, this);
        gameEvents.off(GameEvent.CASHOUT_SUCCESS, this.onCashout, this);
        gameEvents.off(GameEvent.ROUND_END, this.onRoundEnd, this);

        super.onDestroy();
    }

    /**
     * 遊戲狀態變更
     */
    private onGameStateChanged(state: number) {
        switch (state) {
            case GameConfig.STATE_BETTING:
                // 可播放等待音效
                break;
            case GameConfig.STATE_FLYING:
                if (this.flyingClip) {
                    this.playSFX(this.flyingClip);
                }
                break;
            case GameConfig.STATE_CRASHED:
                if (this.crashClip) {
                    this.playSFX(this.crashClip);
                }
                break;
        }
    }

    /**
     * 押注事件
     */
    private onBetPlaced(_betIndex: number) {
        if (this.betClip) {
            this.playSFX(this.betClip);
        }
    }

    /**
     * 取出事件
     */
    private onCashout(_data: { betIndex: number; multiplier: number; profit: number }) {
        if (this.cashoutClip) {
            this.playSFX(this.cashoutClip);
        }
    }

    /**
     * 局結束事件
     */
    private onRoundEnd(_crashMultiplier: number) {
        // 根據輸贏播放不同音效
        // 這裡需要從 BetManager 獲取結果
    }

    /**
     * 播放贏分音效
     */
    playWinSound() {
        if (this.winClip) {
            this.playSFX(this.winClip);
        }
    }

    /**
     * 播放輸分音效
     */
    playLoseSound() {
        if (this.loseClip) {
            this.playSFX(this.loseClip);
        }
    }

    /**
     * 播放倒數音效
     */
    playCountdownSound() {
        if (this.countdownClip) {
            this.playSFX(this.countdownClip);
        }
    }
}
