import { _decorator, Component, Enum, Node, UITransform, Vec3, instantiate, warn } from 'cc';
import { GameData } from '../Model/GameData';
import { GmaeModel, RoundState } from '../Model/GameData';
const { ccclass, property } = _decorator;

/** 背景滾動方向 */
enum ScrollDirection {
    Left = 0,
    Right = 1,
    Down = 2,
    Up = 3,
}

/** 相機回彈緩動 */
enum CameraReturnEasing {
    Linear = 0,
    QuadOut = 1,
    CubicOut = 2,
    QuartOut = 3,
    SineOut = 4,
}

@ccclass('BackgroundScroller')
export class BackgroundScroller extends Component {
    /** 背景片段 A（必填） */
    @property({ type: Node, tooltip: '背景片段 A（必填）' })
    private segmentA: Node = null;

    /** 背景片段 B（可選，未填會自動複製 A） */
    @property({ type: Node, tooltip: '背景片段 B（可選，未填會自動複製 A）' })
    private segmentB: Node = null;

    /** 背景片段 C（可選，未填會自動複製 A） */
    @property({ type: Node, tooltip: '背景片段 C（可選，未填會自動複製 A）' })
    private segmentC: Node = null;

    /** 背景滾動速度（像素/秒） */
    @property({ tooltip: '背景滾動速度（像素/秒）' })
    private speed: number = 500;

    /** 背景滾動方向 */
    @property({ type: Enum(ScrollDirection), tooltip: '背景滾動方向' })
    private direction: ScrollDirection = ScrollDirection.Left;

    /** Sky 背景節點（場景關聯，必須由 Inspector 綁定） */
    @property({ type: Node, tooltip: 'Sky 背景節點（場景關聯，必須由 Inspector 綁定）' })
    private skyNode: Node = null;

    /** 已棄用：保留舊場景資料，不再驅動相機位移 */
    @property({ type: Node, tooltip: '已棄用：保留舊場景資料，不再驅動相機位移' })
    private cameraNode: Node = null;

    /** Running 後延遲幾秒開始背景下移 */
    @property({ tooltip: 'Running 後延遲幾秒開始背景下移' })
    private cameraRiseDelay: number = 5;

    /** 背景下移速度（像素/秒） */
    @property({ tooltip: '背景下移速度（像素/秒）' })
    private cameraRiseSpeed: number = 60;

    /** SkyNode Y 下限，0 代表不限制 */
    @property({ tooltip: 'SkyNode Y 下限，0 代表不限制' })
    private cameraMaxY: number = -5950;

    /** 回合 Settled 時，SkyNode 回到起始位置的時間（毫秒） */
    @property({ tooltip: '回合 Settled 時，SkyNode 回到起始位置的時間（毫秒）' })
    private cameraReturnDurationMs: number = 333;

    /** 相機回彈緩動 */
    @property({ type: Enum(CameraReturnEasing), tooltip: '相機回彈緩動' })
    private cameraReturnEasing: CameraReturnEasing = CameraReturnEasing.CubicOut;

    /** 背景下移是否使用 server runningElapsed 為主 */
    @property({ tooltip: '背景下移是否使用 server runningElapsed 為主' })
    private useServerElapsedForCameraRise: boolean = true;

    /** Running 期間是否在 server tick 之間使用本地時間補間 */
    @property({ tooltip: 'Running 期間是否在 server tick 之間使用本地時間補間' })
    private predictElapsedBetweenServerTicks: boolean = true;

    private segments: Node[] = [];
    private segmentSize: number = 0;
    private axisOrigin: number = 0;
    private elapsedTime: number = 0;
    private cameraStartPosition: Vec3 = new Vec3();
    private riseTargetNode: Node = null;
    private serverRoundElapsedSeconds: number = 0;
    private isRoundRunning: boolean = false;
    private isCameraReturningToStart: boolean = false;
    private cameraReturnFromY: number = 0;
    private cameraReturnElapsedSeconds: number = 0;
    private hasHandledBettingReset: boolean = false;

