import { _decorator, Component, Label, Node, Tween, TweenEasing, UITransform, Vec3, sp, tween, warn } from 'cc';
import { GameData, GmaeModel, RoundState } from '../Model/GameData';
import { type CrashMultiplierCurvePointContract } from '../Model/WebsocketManager';
const { ccclass, property } = _decorator;

type CurveSample = {
    worldPosition: Vec3;
    angle: number;
};

/** PhoenixPhase 列舉。 */
enum PhoenixPhase {
    Idle = 'Idle',
    Flying = 'Flying',
    Crashing = 'Crashing',
}

@ccclass('PhoenixController')
export class PhoenixController extends Component {

    /** 蛋 Spine（Betting/Crash 使用）。 */
    @property({ type: sp.Skeleton, tooltip: '蛋 Spine（Betting/Crash 使用）' })
    private eggSpine: sp.Skeleton = null;

    /** 鳳凰 Spine（Running 使用）。 */
    @property({ type: sp.Skeleton, tooltip: '鳳凰 Spine（Running 使用）' })
    private phoenixSpine: sp.Skeleton = null;

    /** 蛋待機動畫（Betting，loop）。 */
    private eggIdleAnimationName: string = 'idle';

    /** 鳳凰起飛動畫（Running 進入瞬間，播放一次）。 */
    private startAnimationName: string = 'start';

    /** 鳳凰飛行動畫名稱（Running，loop）。 */
    private flyAnimationName: string = 'fly';

    /** 飛行動畫 Track Index（不暴露到 Scene，如需調整直接改此值）。 */
    private static readonly FLY_TRACK_INDEX: number = 0;

    private static readonly FAST_TARGET_CURVE = 137;
    private static readonly MAX_CURVE = 158;
    private static readonly MAX_MULT = 1500;

    private static readonly DEFAULT_MULTIPLIER_CURVE: CrashMultiplierCurvePointContract[] = [
        { m: 0.01, t: 0.0 },
        { m: 0.40, t: 0.6 },
        { m: 0.65, t: 1.6 },
        { m: 0.85, t: 2.4 },
        { m: 0.95, t: 2.8 },
        { m: 1, t: 3.0 },
        { m: 2, t: 7.0 },
        { m: 3, t: 10.5 },
        { m: 5, t: 16.5 },
        { m: 8, t: 24.0 },
        { m: 12, t: 32.0 },
        { m: 18, t: 41.0 },
        { m: 26, t: 49.5 },
        { m: 40, t: 60.0 },
        { m: 60, t: 70.0 },
        { m: 100, t: 82.0 },
        { m: 200, t: 98.0 },
        { m: 400, t: 116.0 },
        { m: 800, t: 137.0 },
        { m: 1500, t: 158.0 },
    ];

    /** 進入 Flying 時是否重播 fly 動畫。 */
    @property({ tooltip: '進入 Flying 時是否重播 fly 動畫' })
    private restartFlyOnEnter: boolean = false;

    /** 蛋死亡動畫（Crash，播放一次；若留空會 fallback crashAnimationName）。 */
    private eggDieAnimationName: string = 'die';

    /** （舊欄位）墜毀動畫名稱，僅在 eggDieAnimationName 留空時使用。 */
    private crashAnimationName: string = '';

    /** 墜毀動畫 Track Index。 */
    @property({ tooltip: '墜毀動畫 Track Index' })
    private crashTrackIndex: number = 0;

    /** Betting 時是否回到畫面外待機點。 */
    @property({ tooltip: 'Betting 時是否回到畫面外待機點' })
    private resetOnBetting: boolean = true;

    /** 若未收到 Betting，Crashed 狀態下低倍率視為新回合起點（保險重置）。 */
    @property({ tooltip: '若未收到 Betting，Crashed 狀態下低倍率視為新回合起點（保險重置）' })
    private newRoundStartMultiplierThreshold: number = 1.2;

    /** 波浪高度（像素）。 */
    @property({ tooltip: '波浪高度（像素）' })
    private waveAmplitude: number = 56;

    /** 波浪頻率。 */
    @property({ tooltip: '波浪頻率' })
    private waveFrequency: number = 1.6;

    /** 基礎上升速度（像素/秒）。 */
    @property({ tooltip: '基礎上升速度（像素/秒）' })
    private riseSpeed: number = 48;

    /** 倍率對上升速度影響係數（0 代表不受倍率影響）。 */
    @property({ tooltip: '倍率對上升速度影響係數（0 代表不受倍率影響）' })
    private multiplierRiseFactor: number = 0.3;

    /** 倍率對上升速度最大加成（例如 3 = 最多 3 倍速）。 */
    @property({ tooltip: '倍率對上升速度最大加成（例如 3 = 最多 3 倍速）' })
    private maxRiseSpeedFactor: number = 3;

    /** 巡航水平漂移速度（像素/秒，0 代表固定 X）。 */
    @property({ tooltip: '巡航水平漂移速度（像素/秒，0 代表固定 X）' })
    private horizontalDrift: number = 0;

    /** 角度平滑係數（0~1）。 */
    @property({ tooltip: '角度平滑係數（0~1）', range: [0, 1, 0.01], slide: true })
    private rotationLerp: number = 0.15;

    /** 角度計算時的基礎水平速度（避免 vx=0 過度抬頭）。 */
    @property({ tooltip: '角度計算時的基礎水平速度（避免 vx=0 過度抬頭）' })
    private angleForwardSpeed: number = 140;

    /** 最大傾斜角（度）。 */
    @property({ tooltip: '最大傾斜角（度）' })
    private maxAngle: number = 25;

