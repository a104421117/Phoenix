import { _decorator, Component, Node, Sprite, UITransform, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

export const enum ScrollState {
    None,
    Move,
    Fly,
}

@ccclass('InfiniteScroll')
export class InfiniteScroll extends Component {
    static scrollState: ScrollState = ScrollState.None;
    private moveScrollSpeed: number = 100;  // 滾動速度 (像素/秒)

    private flyScrollSpeed: number = 300;  // 滾動速度 (像素/秒)

    @property({ type: Vec2 }) direction: Vec2 = new Vec2(-1, 0);  // 方向：(-1,0)往左 (1,0)往右

    private sprite: Sprite = null;
    private uiTransform: UITransform = null;
    private offset: Vec2 = new Vec2(0, 0);
    private tiledWidth: number = 0;
    private tiledHeight: number = 0;

    onLoad() {
        this.sprite = this.getComponent(Sprite);
        this.uiTransform = this.getComponent(UITransform);

        // 記錄原始貼圖大小
        if (this.sprite && this.sprite.spriteFrame) {
            this.tiledWidth = this.sprite.spriteFrame.width;
            this.tiledHeight = this.sprite.spriteFrame.height;
        }
    }

    start() {
        // 確保是 TILED 模式
        if (this.sprite) {
            this.sprite.type = Sprite.Type.TILED;
        }

        // 設定顯示區域比貼圖大（才會重複）
        // 例如寬度設成螢幕寬度的 2 倍以上
        if (this.uiTransform && this.tiledWidth > 0) {
            // 可以根據需求調整
            // this.uiTransform.width = this.tiledWidth * 3;
        }
    }

    update(dt: number) {
        switch (InfiniteScroll.scrollState) {
            case ScrollState.None:
                break;
            case ScrollState.Move:
                this.move(dt, this.moveScrollSpeed);
                break;
            case ScrollState.Fly:
                this.move(dt, this.flyScrollSpeed);
                break;
        }
    }

    move(dt: number, scrollSpeed: number) {
        if (!this.sprite || !this.sprite.spriteFrame) return;

        // 更新偏移量
        this.offset.x += this.direction.x * scrollSpeed * dt;
        this.offset.y += this.direction.y * scrollSpeed * dt;

        // 讓偏移量循環（避免數值過大）
        if (this.tiledWidth > 0) {
            this.offset.x = this.offset.x % this.tiledWidth;
        }
        if (this.tiledHeight > 0) {
            this.offset.y = this.offset.y % this.tiledHeight;
        }

        // 設定 tiled 偏移
        this.sprite.tiledDataArray;  // 觸發更新

        // 用位置模擬滾動
        const pos = this.node.position.clone();
        pos.x = this.offset.x;
        this.node.setPosition(pos);
    }
}


