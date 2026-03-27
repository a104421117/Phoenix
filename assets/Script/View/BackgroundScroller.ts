import { _decorator, Camera, Component, Enum, Node, UITransform, Vec3, instantiate, warn } from 'cc';
import { GameData, GmaeModel } from '../Model/GameData';
const { ccclass, property } = _decorator;

/** ScrollDirection 列舉。 */
enum ScrollDirection {
    Left = 0,
    Right = 1,
    Down = 2,
    Up = 3,
}

/** CameraReturnEasing 列舉。 */
enum CameraReturnEasing {
    Linear = 0,
    QuadOut = 1,
    CubicOut = 2,
    QuartOut = 3,
    SineOut = 4,
}

@ccclass('BackgroundScroller')
export class BackgroundScroller extends Component {
    /** 第一張背景（不填就用目前節點）。 */
    @property({ type: Node, tooltip: '第一張背景（不填就用目前節點）' })
    private segmentA: Node = null;

    /** 第二張背景（可不填，會自動複製第一張）。 */
    @property({ type: Node, tooltip: '第二張背景（可不填，會自動複製第一張）' })
    private segmentB: Node = null;

    /** 第三張背景（可不填，會自動複製第一張）。 */
    @property({ type: Node, tooltip: '第三張背景（可不填，會自動複製第一張）' })
    private segmentC: Node = null;

    /** 移動速度（像素/秒）。 */
    @property({ tooltip: '移動速度（像素/秒）' })
    private speed: number = 500;

    /** 背景移動方向。 */
    @property({ type: Enum(ScrollDirection), tooltip: '背景移動方向' })
    private direction: ScrollDirection = ScrollDirection.Left;

    /** 要往上移動的相機節點（不填就不移動相機）。 */
    @property({ type: Node, tooltip: '要往上移動的相機節點（不填就不移動相機）' })
    private cameraNode: Node = null;

    /** 幾秒後開始讓相機上升。 */
    @property({ tooltip: '幾秒後開始讓相機上升' })
    private cameraRiseDelay: number = 5;

    /** 相機上升速度（像素/秒），<=0 代表關閉。 */
    @property({ tooltip: '相機上升速度（像素/秒），<=0 代表關閉' })
    private cameraRiseSpeed: number = 60;

    /** 相機最高 Y（0 代表不限制）。 */
    @property({ tooltip: '相機最高 Y（0 代表不限制）' })
    private cameraMaxY: number = 0;

    /** 每回合開始（Betting）是否重置背景位置（不影響回合結束 camera 快退）。 */
    @property({ tooltip: '每回合開始（Betting）是否重置背景位置（不影響回合結束 camera 快退）' })
    private resetOnRoundStart: boolean = false;

    /** 回定點時間（毫秒），回合結束進入 Settled 時使用。 */
    @property({ tooltip: '回定點時間（毫秒），回合結束進入 Settled 時使用' })
    private cameraReturnDurationMs: number = 333;

    /** 回定點緩動。 */
    @property({ type: Enum(CameraReturnEasing), tooltip: '回定點緩動' })
    private cameraReturnEasing: CameraReturnEasing = CameraReturnEasing.CubicOut;

    /** 相機上升是否以 server runningElapsed 為主（重連可同步）。 */
    @property({ tooltip: '相機上升是否以 server runningElapsed 為主（重連可同步）' })
    private useServerElapsedForCameraRise: boolean = true;

    /** runningElapsed 單位縮放（秒=1，毫秒=0.001）。 */
    @property({ tooltip: 'runningElapsed 單位縮放（秒=1，毫秒=0.001）' })
    private runningElapsedScale: number = 0.001;

    /** Running 期間在兩次 server tick 間是否用本地時間補推進。 */
    @property({ tooltip: 'Running 期間在兩次 server tick 間是否用本地時間補推進' })
    private predictElapsedBetweenServerTicks: boolean = true;

    /** segments 欄位。 */
    private segments: Node[] = [];
    /** segmentSize 欄位。 */
    private segmentSize: number = 0;
    /** axisOrigin 欄位。 */
    private axisOrigin: number = 0;
    /** elapsedTime 欄位。 */
    private elapsedTime: number = 0;
    private cameraStartPosition: Vec3 = new Vec3();
    /** serverRoundElapsedSeconds 欄位。 */
    private serverRoundElapsedSeconds: number = 0;
    /** isRoundRunning 欄位。 */
    private isRoundRunning: boolean = false;
    /** isCameraReturningToStart 欄位。 */
    private isCameraReturningToStart: boolean = false;
    /** cameraReturnFromY 欄位。 */
    private cameraReturnFromY: number = 0;
    /** cameraReturnElapsedSeconds 欄位。 */
    private cameraReturnElapsedSeconds: number = 0;
    /** hasHandledBettingReset 欄位。 */
    private hasHandledBettingReset: boolean = false;