    /** 最大仰角（Cocos 角度，向右=0、向上=+90）。 */
    @property({ tooltip: '最大仰角（Cocos 角度，向右=0、向上=+90）' })
    private maxUpAngleCocos: number = 85;

    /** RunningElapsed 平滑速度（越大越貼近 server，建議 8~16）。 */
    @property({ tooltip: 'RunningElapsed 平滑速度（越大越貼近 server）', range: [4, 20, 1], slide: true })
    private elapsedSmoothingSpeed: number = 12;

    /** 鳳凰自己的飛行座標區；可指定與曲線相同的 plotArea，但不依賴曲線腳本。 */
    @property({ type: UITransform, tooltip: '鳳凰飛行座標區，請指定與曲線圖相同的 plotArea。' })
    private flightPathArea: UITransform = null;

    @property({ tooltip: '飛行路徑是否使用 log Y，需與曲線圖設定一致。' })
    private pathUseLogY: boolean = false;

    @property({ tooltip: '飛行路徑是否交換 t/m 軸，需與曲線圖設定一致。' })
    private pathSwapAxes: boolean = true;

    @property({ tooltip: '飛行路徑顯示最大秒數；0 表示依曲線資料。' })
    private pathVisualMaxTimeSeconds: number = 0;

    @property({ tooltip: '飛行路徑顯示最小倍率。' })
    private pathVisualMinMultiplier: number = 0.2;

    @property({ tooltip: '飛行路徑顯示最大倍率；0 表示依曲線資料。' })
    private pathVisualMaxMultiplier: number = 0;

    /** 飛行時是否沿 UI 曲線圖移動（位置對齊 crash 曲線）。 */
    @property({ tooltip: '飛行時是否沿 UI 曲線圖移動（位置對齊 crash 曲線）' })
    private followGraphPosition: boolean = true;

    /** 沿 UI 曲線時是否使用曲線切線角度。 */
    @property({ tooltip: '沿 UI 曲線時是否使用曲線切線角度' })
    private followGraphAngle: boolean = true;

    /** 曲線切線角度是否套用 maxAngle 限制。 */
    @property({ tooltip: '曲線切線角度是否套用 maxAngle 限制' })
    private clampGraphAngle: boolean = false;

    /** 沿 UI 曲線取點後的額外偏移（父節點座標）。 */
    @property({ type: Vec3, tooltip: '沿 UI 曲線取點後的額外偏移（父節點座標）' })
    private graphFollowOffset: Vec3 = new Vec3(0, 0, 0);

    /** 鳳凰相對曲線取樣點的 X 偏移（正值=鳳凰往右、曲線會接近鳳凰尾巴）。 */
    @property({ tooltip: '鳳凰相對曲線取樣點的 X 偏移（正值=鳳凰往右、曲線會接近鳳凰尾巴）' })
    private tailAlignOffsetX: number = 0;

    /** 跟隨曲線時自動補償鳳凰子節點偏移（Controller 掛在父節點時建議開）。 */
    @property({ tooltip: '跟隨曲線時自動補償鳳凰子節點偏移（Controller 掛在父節點時建議開）' })
    private autoCompensatePhoenixChildOffset: boolean = true;

    @property({ tooltip: '將曲線目前點對齊到鳳凰腳部，而不是 Spine 節點原點。' })
    private alignGraphPointToPhoenixFoot: boolean = true;

    @property({ type: Vec3, tooltip: '鳳凰腳部對位微調，會加在自動估算的腳部位置上。' })
    private phoenixFootOffset: Vec3 = new Vec3(0, 0, 0);

    /** 是否使用 game.init 的 multiplierCurve 計算飛行角度。 */
    @property({ tooltip: '是否使用 game.init 的 multiplierCurve 計算飛行角度' })
    private useGameInitCurveAngle: boolean = true;


    /** 曲線角度最小值（度）。 */
    @property({ tooltip: '曲線角度最小值（度）' })
    private curveMinAngle: number = 4;

    /** 曲線角度最大值（度）。 */
    @property({ tooltip: '曲線角度最大值（度）' })
    private curveMaxAngle: number = 25;

    /** 墜毀時間（秒）。 */
    @property({ tooltip: '墜毀時間（秒）' })
    private crashDuration: number = 0.55;

    /** 墜毀位移（像素，向下）。 */
    @property({ tooltip: '墜毀位移（像素，向下）' })
    private crashDropDistance: number = 620;

    /** 墜毀 easing（例如 quadIn / cubicIn）。 */
    @property({ tooltip: '墜毀 easing（例如 quadIn / cubicIn）' })
    private crashEasing: TweenEasing = 'quadIn';

    /** 墜毀縮放比例（1 = 不縮放）。 */
    @property({ tooltip: '墜毀縮放比例（1 = 不縮放）' })
    private crashScaleFactor: number = 0.85;

    /** 墜毀後是否隱藏節點。 */
    @property({ tooltip: '墜毀後是否隱藏節點' })
    private hideAfterCrash: boolean = false;

    /** Debug 秒數 Label（編輯器拖入）；顯示 RunningElapsed 的當前秒數。 */
    @property({ type: Label, tooltip: 'Debug 秒數 Label（編輯器拖入；顯示 RunningElapsed）' })
    private debugRunningSecondsLabel: Label = null;

