import { _decorator, AudioSource, Component, Label, Node, Slider, Toggle } from 'cc';
import { GameModel } from '../Model/Model';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ type: Slider }) private musicSlider: Slider = null;
    @property({ type: Label }) private musicLabel: Label = null;
    private musicList: AudioSource[] = [];

    @property({ type: Slider }) private soundSlider: Slider = null;
    @property({ type: Label }) private soundLabel: Label = null;
    private soundList: AudioSource[] = [];

    @property({ type: Toggle }) private muteToggle: Toggle = null;
    start() {
        let music = this.node.getChildByName("music");
        this.musicList.push(...music.getComponentsInChildren(AudioSource));
        this.musicSlider.node.on('slide', this.changeMusicVolume.bind(this), this);
        this.musicSlider.node.emit("slide", this.musicSlider);

        let sound = this.node.getChildByName("sound");
        this.soundList.push(...sound.getComponentsInChildren(AudioSource));
        this.soundSlider.node.on("slide", this.changeSoundVolume.bind(this), this);
        this.soundSlider.node.emit("slide", this.soundSlider);

        this.muteToggle.node.on("toggle", this.changMute.bind(this), this);
    }

    update(deltaTime: number) {

    }

    /**
     * 改變音效音量
     * @param soundList 所有音效
     * @param self 滑動自身
     */
    changeSoundVolume(self: Slider): void {
        this.muteToggle.isChecked = false;
        const progress = self.progress;
        const num = GameModel.getFloor(progress * 100);
        const numStr = num + "%";
        this.soundLabel.string = numStr;
        this.soundList.forEach((sound) => {
            sound.volume = progress;
        });
    }

    /**
     * 改變音樂音量
     * @param soundList 所有音效
     * @param self 滑動自身
     */
    changeMusicVolume(self: Slider): void {
        this.muteToggle.isChecked = false;
        const progress = self.progress;
        const num = GameModel.getFloor(progress * 100);
        const numStr = num + "%";
        this.musicLabel.string = numStr;
        this.musicList.forEach((music) => {
            music.volume = progress;
        });
    }

    changMute(self: Toggle): void {
        if (self.isChecked === true) {
            this.musicList.forEach((music) => {
                music.volume = 0;
            });
            this.soundList.forEach((music) => {
                music.volume = 0;
            });
        } else {
            const musicSlider = this.musicSlider;
            musicSlider.node.emit("slide", musicSlider);

            const soundSlider = this.soundSlider;
            soundSlider.node.emit("slide", soundSlider);
        }
    }
}


