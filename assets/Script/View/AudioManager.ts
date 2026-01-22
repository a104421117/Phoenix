import { _decorator, AudioClip, AudioSource } from 'cc';
import { BaseManager } from '../Lib/BaseManager';
import { EventManager } from '../Lib/EventManager';
import { GameEvents, GameState } from '../Lib/Constants';

const { ccclass, property } = _decorator;

/**
 * 音效管理器
 */
@ccclass('AudioManager')
export class AudioManager extends BaseManager {
    private static _inst: AudioManager;
    public static get instance(): AudioManager {
        return AudioManager._inst;
    }

    @property(AudioSource)
    private bgmSource: AudioSource = null;

    @property(AudioSource)
    private sfxSource: AudioSource = null;

    @property(AudioClip)
    private bgmClip: AudioClip = null;

    @property(AudioClip)
    private betSfx: AudioClip = null;

    @property(AudioClip)
    private takeoutSfx: AudioClip = null;

    @property(AudioClip)
    private crashSfx: AudioClip = null;

    @property(AudioClip)
    private countdownSfx: AudioClip = null;

    @property(AudioClip)
    private winSfx: AudioClip = null;

    @property(AudioClip)
    private loseSfx: AudioClip = null;

    @property(AudioClip)
    private clickSfx: AudioClip = null;

    @property
    private bgmVolume: number = 0.5;

    @property
    private sfxVolume: number = 1.0;

    private _isBgmMuted: boolean = false;
    private _isSfxMuted: boolean = false;
    private _lastCountdownSecond: number = -1;

    protected onManagerLoad(): void {
        AudioManager._inst = this;
    }

    public init(): void {
        this._registerEvents();
        this._playBGM();
    }

    public reset(): void {
        this._lastCountdownSecond = -1;
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvents.GAME_STATE_CHANGED, this._onStateChanged, this);
        EventManager.instance.on(GameEvents.BET_PLACED, this._onBetPlaced, this);
        EventManager.instance.on(GameEvents.TAKEOUT_SUCCESS, this._onTakeoutSuccess, this);
        EventManager.instance.on(GameEvents.GAME_CRASH, this._onGameCrash, this);
        EventManager.instance.on(GameEvents.TIME_UPDATE, this._onTimeUpdate, this);
        EventManager.instance.on(GameEvents.GAME_SETTLE, this._onGameSettle, this);
    }

    private _onStateChanged(data: { from: GameState; to: GameState }): void {
        // 可根據狀態調整 BGM 或播放過渡音效
        if (data.to === GameState.WAGER) {
            this._lastCountdownSecond = -1;
        }
    }

    private _onBetPlaced(): void {
        this._playSfx(this.betSfx);
    }

    private _onTakeoutSuccess(): void {
        this._playSfx(this.takeoutSfx);
        this._playSfx(this.winSfx);
    }

    private _onGameCrash(): void {
        this._playSfx(this.crashSfx);
    }

    private _onGameSettle(data: any): void {
        if (data.userResult) {
            if (data.userResult.winAmount > 0 && data.userResult.takeoutMultiple !== null) {
                // 已在 takeout 時播放
            } else if (data.userResult.betAmount > 0) {
                this._playSfx(this.loseSfx);
            }
        }
    }

    private _onTimeUpdate(remaining: number): void {
        const second = Math.ceil(remaining);
        if (second <= 3 && second > 0 && second !== this._lastCountdownSecond) {
            this._lastCountdownSecond = second;
            this._playSfx(this.countdownSfx);
        }
    }

    private _playBGM(): void {
        if (this.bgmSource && this.bgmClip && !this._isBgmMuted) {
            this.bgmSource.clip = this.bgmClip;
            this.bgmSource.loop = true;
            this.bgmSource.volume = this.bgmVolume;
            this.bgmSource.play();
        }
    }

    private _playSfx(clip: AudioClip | null): void {
        if (this.sfxSource && clip && !this._isSfxMuted) {
            this.sfxSource.playOneShot(clip, this.sfxVolume);
        }
    }

    /**
     * 播放點擊音效
     */
    public playClick(): void {
        this._playSfx(this.clickSfx);
    }

    /**
     * 播放自定義音效
     */
    public playSfx(clip: AudioClip): void {
        this._playSfx(clip);
    }

    /**
     * 設置 BGM 靜音
     */
    public setBgmMuted(muted: boolean): void {
        this._isBgmMuted = muted;
        if (this.bgmSource) {
            if (muted) {
                this.bgmSource.pause();
            } else {
                this.bgmSource.play();
            }
        }
    }

    /**
     * 設置音效靜音
     */
    public setSfxMuted(muted: boolean): void {
        this._isSfxMuted = muted;
    }

    /**
     * 設置 BGM 音量
     */
    public setBgmVolume(volume: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.bgmSource) {
            this.bgmSource.volume = this.bgmVolume;
        }
    }

    /**
     * 設置音效音量
     */
    public setSfxVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 是否 BGM 靜音
     */
    public get isBgmMuted(): boolean {
        return this._isBgmMuted;
    }

    /**
     * 是否音效靜音
     */
    public get isSfxMuted(): boolean {
        return this._isSfxMuted;
    }

    /**
     * 停止 BGM
     */
    public stopBGM(): void {
        if (this.bgmSource) {
            this.bgmSource.stop();
        }
    }

    /**
     * 恢復 BGM
     */
    public resumeBGM(): void {
        if (this.bgmSource && !this._isBgmMuted) {
            this.bgmSource.play();
        }
    }
}
