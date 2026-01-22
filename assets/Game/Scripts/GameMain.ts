import { _decorator, Component, Node, director, view, ResolutionPolicy } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 遊戲主入口
 * 掛載在場景根節點上
 */
@ccclass('GameMain')
export class GameMain extends Component {
    onLoad() {
        // 設定遊戲解析度
        view.setDesignResolutionSize(1920, 1080, ResolutionPolicy.SHOW_ALL);

        // 防止多點觸控
        // input.setMultiTouch(false);

        console.log('[GameMain] 鳳飛飛遊戲初始化');
    }

    start() {
        console.log('[GameMain] 遊戲開始');
    }
}