    /** start。 */
    start() {
        if (!this.segmentA) {
            this.segmentA = this.node;
        }

        if (!this.segmentA) {
            warn('[BackgroundScroller] 缺少 segmentA。');
            this.enabled = false;
            return;
        }

        const container = this.segmentA.parent ?? this.node;
        this.segments = this.prepareSegments(container);

        const transform = this.segmentA.getComponent(UITransform);
        if (!transform) {
            warn('[BackgroundScroller] segmentA 缺少 UITransform。');
            this.enabled = false;
            return;
        }

        const horizontal = this.direction === ScrollDirection.Left || this.direction === ScrollDirection.Right;
        const axisScale = Math.abs(horizontal ? this.segmentA.scale.x : this.segmentA.scale.y);
        this.segmentSize = (horizontal ? transform.width : transform.height) * axisScale;

        if (this.segmentSize <= 0) {
            warn('[BackgroundScroller] 背景尺寸為 0，無法滾動。');
            this.enabled = false;
            return;
        }

        this.tryResolveCameraNode();
        this.captureCameraStartPosition();
        this.resetPositions();
        this.elapsedTime = 0;

        GameData.getInstance().on(GmaeModel.BettingCountdown, this.onRoundStart, this);
        GameData.getInstance().on(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().on(GmaeModel.Multiplier, this.onRunningMultiplier, this);
        GameData.getInstance().on(GmaeModel.Explode, this.onRoundExplode, this);
        GameData.getInstance().on(GmaeModel.Settled, this.onRoundSettled, this);

        this.syncCameraRiseFromCurrentGameState();
    }

    /** onDestroy。 */
    onDestroy() {
        GameData.getInstance().off(GmaeModel.BettingCountdown, this.onRoundStart, this);
        GameData.getInstance().off(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().off(GmaeModel.Multiplier, this.onRunningMultiplier, this);
        GameData.getInstance().off(GmaeModel.Explode, this.onRoundExplode, this);
        GameData.getInstance().off(GmaeModel.Settled, this.onRoundSettled, this);
    }

    /**
     * update。
     * @param deltaTime deltaTime
     */
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

        if (this.updateCameraReturn(deltaTime)) {
            return;
        }

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

    /** resetPositions。 */
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

    /** onRoundStart。 */
    private onRoundStart() {
        if (this.hasHandledBettingReset) return;
        this.hasHandledBettingReset = true;
        if (this.resetOnRoundStart) {
            this.resetPositions();
        }
        this.elapsedTime = 0;
        this.serverRoundElapsedSeconds = 0;
        this.isRoundRunning = false;
    }

    /**
     * onRunningElapsed。
     * @param elapsed elapsed
     */
    private onRunningElapsed(elapsed: number) {
        if (!Number.isFinite(elapsed)) return;
        if (GameData.getInstance().RoundState !== 'Running') return;
        this.hasHandledBettingReset = false;
        this.serverRoundElapsedSeconds = Math.max(0, elapsed * this.runningElapsedScale);
        this.isRoundRunning = true;
        this.isCameraReturningToStart = false;
        if (this.useServerElapsedForCameraRise) {
            this.updateCameraRiseByElapsed();
        }
    }

    /** onRunningMultiplier。 */
    private onRunningMultiplier() {
        if (GameData.getInstance().RoundState !== 'Running') return;
        this.hasHandledBettingReset = false;
        this.isRoundRunning = true;
        this.isCameraReturningToStart = false;
    }

    /** onRoundExplode。 */
    private onRoundExplode() {
        this.hasHandledBettingReset = false;
        this.isRoundRunning = false;
        this.isCameraReturningToStart = false;
    }

    /** onRoundSettled。 */
    private onRoundSettled() {
        this.hasHandledBettingReset = false;
        this.isRoundRunning = false;
        this.serverRoundElapsedSeconds = 0;
        this.beginCameraReturnToStart();
    }

    /** captureCameraStartPosition。 */
    private captureCameraStartPosition() {
        if (!this.cameraNode) return;
        this.cameraStartPosition.set(this.cameraNode.position);
    }

    /** resetCameraPosition。 */
    private resetCameraPosition() {
        if (!this.cameraNode) return;
        this.cameraNode.setPosition(this.cameraStartPosition);
    }

    /** syncCameraRiseFromCurrentGameState。 */
    private syncCameraRiseFromCurrentGameState() {
        const gameData = GameData.getInstance();
        this.serverRoundElapsedSeconds = Math.max(0, gameData.RunningElapsed * this.runningElapsedScale);
        this.hasHandledBettingReset = gameData.RoundState === 'Betting';

        if (gameData.RoundState === 'Running') {
            this.isRoundRunning = true;
            this.isCameraReturningToStart = false;
            this.updateCameraRiseByElapsed();
            return;
        }

        if (gameData.RoundState === 'Crashed') {
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

    /**
     * prepareSegments。
     * @param container container
     * @returns prepareSegments 回傳值
     */
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

    /**
     * pushUnique。
     * @param target target
     * @param node node
     */
    private pushUnique(target: Node[], node: Node) {
        if (!node) return;
        if (target.includes(node)) return;
        target.push(node);
    }

    /**
     * moveX。
     * @param delta delta
     */
    private moveX(delta: number) {
        for (const node of this.segments) {
            const p = node.position;
            node.setPosition(p.x + delta, p.y, p.z);
        }
    }

    /**
     * moveY。
     * @param delta delta
     */
    private moveY(delta: number) {
        for (const node of this.segments) {
            const p = node.position;
            node.setPosition(p.x, p.y + delta, p.z);
        }
    }

    /** wrapLeft。 */
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

    /** wrapRight。 */
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

    /** wrapDown。 */
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

    /** wrapUp。 */
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

    /**
     * getRightmostX。
     * @returns getRightmostX 回傳值
     */
    private getRightmostX(): number {
        let value = Number.NEGATIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.max(value, node.position.x);
        }
        return value;
    }

    /**
     * getLeftmostX。
     * @returns getLeftmostX 回傳值
     */
    private getLeftmostX(): number {
        let value = Number.POSITIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.min(value, node.position.x);
        }
        return value;
    }

    /**
     * getTopmostY。
     * @returns getTopmostY 回傳值
     */
    private getTopmostY(): number {
        let value = Number.NEGATIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.max(value, node.position.y);
        }
        return value;
    }

    /**
     * getBottommostY。
     * @returns getBottommostY 回傳值
     */
    private getBottommostY(): number {
        let value = Number.POSITIVE_INFINITY;
        for (const node of this.segments) {
            value = Math.min(value, node.position.y);
        }
        return value;
    }

    /**
     * updateCameraRiseLocal。
     * @param deltaTime deltaTime
     */
    private updateCameraRiseLocal(deltaTime: number) {
        if (!this.cameraNode || this.cameraRiseSpeed <= 0) return;
        if (this.elapsedTime < this.cameraRiseDelay) return;

        const p = this.cameraNode.position;
        let nextY = p.y + this.cameraRiseSpeed * deltaTime;

        if (this.cameraMaxY !== 0) {
            nextY = Math.min(nextY, this.cameraMaxY);
        }

        this.cameraNode.setPosition(p.x, nextY, p.z);
    }

    /** updateCameraRiseByElapsed。 */
    private updateCameraRiseByElapsed() {
        if (!this.cameraNode || this.cameraRiseSpeed <= 0) return;

        const riseElapsed = Math.max(0, this.serverRoundElapsedSeconds - this.cameraRiseDelay);
        let targetY = this.cameraStartPosition.y + this.cameraRiseSpeed * riseElapsed;
        if (this.cameraMaxY !== 0) {
            targetY = Math.min(targetY, this.cameraMaxY);
        }

        const p = this.cameraNode.position;
        this.cameraNode.setPosition(p.x, targetY, p.z);
    }

    /** beginCameraReturnToStart。 */
    private beginCameraReturnToStart() {
        if (!this.cameraNode) return;
        this.cameraReturnFromY = this.cameraNode.position.y;
        this.cameraReturnElapsedSeconds = 0;
        this.isCameraReturningToStart = true;
    }

    /**
     * updateCameraReturn。
     * @param deltaTime deltaTime
     * @returns updateCameraReturn 回傳值
     */
    private updateCameraReturn(deltaTime: number): boolean {
        if (!this.isCameraReturningToStart) return false;
        if (!this.cameraNode) {
            this.isCameraReturningToStart = false;
            return false;
        }

        const current = this.cameraNode.position;
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
        this.cameraNode.setPosition(current.x, nextY, current.z);
        if (t >= 1) {
            this.resetCameraPosition();
            this.isCameraReturningToStart = false;
        }
        return true;
    }

    /**
     * evaluateCameraReturnEasing。
     * @param t t
     * @returns evaluateCameraReturnEasing 回傳值
     */
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

    /**
     * clamp01。
     * @param value value
     * @returns clamp01 回傳值
     */
    private clamp01(value: number): number {
        if (value < 0) return 0;
        if (value > 1) return 1;
        return value;
    }

    /** tryResolveCameraNode。 */
    private tryResolveCameraNode() {
        if (this.cameraNode) return;

        let current: Node = this.segmentA;
        while (current) {
            if (current.getComponent(Camera)) {
                this.cameraNode = current;
                return;
            }
            current = current.parent;
        }
    }
}