    /** 初始化 */
    start() {
        if (!this.segmentA) {
            this.segmentA = this.node;
        }

        if (!this.segmentA) {
            warn('[BackgroundScroller] 找不到 segmentA');
            this.enabled = false;
            return;
        }

        const container = this.segmentA.parent ?? this.node;
        this.segments = this.prepareSegments(container);

        const transform = this.segmentA.getComponent(UITransform);
        if (!transform) {
            warn('[BackgroundScroller] segmentA 缺少 UITransform');
            this.enabled = false;
            return;
        }

        const horizontal = this.direction === ScrollDirection.Left || this.direction === ScrollDirection.Right;
        const axisScale = Math.abs(horizontal ? this.segmentA.scale.x : this.segmentA.scale.y);
        this.segmentSize = (horizontal ? transform.width : transform.height) * axisScale;

        if (this.segmentSize <= 0) {
            warn('[BackgroundScroller] 背景尺寸小於等於 0，無法滾動');
            this.enabled = false;
            return;
        }

        this.tryResolveRiseTargetNode();
        this.captureCameraStartPosition();
        this.resetPositions();
        this.elapsedTime = 0;

        GameData.getInstance().onGameState(GmaeModel.BettingCountdown, this.onRoundStart, this);
        GameData.getInstance().onGameState(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().onGameState(GmaeModel.Multiplier, this.onRunningMultiplier, this);
        GameData.getInstance().onGameState(GmaeModel.Explode, this.onRoundExplode, this);
        GameData.getInstance().onGameState(GmaeModel.Settled, this.onRoundSettled, this);

        this.syncCameraRiseFromCurrentGameState();
    }

    /** 移除監聽 */
    onDestroy() {
        GameData.getInstance().offGameState(GmaeModel.BettingCountdown, this.onRoundStart, this);
        GameData.getInstance().offGameState(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().offGameState(GmaeModel.Multiplier, this.onRunningMultiplier, this);
        GameData.getInstance().offGameState(GmaeModel.Explode, this.onRoundExplode, this);
        GameData.getInstance().offGameState(GmaeModel.Settled, this.onRoundSettled, this);
    }

    /** 每幀更新 */
    update(deltaTime: number) {
        if (this.segments.length < 2) return;

        const distance = this.speed * deltaTime;
        switch (this.direction) {
            case ScrollDirection.Left:
                this.moveX(-distance);
                this.wrapLeft();
                break;
            case ScrollDirection.Right:
                this.moveX(distance);
                this.wrapRight();
                break;
            case ScrollDirection.Down:
                this.moveY(-distance);
                this.wrapDown();
                break;
            case ScrollDirection.Up:
                this.moveY(distance);
                this.wrapUp();
                break;
        }

        if (this.updateCameraReturn(deltaTime)) return;

        if (this.useServerElapsedForCameraRise) {
            if (this.isRoundRunning && this.predictElapsedBetweenServerTicks) {
                this.serverRoundElapsedSeconds += deltaTime;
            }
            this.updateCameraRiseByElapsed();
            return;
        }

        this.elapsedTime += deltaTime;
        this.updateCameraRiseLocal(deltaTime);
    }

    /** 將背景片段重新排列 */
    private resetPositions() {
        const posA = this.segmentA.position.clone();
        const horizontal = this.direction === ScrollDirection.Left || this.direction === ScrollDirection.Right;
        this.axisOrigin = horizontal ? posA.x : posA.y;

        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            const pos = new Vec3(posA.x, posA.y, posA.z);
            const offset = i * this.segmentSize;

            switch (this.direction) {
                case ScrollDirection.Left:
                    pos.x = posA.x + offset;
                    break;
                case ScrollDirection.Right:
                    pos.x = posA.x - offset;
                    break;
                case ScrollDirection.Down:
                    pos.y = posA.y + offset;
                    break;
                case ScrollDirection.Up:
                    pos.y = posA.y - offset;
                    break;
            }
            seg.setPosition(pos);
        }
    }

    /**
     * 回合開始時只在 Y 軸滾動才重排背景，
     * X 軸不做重排，避免每回合從左邊重新開始。
     */
    private onRoundStart() {
        if (this.hasHandledBettingReset) return;
        this.hasHandledBettingReset = true;

        const isVerticalScroll = this.direction === ScrollDirection.Down || this.direction === ScrollDirection.Up;
        if (isVerticalScroll) {
            this.resetPositions();
        }

        this.elapsedTime = 0;
        this.serverRoundElapsedSeconds = 0;
        this.isRoundRunning = false;
    }

    /** 同步 runningElapsed */
    private onRunningElapsed(elapsed: number) {
        if (!Number.isFinite(elapsed)) return;
        if (GameData.getInstance().RoundState !== RoundState.Running) return;

        this.hasHandledBettingReset = false;
        this.serverRoundElapsedSeconds = Math.max(0, elapsed);
        this.isRoundRunning = true;
        this.isCameraReturningToStart = false;

        if (this.useServerElapsedForCameraRise) {
            this.updateCameraRiseByElapsed();
        }
    }

    /** 收到倍率更新代表仍在 Running */
    private onRunningMultiplier() {
        if (GameData.getInstance().RoundState !== RoundState.Running) return;
        this.hasHandledBettingReset = false;
        this.isRoundRunning = true;
        this.isCameraReturningToStart = false;
    }

    /** 回合爆點 */
    private onRoundExplode() {
        this.hasHandledBettingReset = false;
        this.isRoundRunning = false;
        this.isCameraReturningToStart = false;
    }

    /** 回合結算 */
    private onRoundSettled() {
        this.hasHandledBettingReset = false;
        this.isRoundRunning = false;
        this.serverRoundElapsedSeconds = 0;
        this.beginCameraReturnToStart();
    }

    /** 記錄背景起始位置 */
    private captureCameraStartPosition() {
        if (!this.riseTargetNode) return;
        this.cameraStartPosition.set(this.riseTargetNode.position);
    }

    /** 背景回到起始位置 */
    private resetCameraPosition() {
        if (!this.riseTargetNode) return;
        this.riseTargetNode.setPosition(this.cameraStartPosition);
    }

    /** 依目前遊戲狀態同步背景下移 */
    private syncCameraRiseFromCurrentGameState() {
        const gameData = GameData.getInstance();
        this.serverRoundElapsedSeconds = Math.max(0, gameData.RunningElapsed);
        this.hasHandledBettingReset = gameData.RoundState === RoundState.Betting;

        if (gameData.RoundState === RoundState.Running) {
            this.isRoundRunning = true;
            this.isCameraReturningToStart = false;
            this.updateCameraRiseByElapsed();
            return;
        }

        if (gameData.RoundState === RoundState.Crashed) {
            this.isRoundRunning = false;
            this.isCameraReturningToStart = false;
            this.updateCameraRiseByElapsed();
            return;
        }

        this.isRoundRunning = false;
        this.serverRoundElapsedSeconds = 0;
        this.beginCameraReturnToStart();
        this.updateCameraReturn(1 / 60);
    }

    /** 準備三段背景 */
    private prepareSegments(container: Node): Node[] {
        const segments: Node[] = [];
        this.pushUnique(segments, this.segmentA);
        this.pushUnique(segments, this.segmentB);
        this.pushUnique(segments, this.segmentC);

        while (segments.length < 3) {
            const source = this.segmentA ?? segments[0];
            if (!source) break;
            const clone = instantiate(source);
            clone.name = `${source.name}_Clone_${segments.length + 1}`;
            const clonedScroller = clone.getComponent(BackgroundScroller);
            if (clonedScroller) {
                clonedScroller.enabled = false;
            }
            container.addChild(clone);
            segments.push(clone);
        }

        for (const segment of segments) {
            if (segment.parent !== container) {
                segment.removeFromParent();
                container.addChild(segment);
            }
        }

        this.segmentA = segments[0] ?? null;
        this.segmentB = segments[1] ?? null;
        this.segmentC = segments[2] ?? null;
        return segments;
    }

    /** 陣列去重加入 */
    private pushUnique(target: Node[], node: Node) {
        if (!node) return;
        if (target.indexOf(node) >= 0) return;
        target.push(node);
    }

    /** X 軸平移 */
    private moveX(delta: number) {
        for (const node of this.segments) {
            const p = node.position;
            node.setPosition(p.x + delta, p.y, p.z);
        }
    }

    /** Y 軸平移 */
    private moveY(delta: number) {
        for (const node of this.segments) {
            const p = node.position;
            node.setPosition(p.x, p.y + delta, p.z);
        }
    }

    /** 向左滾動時回收 */
    private wrapLeft() {
        const limit = this.axisOrigin - this.segmentSize;
        let guard = 0;
        while (guard++ < this.segments.length * 4) {
            let moved = false;
            let rightmost = this.getRightmostX();
            for (const node of this.segments) {
                const p = node.position;
                if (p.x <= limit) {
                    const newX = rightmost + this.segmentSize;
                    node.setPosition(newX, p.y, p.z);
                    rightmost = newX;
                    moved = true;
                }
            }
            if (!moved) break;
        }
    }

    /** 向右滾動時回收 */
    private wrapRight() {
        const limit = this.axisOrigin + this.segmentSize;
        let guard = 0;
        while (guard++ < this.segments.length * 4) {
            let moved = false;
            let leftmost = this.getLeftmostX();
            for (const node of this.segments) {
                const p = node.position;
                if (p.x >= limit) {
                    const newX = leftmost - this.segmentSize;
                    node.setPosition(newX, p.y, p.z);
                    leftmost = newX;
                    moved = true;
                }
            }
            if (!moved) break;
        }
    }

    /** 向下滾動時回收 */
    private wrapDown() {
        const limit = this.axisOrigin - this.segmentSize;
        let guard = 0;
        while (guard++ < this.segments.length * 4) {
            let moved = false;
            let topmost = this.getTopmostY();
            for (const node of this.segments) {
                const p = node.position;
                if (p.y <= limit) {
                    const newY = topmost + this.segmentSize;
                    node.setPosition(p.x, newY, p.z);
                    topmost = newY;
                    moved = true;
                }
            }
            if (!moved) break;
        }
    }

    /** 向上滾動時回收 */
    private wrapUp() {
        const limit = this.axisOrigin + this.segmentSize;
        let guard = 0;
        while (guard++ < this.segments.length * 4) {
            let moved = false;
            let bottommost = this.getBottommostY();
            for (const node of this.segments) {
                const p = node.position;
                if (p.y >= limit) {
                    const newY = bottommost - this.segmentSize;
                    node.setPosition(p.x, newY, p.z);
                    bottommost = newY;
                    moved = true;
                }
            }
            if (!moved) break;
        }
    }

    /** 取得最右 X */
    private getRightmostX(): number {
        let value = Number.NEGATIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.max(value, node.position.x);
        }
        return value;
    }

