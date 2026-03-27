import { _decorator, Camera, Component, Tween, TweenEasing, Vec3, sp, tween, warn } from 'cc';
import { GameData, GmaeModel } from '../Model/GameData';
import type { MultiplierCurvePoint } from '../Model/GameModel';
import { CrashCurveGraphView } from './CrashCurveGraphView';
const { ccclass, property } = _decorator;

/** PhoenixPhase 列舉。 */
enum PhoenixPhase {
    Idle = 'Idle',
    Flying = 'Flying',
    Crashing = 'Crashing',
}

@ccclass('PhoenixController')
export class PhoenixController extends Component {
    /** 舊版單一 Spine（未指定蛋/鳳凰時做 fallback）。 */
    @property({ type: sp.Skeleton, tooltip: '舊版單一 Spine（未指定蛋/鳳凰時做 fallback）' })
    private spine: sp.Skeleton = null;

    /** 蛋 Spine（Betting/Crash 使用）。 */
    @property({ type: sp.Skeleton, tooltip: '蛋 Spine（Betting/Crash 使用）' })
    private eggSpine: sp.Skeleton = null;

    /** 鳳凰 Spine（Running 使用）。 */
    @property({ type: sp.Skeleton, tooltip: '鳳凰 Spine（Running 使用）' })
    private phoenixSpine: sp.Skeleton = null;

    /** 蛋待機動畫（Betting，loop）。 */
    @property({ tooltip: '蛋待機動畫（Betting，loop）' })
    private eggIdleAnimationName: string = 'idle';

    /** 鳳凰起飛動畫（Running 進入瞬間，播放一次）。 */
    @property({ tooltip: '鳳凰起飛動畫（Running 進入瞬間，播放一次）' })
    private startAnimationName: string = 'start';

    /** 鳳凰飛行動畫名稱（Running，loop）。 */
    @property({ tooltip: '鳳凰飛行動畫名稱（Running，loop）' })
    private flyAnimationName: string = 'fly';

    /** 飛行動畫 Track Index。 */
    @property({ tooltip: '飛行動畫 Track Index' })
    private flyTrackIndex: number = 0;

    /** 進入 Flying 時是否重播 fly 動畫。 */
    @property({ tooltip: '進入 Flying 時是否重播 fly 動畫' })
    private restartFlyOnEnter: boolean = false;

    /** 蛋死亡動畫（Crash，播放一次；若留空會 fallback crashAnimationName）。 */
    @property({ tooltip: '蛋死亡動畫（Crash，播放一次；若留空會 fallback crashAnimationName）' })
    private eggDieAnimationName: string = 'die';

    /** （舊欄位）墜毀動畫名稱，僅在 eggDieAnimationName 留空時使用。 */
    @property({ tooltip: '（舊欄位）墜毀動畫名稱，僅在 eggDieAnimationName 留空時使用' })
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
    @property({ tooltip: '角度平滑係數（0~1）' })
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

    /** UI 曲線圖元件（請在 Inspector 指定，不依賴命名）。 */
    @property({ type: CrashCurveGraphView, tooltip: 'UI 曲線圖元件（請在 Inspector 指定，不依賴命名）' })
    private curveGraphView: CrashCurveGraphView = null;

    /** 渲染曲線圖的 UI Camera（可選，跨相機對齊用）。 */
    @property({ type: Camera, tooltip: '渲染曲線圖的 UI Camera（可選，跨相機對齊用）' })
    private uiCamera: Camera = null;

    /** 渲染鳳凰的 Main Camera（可選，跨相機對齊用）。 */
    @property({ type: Camera, tooltip: '渲染鳳凰的 Main Camera（可選，跨相機對齊用）' })
    private mainCamera: Camera = null;

    /** 是否啟用 UI Camera -> Main Camera 的跨相機座標對齊。 */
    @property({ tooltip: '是否啟用 UI Camera -> Main Camera 的跨相機座標對齊' })
    private useCrossCameraMapping: boolean = true;

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

    /** 跟隨曲線時自動補償鳳凰子節點偏移（Controller 掛在父節點時建議開）。 */
    @property({ tooltip: '跟隨曲線時自動補償鳳凰子節點偏移（Controller 掛在父節點時建議開）' })
    private autoCompensatePhoenixChildOffset: boolean = true;

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
    /** multiplierCurve 欄位。 */
    private multiplierCurve: MultiplierCurvePoint[] = [];
    /** curveSlopeMin 欄位。 */
    private curveSlopeMin: number = 0;
    /** curveSlopeMax 欄位。 */
    private curveSlopeMax: number = 1;
    /** warnedMissingCurveGraph 欄位。 */
    private warnedMissingCurveGraph: boolean = false;
    private tmpAutoGraphOffset: Vec3 = new Vec3();