    /** phase 欄位。 */
    private phase: PhoenixPhase = PhoenixPhase.Idle;
    private defaultScale: Vec3 = new Vec3(1, 1, 1);
    private eggIdlePosition: Vec3 = new Vec3();
    /** flyingBaseY 欄位。 */
    private flyingBaseY: number = 0;
    /** flyingAnchorX 欄位。 */
    private flyingAnchorX: number = 0;
    /** flyingElapsed 欄位。 */
    private flyingElapsed: number = 0;
    /** currentAngle 欄位。 */
    private currentAngle: number = 0;
    private previousPosition: Vec3 = new Vec3();
    /** latestMultiplier 欄位。 */
    private latestMultiplier: number = 1;
    /** currentSpineAnimation 欄位。 */
    private currentSpineAnimation: string = '';
    /** currentSpineComponent 欄位。 */
    private currentSpineComponent: sp.Skeleton = null;
    private latestRunningElapsedSeconds: number = 0;
    private currentCurveElapsedSeconds: number = 0;
    private targetCurveElapsedSeconds: number = 0;
    private hasRunningElapsedSample: boolean = false;
    private curve: CrashMultiplierCurvePointContract[] = [...PhoenixController.DEFAULT_MULTIPLIER_CURVE];
    private curveSlopeMin: number = 0;
    private curveSlopeMax: number = 1;
    private minT: number = 0;
    private maxT: number = 1;
    private minMetricM: number = 0;
    private maxMetricM: number = 1;
    private warnedMissingFlightPathArea: boolean = false;
    private tmpAutoGraphOffset: Vec3 = new Vec3();
    private tmpPhoenixFootOffset: Vec3 = new Vec3();
    private tmpSpineWorldPosition: Vec3 = new Vec3();
    private tmpSpineLocalPosition: Vec3 = new Vec3();