    /** 取得最左 X */
    private getLeftmostX(): number {
        let value = Number.POSITIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.min(value, node.position.x);
        }
        return value;
    }

    /** 取得最上 Y */
    private getTopmostY(): number {
        let value = Number.NEGATIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.max(value, node.position.y);
        }
        return value;
    }

    /** 取得最下 Y */
    private getBottommostY(): number {
        let value = Number.POSITIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.min(value, node.position.y);
        }
        return value;
    }

    /** 本地時間模式的背景下移 */
    private updateCameraRiseLocal(deltaTime: number) {
        if (!this.riseTargetNode || this.cameraRiseSpeed <= 0) return;
        if (this.elapsedTime < this.cameraRiseDelay) return;

        const p = this.riseTargetNode.position;
        let nextY = p.y - this.cameraRiseSpeed * deltaTime;
        if (this.cameraMaxY !== 0) {
            nextY = Math.max(nextY, this.cameraMaxY);
        }

        this.riseTargetNode.setPosition(p.x, nextY, p.z);
    }

    /** runningElapsed 模式的背景下移 */
    private updateCameraRiseByElapsed() {
        if (!this.riseTargetNode || this.cameraRiseSpeed <= 0) return;

        const riseElapsed = Math.max(0, this.serverRoundElapsedSeconds - this.cameraRiseDelay);
        let targetY = this.cameraStartPosition.y - this.cameraRiseSpeed * riseElapsed;
        if (this.cameraMaxY !== 0) {
            targetY = Math.max(targetY, this.cameraMaxY);
        }

        const p = this.riseTargetNode.position;
        this.riseTargetNode.setPosition(p.x, targetY, p.z);
    }

    /** 開始背景回彈 */
    private beginCameraReturnToStart() {
        if (!this.riseTargetNode) return;
        this.cameraReturnFromY = this.riseTargetNode.position.y;
        this.cameraReturnElapsedSeconds = 0;
        this.isCameraReturningToStart = true;
    }

    /** 更新背景回彈，回傳 true 代表本幀已處理 */
    private updateCameraReturn(deltaTime: number): boolean {
        if (!this.isCameraReturningToStart) return false;
        if (!this.riseTargetNode) {
            this.isCameraReturningToStart = false;
            return false;
        }

        const current = this.riseTargetNode.position;
        const diffY = this.cameraStartPosition.y - this.cameraReturnFromY;
        const durationSeconds = Math.max(0, this.cameraReturnDurationMs) / 1000;

        if (durationSeconds <= 0 || Math.abs(diffY) <= 0.001) {
            this.resetCameraPosition();
            this.isCameraReturningToStart = false;
            return true;
        }

        this.cameraReturnElapsedSeconds += Math.max(0, deltaTime);
        const t = Math.min(1, this.cameraReturnElapsedSeconds / durationSeconds);
        const easedT = this.evaluateCameraReturnEasing(t);
        const nextY = this.cameraReturnFromY + diffY * easedT;
        this.riseTargetNode.setPosition(current.x, nextY, current.z);

        if (t >= 1) {
            this.resetCameraPosition();
            this.isCameraReturningToStart = false;
        }
        return true;
    }

    /** 計算回彈緩動值 */
    private evaluateCameraReturnEasing(t: number): number {
        const x = this.clamp01(t);
        switch (this.cameraReturnEasing) {
            case CameraReturnEasing.QuadOut:
                return 1 - (1 - x) * (1 - x);
            case CameraReturnEasing.CubicOut:
                return 1 - Math.pow(1 - x, 3);
            case CameraReturnEasing.QuartOut:
                return 1 - Math.pow(1 - x, 4);
            case CameraReturnEasing.SineOut:
                return Math.sin((x * Math.PI) / 2);
            case CameraReturnEasing.Linear:
            default:
                return x;
        }
    }

    /** 夾在 0 到 1 */
    private clamp01(value: number): number {
        if (value < 0) return 0;
        if (value > 1) return 1;
        return value;
    }

    /** 解析背景下移目標（固定 MainCamera，不再移動） */
    private tryResolveRiseTargetNode() {
        if (this.skyNode) {
            this.riseTargetNode = this.skyNode;
            return;
        }

        warn('[BackgroundScroller] skyNode 未綁定，將略過背景上升視覺位移');
    }
}