    /** start。 */
    start() {
        this.resolveSpine();
        this.resolveCurveGraphView();
        this.curveGraphView?.releaseFollowTarget(this.node);
        this.defaultScale = this.node.scale.clone();
        this.eggIdlePosition = this.node.position.clone();
        const gameData = GameData.getInstance();
        this.applyMultiplierCurve(gameData.MultiplierCurve);
        gameData.on(GmaeModel.BettingCountdown, this.onBetting, this);
        gameData.on(GmaeModel.Multiplier, this.onMultiplier, this);
        gameData.on(GmaeModel.MultiplierCurve, this.onMultiplierCurve, this);
        gameData.on(GmaeModel.Explode, this.onExplode, this);
        gameData.on(GmaeModel.Settled, this.onSettled, this);

        this.enterIdle();
    }

    /** onDisable。 */
    protected onDisable(): void {
        Tween.stopAllByTarget(this.node);
        this.currentSpineAnimation = '';
        this.currentSpineComponent = null;
    }

    /**
     * update。
     * @param deltaTime deltaTime
     */
    update(deltaTime: number) {
        if (this.phase !== PhoenixPhase.Flying) return;
        if (deltaTime <= 0) return;

        const graphAngle = this.updatePositionByGraph();
        if (graphAngle !== null) {
            if (this.followGraphAngle) {
                const rawTargetAngle = this.clampGraphAngle
                    ? this.clamp(graphAngle, -Math.abs(this.maxAngle), Math.abs(this.maxAngle))
                    : graphAngle;
                this.applySmoothedAngle(this.clampMaxUpAngle(rawTargetAngle));
                this.previousPosition = this.node.position.clone();
            } else {
                this.updateFlyingRotation(deltaTime);
            }
            return;
        }

        this.flyingElapsed += deltaTime;

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
        if (!this.resetOnBetting) return;
        this.enterIdle();
    }

    /**
     * onMultiplier。
     * @param multiplier multiplier
     */
    private onMultiplier(multiplier: number) {
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

    /**
     * onMultiplierCurve。
     * @param curve curve
     */
    private onMultiplierCurve(curve: MultiplierCurvePoint[]) {
        this.applyMultiplierCurve(curve);
    }

    /** onExplode。 */
    private onExplode() {
        if (this.phase === PhoenixPhase.Crashing || this.phase === PhoenixPhase.Idle) return;
        this.startCrashing();
    }

    /** onSettled。 */
    private onSettled() {
        if (!this.resetOnBetting) return;
        this.enterIdle();
    }

    /** enterIdle。 */
    private enterIdle() {
        this.phase = PhoenixPhase.Idle;
        this.latestMultiplier = 1;
        this.flyingElapsed = 0;

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
            this.previousPosition = this.node.position.clone();
            return;
        }

        this.flyingAnchorX = this.node.position.x;
        this.flyingBaseY = this.node.position.y;
        this.currentAngle = this.node.angle;
        this.previousPosition = this.node.position.clone();
    }

    /** resetRoundStartTransform。 */
    private resetRoundStartTransform() {
        this.node.setPosition(this.eggIdlePosition);
        this.node.angle = 0;
        this.currentAngle = 0;
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
        if (!this.spine) {
            this.spine = this.node.getComponent(sp.Skeleton) ?? this.node.getComponentInChildren(sp.Skeleton);
        }
        if (!this.eggSpine) {
            this.eggSpine = this.spine;
        }
        if (!this.phoenixSpine) {
            this.phoenixSpine = this.spine;
        }
        this.switchToEggSpine();
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

        phoenix.setAnimation(this.flyTrackIndex, startName, false);
        this.currentSpineAnimation = key;
        this.currentSpineComponent = phoenix;

        if (flyName) {
            phoenix.addAnimation(this.flyTrackIndex, flyName, true, 0);
            this.currentSpineAnimation = `${phoenix.node.uuid}:${flyName}`;
        }
    }

    /**
     * playFlyLoop。
     * @param forceRestart forceRestart
     */
    private playFlyLoop(forceRestart: boolean) {
        this.playSpineAnimation(this.switchToPhoenixSpine(), this.flyAnimationName, this.flyTrackIndex, true, forceRestart);
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

        this.spine = target;
        return target;
    }

    /**
     * updatePositionByGraph。
     * @param preferCurrentProgress preferCurrentProgress
     * @returns updatePositionByGraph 回傳值
     */
    private updatePositionByGraph(preferCurrentProgress: boolean = true): number | null {
        if (!this.followGraphPosition) return null;
        this.resolveCurveGraphView();
        if (!this.curveGraphView) return null;

        const sample = preferCurrentProgress
            ? (this.curveGraphView.sampleByCurrentProgress() ??
                this.curveGraphView.sampleByMultiplier(this.latestMultiplier))
            : this.curveGraphView.sampleByMultiplier(this.latestMultiplier);
        if (!sample) return null;

        const worldPosition = this.mapCurveWorldToPhoenixWorld(sample.worldPosition);
        this.setPositionByWorld(worldPosition);
        return sample.angle;
    }

