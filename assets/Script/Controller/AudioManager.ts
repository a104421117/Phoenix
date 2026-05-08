import { _decorator, AudioClip, AudioSource, Node, director } from 'cc';
import { BaseModel } from '../../Game.Client.Common/BaseModel';
import { EventManager } from '../Model/EventManager';
import { AudioModel, BgmName, SfxName } from '../Model/AudioModel';

const { ccclass, property } = _decorator;

/**
 * 音效管理器（全域 Cocos Component Singleton）：
 *   - 把節點掛在啟動場景並透過 director.addPersistRootNode() 跨場景保留
 *   - 在編輯器將每個 SFX / BGM 的 AudioClip 拖入下方 sfxClips / bgmClips
 *   - clip 的 name 必須對應 SfxName / BgmName 的字串值
 *
 * 觸發：任何端透過 EventManager.audio.emit(AudioModel.PlaySfx, SfxName.X) 等事件呼叫，
 *      AudioManager 會找到對應 clip 並交給內部的 AudioSource 播放。
 */
@ccclass('AudioManager')
export class AudioManager extends BaseModel.ComponentSingleton {
    @property({ type: AudioSource, tooltip: '播 BGM 用的 AudioSource（會 loop）' })
    private bgmSource: AudioSource = null;

    @property({ type: AudioSource, tooltip: '播 SFX 用的 AudioSource（用 playOneShot）' })
    private sfxSource: AudioSource = null;

    @property({ type: [AudioClip], tooltip: 'SFX clips；clip name 對應 SfxName' })
    private sfxClips: AudioClip[] = [];

    @property({ type: [AudioClip], tooltip: 'BGM clips；clip name 對應 BgmName' })
    private bgmClips: AudioClip[] = [];

    @property({ range: [0, 1, 0.05], slide: true, tooltip: 'BGM 預設音量' })
    private defaultBgmVolume: number = 0.6;

    @property({ range: [0, 1, 0.05], slide: true, tooltip: 'SFX 預設音量' })
    private defaultSfxVolume: number = 1.0;

    private currentBgm: BgmName | '' = '';

    onLoad() {
        super.onLoad?.();
        if (this.node?.parent && this.node.parent === director.getScene()) {
            director.addPersistRootNode(this.node);
        }
        if (this.bgmSource) this.bgmSource.volume = this.defaultBgmVolume;
        if (this.sfxSource) this.sfxSource.volume = this.defaultSfxVolume;
        this.bindAudioEvents();
    }

    onDestroy() {
        this.unbindAudioEvents();
    }

    private bindAudioEvents() {
        const bus = EventManager.getInstance().audio;
        bus.on(AudioModel.PlaySfx, this.onPlaySfx, this);
        bus.on(AudioModel.PlayBgm, this.onPlayBgm, this);
        bus.on(AudioModel.StopBgm, this.onStopBgm, this);
        bus.on(AudioModel.SetBgmVolume, this.onSetBgmVolume, this);
        bus.on(AudioModel.SetSfxVolume, this.onSetSfxVolume, this);
    }

    private unbindAudioEvents() {
        const bus = EventManager.getInstance().audio;
        bus.off(AudioModel.PlaySfx, this.onPlaySfx, this);
        bus.off(AudioModel.PlayBgm, this.onPlayBgm, this);
        bus.off(AudioModel.StopBgm, this.onStopBgm, this);
        bus.off(AudioModel.SetBgmVolume, this.onSetBgmVolume, this);
        bus.off(AudioModel.SetSfxVolume, this.onSetSfxVolume, this);
    }

    private onPlaySfx(name: SfxName) {
        if (!this.sfxSource) return;
        const clip = this.findClip(this.sfxClips, name);
        if (!clip) {
            console.warn(`[AudioManager] sfx clip not found: ${name}`);
            return;
        }
        this.sfxSource.playOneShot(clip, this.sfxSource.volume);
    }

    private onPlayBgm(name: BgmName) {
        if (!this.bgmSource) return;
        if (this.currentBgm === name && this.bgmSource.playing) return;
        const clip = this.findClip(this.bgmClips, name);
        if (!clip) {
            console.warn(`[AudioManager] bgm clip not found: ${name}`);
            return;
        }
        this.bgmSource.stop();
        this.bgmSource.clip = clip;
        this.bgmSource.loop = true;
        this.bgmSource.play();
        this.currentBgm = name;
    }

    private onStopBgm() {
        if (!this.bgmSource) return;
        this.bgmSource.stop();
        this.currentBgm = '';
    }

    private onSetBgmVolume(value: number) {
        if (!this.bgmSource) return;
        this.bgmSource.volume = this.clampVolume(value);
    }

    private onSetSfxVolume(value: number) {
        if (!this.sfxSource) return;
        this.sfxSource.volume = this.clampVolume(value);
    }

    private findClip(list: AudioClip[], name: string): AudioClip | null {
        return list.find((clip) => clip?.name === name) ?? null;
    }

    private clampVolume(value: number): number {
        if (!Number.isFinite(value)) return 0;
        return Math.min(1, Math.max(0, value));
    }
}
