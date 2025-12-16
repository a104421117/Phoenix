import { _decorator, Component, Node, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Star')
export class Star extends Component {
    @property({ type: SpriteFrame }) green: SpriteFrame = null;
    @property({ type: SpriteFrame }) red: SpriteFrame = null;
    @property({ type: SpriteFrame }) normal: SpriteFrame = null;
    sprite: Sprite = null;
    start() {
        this.sprite = this.getComponent(Sprite);
        this.setNormal();
    }

    update(deltaTime: number) {

    }

    setNormal(): void {
        this.sprite.spriteFrame = this.normal;
    }

    setGreen(): void {
        this.sprite.spriteFrame = this.green;
    }

    setRed(): void {
        this.sprite.spriteFrame = this.red;
    }
}


