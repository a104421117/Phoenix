import { _decorator, Component, Sprite, Material, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SeamlessSprite')
export class SeamlessSprite extends Component {
    @property(Material)
    seamlessMaterial: Material = null;

    @property
    scrollSpeed: Vec2 = new Vec2(0.1, 0);

    @property
    tileScale: Vec2 = new Vec2(1, 1);

    private sprite: Sprite = null;
    private materialInstance: Material = null;

    onLoad() {
        this.sprite = this.getComponent(Sprite);
        
        if (!this.sprite) {
            console.error('SeamlessSprite: 找不到 Sprite 組件');
            return;
        }

        // 創建材質實例（關鍵！）
        if (this.seamlessMaterial) {
            this.materialInstance = new Material();
            this.materialInstance.copy(this.seamlessMaterial);
            this.sprite.customMaterial = this.materialInstance;
            
            // 設置初始參數
            this.updateMaterialParams();
            
            console.log('SeamlessSprite: 材質已應用');
        } else {
            console.error('SeamlessSprite: 請指定 seamlessMaterial');
        }
    }

    start() {
        // 確保材質已經正確應用
        if (this.materialInstance) {
            this.updateMaterialParams();
        }
    }

    updateMaterialParams() {
        if (!this.materialInstance) return;

        // 更新 shader 參數
        this.materialInstance.setProperty('scrollSpeed', this.scrollSpeed);
        this.materialInstance.setProperty('tileScale', this.tileScale);
    }

    // 運行時動態修改速度
    setScrollSpeed(x: number, y: number) {
        this.scrollSpeed.set(x, y);
        this.updateMaterialParams();
    }

    // 運行時動態修改縮放
    setTileScale(x: number, y: number) {
        this.tileScale.set(x, y);
        this.updateMaterialParams();
    }

    onDestroy() {
        // 清理材質實例
        if (this.materialInstance) {
            this.materialInstance = null;
        }
    }
}