    /** resolveCurveGraphView。 */
    private resolveCurveGraphView() {
        if (this.curveGraphView) return;

        const scene = this.node.scene;
        if (!scene) return;

        const found = scene.getComponentsInChildren(CrashCurveGraphView);
        if (!found || found.length <= 0) {
            if (!this.warnedMissingCurveGraph) {
                warn('[PhoenixController] 未找到 CrashCurveGraphView，鳳凰無法跟隨曲線');
                this.warnedMissingCurveGraph = true;
            }
            return;
        }

        this.curveGraphView = found.find((item) => item.enabledInHierarchy) ?? found[0];
    }

    /**
     * mapCurveWorldToPhoenixWorld。
     * @param curveWorldPosition curveWorldPosition
     * @returns mapCurveWorldToPhoenixWorld 回傳值
     */
    private mapCurveWorldToPhoenixWorld(curveWorldPosition: Vec3): Vec3 {
        if (!this.useCrossCameraMapping) return curveWorldPosition;
        if (!this.uiCamera || !this.mainCamera) return curveWorldPosition;

        const screenPos = this.uiCamera.worldToScreen(curveWorldPosition, new Vec3());
        return this.mainCamera.screenToWorld(screenPos, new Vec3());
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
            local.x + this.graphFollowOffset.x + autoOffset.x,
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

        const phoenixNode = this.phoenixSpine?.node;
        if (!phoenixNode || phoenixNode.parent !== this.node) {
            this.tmpAutoGraphOffset.set(0, 0, 0);
            return this.tmpAutoGraphOffset;
        }

        this.tmpAutoGraphOffset.set(
            -phoenixNode.position.x,
            -phoenixNode.position.y,
            -phoenixNode.position.z
        );
        return this.tmpAutoGraphOffset;
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

    /**
     * applyMultiplierCurve。
     * @param curve curve
     */
    private applyMultiplierCurve(curve: MultiplierCurvePoint[] | null | undefined) {
        const normalized = Array.isArray(curve)
            ? curve
                .filter((item) => Number.isFinite(item?.t) && Number.isFinite(item?.m))
                .map((item) => ({ t: Number(item.t), m: Number(item.m) }))
                .sort((a, b) => a.t - b.t)
            : [];
        this.multiplierCurve = normalized;
        this.rebuildCurveSlopeRange();
    }

    /** rebuildCurveSlopeRange。 */
    private rebuildCurveSlopeRange() {
        this.curveSlopeMin = 0;
        this.curveSlopeMax = 1;
        if (this.multiplierCurve.length < 2) return;

        const slopes: number[] = [];
        for (let i = 0; i < this.multiplierCurve.length - 1; i++) {
            const a = this.multiplierCurve[i];
            const b = this.multiplierCurve[i + 1];
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

    /**
     * getCurveTargetAngle。
     * @returns getCurveTargetAngle 回傳值
     */
    private getCurveTargetAngle(): number | null {
        if (!this.useGameInitCurveAngle) return null;
        if (this.multiplierCurve.length < 2) return null;
        if (!Number.isFinite(this.latestMultiplier)) return null;

        const idx = this.findCurveSegmentIndexByMultiplier(this.latestMultiplier);
        if (idx < 0) return null;

        const a = this.multiplierCurve[idx];
        const b = this.multiplierCurve[idx + 1];
        const dt = b.t - a.t;
        if (dt <= 0) return null;

        const slope = Math.max(0, (b.m - a.m) / dt);
        const slopeSpan = this.curveSlopeMax - this.curveSlopeMin;
        const normalized = slopeSpan > 0.0001
            ? this.clamp((slope - this.curveSlopeMin) / slopeSpan, 0, 1)
            : (slope > 0 ? 1 : 0);

        const minAngle = Math.min(this.curveMinAngle, this.curveMaxAngle);
        const maxAngle = Math.max(this.curveMinAngle, this.curveMaxAngle);
        const angleByCurve = minAngle + (maxAngle - minAngle) * normalized;
        return this.clamp(angleByCurve, -Math.abs(this.maxAngle), Math.abs(this.maxAngle));
    }

    /**
     * findCurveSegmentIndexByMultiplier。
     * @param multiplier multiplier
     * @returns findCurveSegmentIndexByMultiplier 回傳值
     */
    private findCurveSegmentIndexByMultiplier(multiplier: number): number {
        if (this.multiplierCurve.length < 2) return -1;

        const first = this.multiplierCurve[0];
        if (multiplier <= first.m) {
            return 0;
        }

        for (let i = 0; i < this.multiplierCurve.length - 1; i++) {
            const a = this.multiplierCurve[i];
            const b = this.multiplierCurve[i + 1];
            const minM = Math.min(a.m, b.m);
            const maxM = Math.max(a.m, b.m);
            if (multiplier >= minM && multiplier <= maxM) {
                return i;
            }
        }

        return this.multiplierCurve.length - 2;
    }
}
