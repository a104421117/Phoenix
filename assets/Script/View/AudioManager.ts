import { _decorator, AudioSource, Component, Node, Slider } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ type: Slider }) private soundSlider: Slider;
    private soundList: AudioSource[] = [];
    start() {
        this.soundList.push(...this.getComponentsInChildren(AudioSource));
        this.soundSlider.node.on('slide', this.changeSoundVolume.bind(this, this.soundList), this);
    }

    update(deltaTime: number) {

    }

    /**
     * 改變音效音量
     * @param soundList 所有音效
     * @param self 滑動自身
     */
    changeSoundVolume(soundList: AudioSource[], self: Slider): void {
        soundList.forEach((sound) => {
            sound.volume = self.progress;
        });
    }
}


