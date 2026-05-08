/**
 * 音效 / 背景音樂事件型別。
 * View 端發 `audio.emit(AudioModel.PlaySfx, SfxName.X)` 之類，AudioManager 收到後播放對應的 AudioClip。
 */

/** 一次性音效（playOneShot）。值即為 AudioClip 在編輯器掛載時的 clip name。 */
export enum SfxName {
    /** 下注幕-按任一鍵下注 */
    BtnBet = 'aud_btn_bet',
    /** 下注幕-點選每注增加或減少 */
    BtnBetCount = 'aud_btn_bet_count',
    /** 下注幕-時間倒數前 10 秒，每秒 */
    Clock = 'aud_clock',
    /** 啟動幕-按取出或個別取出 */
    BtnGet = 'aud_btn_get',
    /** 啟動幕-蛋變成鳳凰 */
    Transform = 'aud_transform',
    /** 啟動幕-鳳凰起飛後叫一下 */
    PhoenixShout = 'aud_phoenix_shout',
    /** 啟動幕-鳳凰爆炸 */
    Crash = 'aud_crash',
    /** 系統按鈕音效 */
    SystemBtn = 'aud_systembtn',
}

/** 背景音樂（loop）。值即為 AudioClip 在編輯器掛載時的 clip name。 */
export enum BgmName {
    /** 選單持續播放 */
    MainPhase = 'bgm_main_phoenix_phase',
    /** 啟動幕持續播放 */
    MainPlay = 'bgm_main_phoenix_play',
}

export enum AudioModel {
    /** 播一次性音效。 */
    PlaySfx = 'PlaySfx',
    /** 切換背景音樂並 loop 播放。 */
    PlayBgm = 'PlayBgm',
    /** 停止背景音樂。 */
    StopBgm = 'StopBgm',
    /** 設定背景音樂音量（0~1）。 */
    SetBgmVolume = 'SetBgmVolume',
    /** 設定一次性音效音量（0~1）。 */
    SetSfxVolume = 'SetSfxVolume',
}

export type AudioModelMap = {
    [AudioModel.PlaySfx]: SfxName;
    [AudioModel.PlayBgm]: BgmName;
    [AudioModel.StopBgm]: void;
    [AudioModel.SetBgmVolume]: number;
    [AudioModel.SetSfxVolume]: number;
}