    /** start。 */
    start() {
        this.resolveSpine();
        this.applyCurve(this.curve);
        this.defaultScale = this.node.scale.clone();
        this.eggIdlePosition = this.node.position.clone();
        GameData.getInstance().onGameState(GmaeModel.MultiplierCurve, this.onMultiplierCurve, this);
        GameData.getInstance().onGameState(GmaeModel.BettingCountdown, this.onBetting, this);
        GameData.getInstance().onGameState(GmaeModel.Multiplier, this.onMultiplier, this);
        GameData.getInstance().onGameState(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().onGameState(GmaeModel.Explode, this.onExplode, this);
        GameData.getInstance().onGameState(GmaeModel.Settled, this.onSettled, this);

        this.enterIdle();
    }

    /** onDisable。 */
    protected onDisable(): void {
        Tween.stopAllByTarget(this.node);
        this.currentSpineAnimation = '';
        this.currentSpineComponent = null;
    }

    protected onDestroy(): void {
        GameData.getInstance().offGameState(GmaeModel.MultiplierCurve, this.onMultiplierCurve, this);
        GameData.getInstance().offGameState(GmaeModel.BettingCountdown, this.onBetting, this);
        GameData.getInstance().offGameState(GmaeModel.Multiplier, this.onMultiplier, this);
        GameData.getInstance().offGameState(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().offGameState(GmaeModel.Explode, this.onExplode, this);
        GameData.getInstance().offGameState(GmaeModel.Settled, this.onSettled, this);
    }

    /**
     * update。
     * @param deltaTime deltaTime
     */
    update(deltaTime: number) {
        if (this.phase !== PhoenixPhase.Flying) return;
        if (deltaTime <= 0) return;

        this.flyingElapsed += deltaTime;
        // Keep the same order as CrashCurveGraphView: map runningElapsed to curveT first, then smooth.
        const smooth = 1 - Math.exp(-Math.max(0, this.elapsedSmoothingSpeed) * deltaTime);
        this.currentCurveElapsedSeconds += (this.targetCurveElapsedSeconds - this.currentCurveElapsedSeconds) * smooth;

        const graphAngle = this.updatePositionByGraph();
        if (graphAngle !== null) {
            if (this.followGraphAngle) {
                const rawTargetAngle = this.clampGraphAngle
                    ? this.clamp(graphAngle, -Math.abs(this.maxAngle), Math.abs(this.maxAngle))
                    : graphAngle;
                this.applySmoothedAngle(this.clampMaxUpAngle(rawTargetAngle));
            } else {
                this.updateFlyingRotation(deltaTime);
            }
            this.updatePositionByGraph();
            this.previousPosition = this.node.position.clone();
            return;
        }

        // graph 不可用時的 fallback：基礎上升 + 波浪 + 水平漂移
        const rise = this.getCurrentRiseSpeed() * deltaTime;
        this.flyingBaseY += rise;

        const waveY = Math.sin(this.flyingElapsed * this.waveFrequency) * this.waveAmplitude;
        const nextY = this.flyingBaseY + waveY;
        const nextX = this.flyingAnchorX + this.horizontalDrift * this.flyingElapsed;
        const p = this.node.position;
        this.node.setPosition(nextX, nextY, p.z);

        this.updateFlyingRotation(deltaTime);
    }

    /** onBetting。 */
    private onBetting() {
        this.hasRunningElapsedSample = false;
        this.latestRunningElapsedSeconds = 0;
        this.resetCurveElapsedToStart();
        if (!this.resetOnBetting) return;
        this.enterIdle();
    }

    /**
     * onMultiplier。
     * @param multiplier multiplier
     */
    private onMultiplier(multiplier: number) {
        if (GameData.getInstance().RoundState !== RoundState.Running) return;

        if (Number.isFinite(multiplier)) {
            this.latestMultiplier = Math.max(1, multiplier);
        }

        if (this.phase === PhoenixPhase.Idle) {
            this.startFlying();
            return;
        }

        if (
            this.phase === PhoenixPhase.Crashing &&
            this.latestMultiplier <= Math.max(1, this.newRoundStartMultiplierThreshold)
        ) {
            this.enterIdle();
            this.startFlying();
        }
    }

    /** onRunningElapsed。 */
    private onRunningElapsed(elapsed: number) {
        if (!Number.isFinite(elapsed)) return;

        this.latestRunningElapsedSeconds = Math.max(0, elapsed);
        const curveT = this.realToCurveT(this.latestRunningElapsedSeconds);
        const bounds = this.getCurveBounds();
        this.targetCurveElapsedSeconds = this.clamp(curveT, bounds.minT, bounds.maxT);
        this.hasRunningElapsedSample = true;
        if (this.debugRunningSecondsLabel) {
            this.debugRunningSecondsLabel.string = `running: ${this.latestRunningElapsedSeconds.toFixed(2)}s`;
        }
    }

    /** onExplode。 */
    private onMultiplierCurve(curve: CrashMultiplierCurvePointContract[]) {
        this.applyCurve(curve);
    }

    private onExplode() {
        if (this.phase === PhoenixPhase.Crashing) return;
        if (this.phase === PhoenixPhase.Idle) {
            const m = Number(GameData.getInstance().Multiplier);
            if (Number.isFinite(m)) this.latestMultiplier = Math.max(1, m);
            this.currentCurveElapsedSeconds = this.targetCurveElapsedSeconds;
        }
        this.startCrashing();
    }

    /** onSettled。 */
    private onSettled() {
        this.hasRunningElapsedSample = false;
        this.latestRunningElapsedSeconds = 0;
        this.resetCurveElapsedToStart();
        if (!this.resetOnBetting) return;
        this.enterIdle();
    }

    /** enterIdle。 */
    private enterIdle() {
        this.phase = PhoenixPhase.Idle;
        this.latestMultiplier = 1;
        this.flyingElapsed = 0;
        this.hasRunningElapsedSample = false;
        this.latestRunningElapsedSeconds = 0;
        this.resetCurveElapsedToStart();

        Tween.stopAllByTarget(this.node);
        this.node.active = true;
        this.node.scale = this.defaultScale.clone();
        this.resetRoundStartTransform();
        this.playEggIdleLoop(false);
    }

    /** startFlying。 */
    private startFlying() {
        /** New round starts from a deterministic pose to avoid carrying previous round transform. */
        this.resetRoundStartTransform();
        this.phase = PhoenixPhase.Flying;
        this.playStartThenFly(this.restartFlyOnEnter);
        this.flyingElapsed = 0;

        this.flyingAnchorX = this.node.position.x;
        this.flyingBaseY = this.node.position.y;
        this.currentAngle = this.node.angle;
        this.previousPosition = this.node.position.clone();

        const graphAngle = this.updatePositionByGraph(false);
        if (graphAngle !== null) {
            if (this.followGraphAngle) {
                const rawTargetAngle = this.clampGraphAngle
                    ? this.clamp(graphAngle, -Math.abs(this.maxAngle), Math.abs(this.maxAngle))
                    : graphAngle;
                this.currentAngle = this.clampMaxUpAngle(rawTargetAngle);
                this.node.angle = this.currentAngle;
            } else {
                this.currentAngle = this.node.angle;
            }
            this.updatePositionByGraph(false);
            this.previousPosition = this.node.position.clone();
        }
    }

    /** resetRoundStartTransform。 */
    private resetRoundStartTransform() {
        this.node.setPosition(this.eggIdlePosition);
        this.node.angle = 0;
        this.currentAngle = 0;
        this.syncPhoenixSpineStartPosition();
        this.previousPosition = this.node.position.clone();
    }

    /** startCrashing。 */
    private startCrashing() {
        this.phase = PhoenixPhase.Crashing;
        Tween.stopAllByTarget(this.node);
        /** Crash 當下立即把姿態回正，避免蛋 die 動畫帶著飛行仰角。 */
        this.node.angle = 0;
        this.currentAngle = 0;
        this.playEggDie(true);
        this.updatePositionByGraph(true);
        this.previousPosition = this.node.position.clone();

        const from = this.node.position;
        const targetPos = new Vec3(from.x, from.y - this.crashDropDistance, from.z);
        const targetScale = new Vec3(
            this.defaultScale.x * this.crashScaleFactor,
            this.defaultScale.y * this.crashScaleFactor,
            this.defaultScale.z
        );

        tween(this.node)
            .to(
                Math.max(0.01, this.crashDuration),
                {
                    position: targetPos,
                    scale: targetScale,
                },
                {
                    easing: this.crashEasing,
                }
            )
            .call(() => {
                if (this.phase !== PhoenixPhase.Crashing) return;
                if (this.hideAfterCrash) {
                    this.node.active = false;
                }
            })
            .start();
    }

    /**
     * updateFlyingRotation。
     * @param deltaTime deltaTime
     */
    private updateFlyingRotation(deltaTime: number) {
        const curveAngle = this.getCurveTargetAngle();
        if (curveAngle !== null) {
            const t = this.clamp(this.rotationLerp, 0, 1);
            const cappedCurveAngle = this.clampMaxUpAngle(curveAngle);
            this.currentAngle += (cappedCurveAngle - this.currentAngle) * t;
            this.currentAngle = this.clampMaxUpAngle(this.currentAngle);
            this.node.angle = this.currentAngle;
            this.previousPosition = this.node.position.clone();
            return;
        }

        const current = this.node.position;
        const vy = (current.y - this.previousPosition.y) / deltaTime;
        let vx = (current.x - this.previousPosition.x) / deltaTime;

        if (Math.abs(vx) < 0.0001) {
            vx = Math.max(0.0001, this.angleForwardSpeed);
        }

        let targetAngle = Math.atan2(vy, vx) * 180 / Math.PI;
        targetAngle = this.clamp(targetAngle, -Math.abs(this.maxAngle), Math.abs(this.maxAngle));
        targetAngle = this.clampMaxUpAngle(targetAngle);

        const t = this.clamp(this.rotationLerp, 0, 1);
        this.currentAngle += (targetAngle - this.currentAngle) * t;
        this.currentAngle = this.clampMaxUpAngle(this.currentAngle);
        this.node.angle = this.currentAngle;

        this.previousPosition = current.clone();
    }

    /**
     * getCurrentRiseSpeed。
     * @returns getCurrentRiseSpeed 回傳值
     */
    private getCurrentRiseSpeed(): number {
        let speedFactor = 1;
        if (this.multiplierRiseFactor > 0) {
            speedFactor += (this.latestMultiplier - 1) * this.multiplierRiseFactor;
        }
        speedFactor = this.clamp(speedFactor, 0, Math.max(0.01, this.maxRiseSpeedFactor));
        return this.riseSpeed * speedFactor;
    }

    /**
     * clamp。
     * @param value value
     * @param min min
     * @param max max
     * @returns clamp 回傳值
     */
    private clamp(value: number, min: number, max: number): number {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    /** resolveSpine。 */
    private resolveSpine() {
        if (!this.eggSpine && this.phoenixSpine) this.eggSpine = this.phoenixSpine;
        if (!this.phoenixSpine && this.eggSpine) this.phoenixSpine = this.eggSpine;

        if (!this.eggSpine || !this.phoenixSpine) {
            const fallback = this.node.getComponent(sp.Skeleton) ?? this.node.getComponentInChildren(sp.Skeleton);
            if (!this.eggSpine) this.eggSpine = fallback;
            if (!this.phoenixSpine) this.phoenixSpine = fallback;
        }

        if (!this.eggSpine || !this.phoenixSpine) {
            warn('[PhoenixController] Missing eggSpine / phoenixSpine reference.');
        }

        this.switchToEggSpine();
        this.syncPhoenixSpineStartPosition();
    }

    private syncPhoenixSpineStartPosition() {
        const eggNode = this.eggSpine?.node;
        const phoenixNode = this.phoenixSpine?.node;
        if (!eggNode || !phoenixNode || eggNode === phoenixNode) return;

        if (eggNode.parent === phoenixNode.parent) {
            phoenixNode.setPosition(eggNode.position);
            return;
        }

        eggNode.getWorldPosition(this.tmpSpineWorldPosition);
        if (phoenixNode.parent) {
            phoenixNode.parent.inverseTransformPoint(this.tmpSpineLocalPosition, this.tmpSpineWorldPosition);
            phoenixNode.setPosition(this.tmpSpineLocalPosition);
            return;
        }

        phoenixNode.setPosition(this.tmpSpineWorldPosition);
    }

    /**
     * playEggIdleLoop。
     * @param forceRestart forceRestart
     */
    private playEggIdleLoop(forceRestart: boolean) {
        this.playSpineAnimation(this.switchToEggSpine(), this.eggIdleAnimationName, this.crashTrackIndex, true, forceRestart);
    }

    /**
     * playStartThenFly。
     * @param forceRestart forceRestart
     */
    private playStartThenFly(forceRestart: boolean) {
        const phoenix = this.switchToPhoenixSpine();
        if (!phoenix) return;

        const startName = this.startAnimationName?.trim();
        const flyName = this.flyAnimationName?.trim();

        if (!startName) {
            this.playFlyLoop(forceRestart);
            return;
        }

        const key = `${phoenix.node.uuid}:${startName}`;
        if (!forceRestart && this.currentSpineAnimation === key) return;

        phoenix.setAnimation(PhoenixController.FLY_TRACK_INDEX, startName, false);
        this.currentSpineAnimation = key;
        this.currentSpineComponent = phoenix;

        if (flyName) {
            phoenix.addAnimation(PhoenixController.FLY_TRACK_INDEX, flyName, true, 0);
            this.currentSpineAnimation = `${phoenix.node.uuid}:${flyName}`;
        }
    }

    /**
     * playFlyLoop。
     * @param forceRestart forceRestart
     */
    private playFlyLoop(forceRestart: boolean) {
        this.playSpineAnimation(this.switchToPhoenixSpine(), this.flyAnimationName, PhoenixController.FLY_TRACK_INDEX, true, forceRestart);
    }

    /**
     * playEggDie。
     * @param forceRestart forceRestart
     */
    private playEggDie(forceRestart: boolean) {
        const dieName = this.eggDieAnimationName?.trim() || this.crashAnimationName?.trim();
        this.playSpineAnimation(this.switchToEggSpine(), dieName, this.crashTrackIndex, false, forceRestart);
    }

    private playSpineAnimation(
        skeleton: sp.Skeleton | null,
        name: string,
        trackIndex: number,
        loop: boolean,
        forceRestart: boolean
    ) {
        if (!name || !name.trim()) return;
        if (!skeleton) return;

        const key = `${skeleton.node.uuid}:${name}`;
        if (!forceRestart && this.currentSpineAnimation === key && this.currentSpineComponent === skeleton) return;

        skeleton.setAnimation(trackIndex, name, loop);
        this.currentSpineAnimation = key;
        this.currentSpineComponent = skeleton;
    }

    /**
     * switchToEggSpine。
     * @returns switchToEggSpine 回傳值
     */
    private switchToEggSpine(): sp.Skeleton | null {
        return this.switchActiveSpine(this.eggSpine);
    }

    /**
     * switchToPhoenixSpine。
     * @returns switchToPhoenixSpine 回傳值
     */
    private switchToPhoenixSpine(): sp.Skeleton | null {
        return this.switchActiveSpine(this.phoenixSpine);
    }

    /**
     * switchActiveSpine。
     * @param target target
     * @returns switchActiveSpine 回傳值
     */
    private switchActiveSpine(target: sp.Skeleton | null): sp.Skeleton | null {
        if (!target) return null;

        const eggNode = this.eggSpine?.node;
        const phoenixNode = this.phoenixSpine?.node;

        if (eggNode && phoenixNode && eggNode !== phoenixNode) {
            eggNode.active = target === this.eggSpine;
            phoenixNode.active = target === this.phoenixSpine;
        }

        return target;
    }

    /**
     * updatePositionByGraph。
     * @param preferCurrentProgress preferCurrentProgress
     * @returns updatePositionByGraph 回傳值
     */
    private updatePositionByGraph(preferElapsedProgress: boolean = true): number | null {
        if (!this.followGraphPosition) return null;
        if (!this.flightPathArea) {
            if (!this.warnedMissingFlightPathArea) {
                warn('[PhoenixController] Missing flightPathArea. Assign the same UITransform used by the curve plot area.');
                this.warnedMissingFlightPathArea = true;
            }
            return null;
        }

        const sample = this.getGraphFollowSample(preferElapsedProgress);
        if (!sample) return null;

        const worldPosition = this.mapCurveWorldToPhoenixWorld(sample.worldPosition);
        this.setPositionByWorld(worldPosition);
        return sample.angle;
    }

    private getGraphFollowSample(preferElapsedProgress: boolean): CurveSample | null {
        // 用本地平滑後的 elapsed 經 view 的 realToCurveT 映射成曲線秒數再 sample；
        // 跟頭部圓形「同一套公式、各自計算」，不讀 view 內部狀態。
        if (preferElapsedProgress && this.hasRunningElapsedSample) {
            const sample = this.sampleByElapsed(this.currentCurveElapsedSeconds);
            if (sample) return sample;
        }
        return this.sampleByMultiplier(this.latestMultiplier);
    }

    /**
     * mapCurveWorldToPhoenixWorld。
     * @param curveWorldPosition curveWorldPosition
     * @returns mapCurveWorldToPhoenixWorld 回傳值
     */
    private mapCurveWorldToPhoenixWorld(curveWorldPosition: Vec3): Vec3 {
        return curveWorldPosition;
    }

    private sampleByMultiplier(multiplier: number): CurveSample | null {
        if (!this.flightPathArea) return null;
        const point = this.getCurvePointByMultiplier(multiplier);
        if (!point) return null;
        const local = this.toLocalPoint(point.t, point.m);
        const angle = this.getAngleByTime(point.t);
        return { worldPosition: this.flightPathArea.convertToWorldSpaceAR(local), angle };
    }

    private sampleByElapsed(elapsedSeconds: number): CurveSample | null {
        if (!this.flightPathArea) return null;
        const point = this.getCurvePointByCurveT(elapsedSeconds);
        if (!point) return null;
        const local = this.toLocalPoint(point.t, point.m);
        const angle = this.getAngleByTime(point.t);
        return { worldPosition: this.flightPathArea.convertToWorldSpaceAR(local), angle };
    }

    private applyCurve(rawCurve: CrashMultiplierCurvePointContract[] | null | undefined) {
        const normalized = Array.isArray(rawCurve)
            ? rawCurve
                .filter((item) => Number.isFinite(item?.t) && Number.isFinite(item?.m))
                .map((item) => ({ t: Number(item.t), m: Number(item.m) }))
                .filter((item) => item.t >= 0 && item.m > 0)
                .sort((a, b) => a.t - b.t)
            : [];

        this.curve = normalized.length >= 2
            ? normalized
            : [...PhoenixController.DEFAULT_MULTIPLIER_CURVE];

        this.rebuildSlopeRange();
        this.rebuildDisplayBounds();
        this.resetCurveElapsedToStart();
    }

    private resetCurveElapsedToStart() {
        const startElapsed = this.curve.length > 0 ? this.curve[0].t : 0;
        this.currentCurveElapsedSeconds = startElapsed;
        this.targetCurveElapsedSeconds = startElapsed;
    }

    private rebuildSlopeRange() {
        this.curveSlopeMin = 0;
        this.curveSlopeMax = 1;
        if (this.curve.length < 2) return;

        const slopes: number[] = [];
        for (let i = 0; i < this.curve.length - 1; i++) {
            const a = this.curve[i];
            const b = this.curve[i + 1];
            const dt = b.t - a.t;
            if (dt <= 0) continue;
            const slope = (b.m - a.m) / dt;
            if (!Number.isFinite(slope)) continue;
            slopes.push(Math.max(0, slope));
        }

        if (slopes.length <= 0) return;
        this.curveSlopeMin = Math.min(...slopes);
        this.curveSlopeMax = Math.max(...slopes);
        if (this.curveSlopeMax - this.curveSlopeMin < 0.0001) {
            this.curveSlopeMin = 0;
        }
    }

    private rebuildDisplayBounds() {
        const bounds = this.getCurveBounds();

        this.minT = bounds.minT;
        this.maxT = this.pathVisualMaxTimeSeconds > 0 ? bounds.minT + this.pathVisualMaxTimeSeconds : bounds.maxT;
        if (this.maxT - this.minT < 0.000001) this.maxT = this.minT + 1;

        const displayMinM = this.pathVisualMinMultiplier > 0 ? this.pathVisualMinMultiplier : bounds.minM;
        let displayMaxM = this.pathVisualMaxMultiplier > 0 ? this.pathVisualMaxMultiplier : bounds.maxM;
        if (displayMaxM - displayMinM < 0.000001) displayMaxM = displayMinM + 1;

        const minMetric = this.metricM(displayMinM);
        const maxMetric = this.metricM(displayMaxM);
        this.minMetricM = Math.min(minMetric, maxMetric);
        this.maxMetricM = Math.max(minMetric, maxMetric);
        if (this.maxMetricM - this.minMetricM < 0.000001) this.maxMetricM = this.minMetricM + 1;
    }

    private getCurveBounds(): { minT: number; maxT: number; minM: number; maxM: number } {
        if (this.curve.length < 2) return { minT: 0, maxT: 1, minM: 0.2, maxM: 1 };
        let minM = Number.POSITIVE_INFINITY;
        let maxM = Number.NEGATIVE_INFINITY;
        for (const p of this.curve) {
            if (p.m < minM) minM = p.m;
            if (p.m > maxM) maxM = p.m;
        }
        return { minT: this.curve[0].t, maxT: this.curve[this.curve.length - 1].t, minM, maxM };
    }

    private realToCurveT(realT: number): number {
        const fastEnd = this.getFastEnd();
        const slowEnd = this.getSlowEnd();
        if (realT <= 0 || fastEnd <= 0 || slowEnd <= fastEnd) return 0;

        if (realT <= fastEnd) {
            return realT * (PhoenixController.FAST_TARGET_CURVE / fastEnd);
        }

        if (realT <= slowEnd) {
            const slowDur = slowEnd - fastEnd;
            return PhoenixController.FAST_TARGET_CURVE
                + (PhoenixController.MAX_CURVE - PhoenixController.FAST_TARGET_CURVE) * (realT - fastEnd) / slowDur;
        }

        return PhoenixController.MAX_CURVE;
    }

    private getCurvePointByCurveT(curveT: number): { t: number; m: number } | null {
        if (this.curve.length < 2) return null;
        const minT = this.curve[0].t;
        const maxT = this.curve[this.curve.length - 1].t;
        const clampedT = this.clamp(curveT, minT, maxT);
        for (let i = 0; i < this.curve.length - 1; i++) {
            const a = this.curve[i];
            const b = this.curve[i + 1];
            if (a.t <= clampedT && clampedT <= b.t) {
                const dt = b.t - a.t;
                const ratio = dt > 0.000001 ? (clampedT - a.t) / dt : 0;
                return { t: clampedT, m: a.m + (b.m - a.m) * ratio };
            }
        }
        return { t: clampedT, m: this.curve[this.curve.length - 1].m };
    }

    private getCurvePointByMultiplier(multiplier: number): { t: number; m: number } | null {
        if (this.curve.length < 2) return null;
        const firstM = this.curve[0].m;
        const lastM = this.curve[this.curve.length - 1].m;
        const lo = Math.min(firstM, lastM);
        const hi = Math.max(firstM, lastM);
        const clampedM = this.clamp(multiplier, lo, hi);
        const idx = this.findSegmentByMultiplier(clampedM);
        if (idx < 0) return null;
        const a = this.curve[idx];
        const b = this.curve[idx + 1];
        const mSpan = b.m - a.m;
        const ratio = Math.abs(mSpan) > 0.000001 ? (clampedM - a.m) / mSpan : 0;
        return { t: a.t + (b.t - a.t) * ratio, m: clampedM };
    }

    private getCurveSlope(multiplier: number): number | null {
        if (this.curve.length < 2) return null;
        if (!Number.isFinite(multiplier)) return null;
        const idx = this.findSegmentByMultiplier(multiplier);
        if (idx < 0) return null;
        const a = this.curve[idx];
        const b = this.curve[idx + 1];
        const dt = b.t - a.t;
        if (dt <= 0) return null;
        const slope = Math.max(0, (b.m - a.m) / dt);
        const slopeSpan = this.curveSlopeMax - this.curveSlopeMin;
        if (slopeSpan > 0.0001) {
            return this.clamp((slope - this.curveSlopeMin) / slopeSpan, 0, 1);
        }
        return slope > 0 ? 1 : 0;
    }

    private findSegmentByMultiplier(multiplier: number): number {
        if (this.curve.length < 2) return -1;
        const first = this.curve[0];
        if (multiplier <= first.m) return 0;
        for (let i = 0; i < this.curve.length - 1; i++) {
            const a = this.curve[i];
            const b = this.curve[i + 1];
            const minM = Math.min(a.m, b.m);
            const maxM = Math.max(a.m, b.m);
            if (multiplier >= minM && multiplier <= maxM) return i;
        }
        return this.curve.length - 2;
    }

    private toLocalPoint(t: number, m: number): Vec3 {
        const width = this.flightPathArea.contentSize.width;
        const height = this.flightPathArea.contentSize.height;
        const anchor = this.flightPathArea.anchorPoint;

        const left = -width * anchor.x;
        const bottom = -height * anchor.y;

        const tNorm = this.clamp((t - this.minT) / (this.maxT - this.minT), 0, 1);
        const mMetric = this.metricM(Math.max(0.000001, m));
        const mNorm = this.clamp((mMetric - this.minMetricM) / (this.maxMetricM - this.minMetricM), 0, 1);

        const normX = this.pathSwapAxes ? tNorm : mNorm;
        const normY = this.pathSwapAxes ? mNorm : tNorm;

        return new Vec3(
            left + normX * width,
            bottom + normY * height,
            0
        );
    }

    private metricM(m: number): number {
        const safeM = Math.max(0.000001, m);
        if (!this.pathUseLogY) return safeM;
        return Math.log(safeM);
    }

    private getAngleByTime(t: number): number {
        const bounds = this.getCurveBounds();
        const tSpan = Math.max(0.000001, bounds.maxT - bounds.minT);
        const dt = Math.max(0.0005, tSpan * 0.01);
        const prev = this.getCurvePointByCurveT(t - dt);
        const next = this.getCurvePointByCurveT(t + dt);
        if (!prev || !next) return 0;
        const pa = this.toLocalPoint(prev.t, prev.m);
        const pb = this.toLocalPoint(next.t, next.m);
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) return 0;
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }

    private getFastEnd(): number {
        return this.curve.length >= 2
            ? this.curve[Math.floor(this.curve.length / 4)].t
            : 0;
    }

    private getSlowEnd(): number {
        return this.curve.length >= 2
            ? this.curve[Math.floor(this.curve.length / 2)].t
            : 0;
    }

    /**
     * setPositionByWorld。
     * @param worldPosition worldPosition
     */
    private setPositionByWorld(worldPosition: Vec3) {
        const parent = this.node.parent;
        const local = new Vec3();

        if (parent) {
            parent.inverseTransformPoint(local, worldPosition);
        } else {
            local.set(worldPosition);
        }

        const autoOffset = this.getAutoGraphFollowOffset();
        this.node.setPosition(
            local.x + this.graphFollowOffset.x + autoOffset.x + this.tailAlignOffsetX,
            local.y + this.graphFollowOffset.y + autoOffset.y,
            local.z + this.graphFollowOffset.z + autoOffset.z
        );
    }

    /**
     * getAutoGraphFollowOffset。
     * @returns getAutoGraphFollowOffset 回傳值
     */
    private getAutoGraphFollowOffset(): Vec3 {
        if (!this.autoCompensatePhoenixChildOffset) {
            this.tmpAutoGraphOffset.set(0, 0, 0);
            return this.tmpAutoGraphOffset;
        }

        const spineNode = this.getGraphFollowSpineNode();
        if (!spineNode || spineNode.parent !== this.node) {
            this.tmpAutoGraphOffset.set(0, 0, 0);
            return this.tmpAutoGraphOffset;
        }

        const rad = this.currentAngle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const footOffset = this.getSpineFootOffset(spineNode);
        const x = spineNode.position.x + footOffset.x;
        const y = spineNode.position.y + footOffset.y;

        // Compensate the rotated child offset so the visible spine foot stays on the graph sample.
        this.tmpAutoGraphOffset.set(
            -(x * cos - y * sin),
            -(x * sin + y * cos),
            -(spineNode.position.z + footOffset.z)
        );
        return this.tmpAutoGraphOffset;
    }

    private getGraphFollowSpineNode(): Node | null {
        const currentNode = this.currentSpineComponent?.node;
        if (currentNode?.parent === this.node) return currentNode;

        const eggNode = this.eggSpine?.node;
        if (eggNode?.active && eggNode.parent === this.node) return eggNode;

        const phoenixNode = this.phoenixSpine?.node;
        if (phoenixNode?.active && phoenixNode.parent === this.node) return phoenixNode;
        if (phoenixNode?.parent === this.node) return phoenixNode;

        return null;
    }

    private getSpineFootOffset(spineNode: Node): Vec3 {
        this.tmpPhoenixFootOffset.set(this.phoenixFootOffset);
        if (!this.alignGraphPointToPhoenixFoot) return this.tmpPhoenixFootOffset;

        const transform = spineNode.getComponent(UITransform);
        if (!transform) return this.tmpPhoenixFootOffset;

        const anchor = transform.anchorPoint;
        const size = transform.contentSize;
        this.tmpPhoenixFootOffset.x += (0.5 - anchor.x) * size.width * spineNode.scale.x;
        this.tmpPhoenixFootOffset.y += -anchor.y * size.height * spineNode.scale.y;
        return this.tmpPhoenixFootOffset;
    }

    /**
     * applySmoothedAngle。
     * @param targetAngle targetAngle
     */
    private applySmoothedAngle(targetAngle: number) {
        const cappedTargetAngle = this.clampMaxUpAngle(targetAngle);
        const t = this.clamp(this.rotationLerp, 0, 1);
        this.currentAngle += (cappedTargetAngle - this.currentAngle) * t;
        this.currentAngle = this.clampMaxUpAngle(this.currentAngle);
        this.node.angle = this.currentAngle;
    }

    /**
     * clampMaxUpAngle。
     * @param angle angle
     * @returns clampMaxUpAngle 回傳值
     */
    private clampMaxUpAngle(angle: number): number {
        const normalized = this.normalizeAngle180(angle);
        const maxUp = Math.max(0, Math.abs(this.maxUpAngleCocos));
        return Math.min(normalized, maxUp);
    }

    /**
     * normalizeAngle180。
     * @param angle angle
     * @returns normalizeAngle180 回傳值
     */
    private normalizeAngle180(angle: number): number {
        let normalized = angle % 360;
        if (normalized > 180) normalized -= 360;
        if (normalized <= -180) normalized += 360;
        return normalized;
    }

    private getCurveTargetAngle(): number | null {
        if (!this.useGameInitCurveAngle) return null;
        if (!Number.isFinite(this.latestMultiplier)) return null;

        const normalized = this.getCurveSlope(this.latestMultiplier);
        if (normalized === null) return null;

        const minAngle = Math.min(this.curveMinAngle, this.curveMaxAngle);
        const maxAngle = Math.max(this.curveMinAngle, this.curveMaxAngle);
        const angleByCurve = minAngle + (maxAngle - minAngle) * normalized;
        return this.clamp(angleByCurve, -Math.abs(this.maxAngle), Math.abs(this.maxAngle));
    }
}
