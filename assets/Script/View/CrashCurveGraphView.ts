import { _decorator, Camera, Color, Component, Graphics, Node, UITransform, Vec3, warn } from 'cc';
import { GameData, GmaeModel } from '../Model/GameData';
import type { MultiplierCurvePoint } from '../Model/GameModel';
const { ccclass, property } = _decorator;

/** CurveSample 型別定義。 */
type CurveSample = {
    worldPosition: Vec3;
    angle: number;
};

@ccclass('CrashCurveGraphView')
export class CrashCurveGraphView extends Component {
    /** 曲線繪製用 Graphics（不填就抓本節點）。 */
    @property({ type: Graphics, tooltip: '曲線繪製用 Graphics（不填就抓本節點）' })
    private graph: Graphics = null;

    /** 繪圖區域（不填就抓本節點 UITransform）。 */
    @property({ type: UITransform, tooltip: '繪圖區域（不填就抓本節點 UITransform）' })
    private plotArea: UITransform = null;

    /** 是否使用 Log 倍率軸（未對調時作用於 Y；對調後作用於 X）。 */
    @property({ tooltip: '是否使用 Log 倍率軸（未對調時作用於 Y；對調後作用於 X）' })
    private useLogY: boolean = false;

    /** 是否對調座標軸（開啟後：X=時間、Y=倍率）。 */
    @property({ tooltip: '是否對調座標軸（開啟後：X=時間、Y=倍率）' })
    private swapAxes: boolean = true;

    /** 線寬。 */
    @property({ tooltip: '線寬' })
    private lineWidth: number = 4;

    /** 曲線顏色。 */
    @property({ type: Color, tooltip: '曲線顏色' })
    private curveColor: Color = new Color(255, 204, 77, 255);

    /** 是否顯示目前倍率進度線。 */
    @property({ tooltip: '是否顯示目前倍率進度線' })
    private showProgress: boolean = true;

    /** 進度線顏色。 */
    @property({ type: Color, tooltip: '進度線顏色' })
    private progressColor: Color = new Color(126, 241, 101, 255);

    /** 是否僅繪製目前進度（不先畫整條曲線）。 */
    @property({ tooltip: '是否僅繪製目前進度（不先畫整條曲線）' })
    private drawOnlyProgress: boolean = true;

    /** 進度優先使用 server runningElapsed。 */
    @property({ tooltip: '進度優先使用 server runningElapsed' })
    private useRunningElapsedProgress: boolean = true;

    /** runningElapsed 單位縮放（秒=1，毫秒=0.001）。 */
    @property({ tooltip: 'runningElapsed 單位縮放（秒=1，毫秒=0.001）' })
    private runningElapsedScale: number = 0.001;

    /** 進度是否再用目前倍率夾住上限（避免 elapsed 超前）。 */
    @property({ tooltip: '進度是否再用目前倍率夾住上限（避免 elapsed 超前）' })
    private clampProgressByMultiplier: boolean = true;

    /** Running 期間是否用本地時間補推進 elapsed（避免目標瞬移）。 */
    @property({ tooltip: 'Running 期間是否用本地時間補推進 elapsed（避免目標瞬移）' })
    private predictElapsedBetweenServerTicks: boolean = true;

    /** 進度追蹤平滑速度（越大越貼近 server，建議 8~16）。 */
    @property({ tooltip: '進度追蹤平滑速度（越大越貼近 server，建議 8~16）' })
    private progressSmoothingSpeed: number = 12;

    /** 視覺時間上限（秒，<=0 代表使用完整曲線時間）。 */
    @property({ tooltip: '視覺時間上限（秒，<=0 代表使用完整曲線時間）' })
    private visualMaxTimeSeconds: number = 8;

    /** 視覺倍率下限（<=0 代表使用曲線最小倍率）。 */
    @property({ tooltip: '視覺倍率下限（<=0 代表使用曲線最小倍率）' })
    private visualMinMultiplier: number = 0.2;

    /** 視覺倍率上限（<=0 代表使用完整曲線最大倍率）。 */
    @property({ tooltip: '視覺倍率上限（<=0 代表使用完整曲線最大倍率）' })
    private visualMaxMultiplier: number = 5;

    /** 曲線 X 內部縮放（不改節點尺寸）。 */
    @property({ tooltip: '曲線 X 內部縮放（不改節點尺寸）' })
    private curveScaleX: number = 1;

    /** 曲線 Y 內部縮放（不改節點尺寸）。 */
    @property({ tooltip: '曲線 Y 內部縮放（不改節點尺寸）' })
    private curveScaleY: number = 1;

    /** 曲線 X 偏移（像素）。 */
    @property({ tooltip: '曲線 X 偏移（像素）' })
    private curveOffsetX: number = 0;

    /** 曲線 Y 偏移（像素）。 */
    @property({ tooltip: '曲線 Y 偏移（像素）' })
    private curveOffsetY: number = 0;

    /** 左內距。 */
    @property({ tooltip: '左內距' })
    private paddingLeft: number = 12;

    /** 右內距。 */
    @property({ tooltip: '右內距' })
    private paddingRight: number = 12;

    /** 上內距。 */
    @property({ tooltip: '上內距' })
    private paddingTop: number = 12;

    /** 下內距。 */
    @property({ tooltip: '下內距' })
    private paddingBottom: number = 12;

    /** 可選：要沿曲線移動的目標節點（例如鳳凰）。 */
    @property({ type: Node, tooltip: '可選：要沿曲線移動的目標節點（例如鳳凰）' })
    private followTarget: Node = null;

    /** 是否由本元件依倍率驅動 followTarget 位置。 */
    @property({ tooltip: '是否由本元件依倍率驅動 followTarget 位置' })
    private driveTargetByMultiplier: boolean = false;

    /** followTarget 位置是否平滑追目標（關閉則直接貼點）。 */
    @property({ tooltip: 'followTarget 位置是否平滑追目標（關閉則直接貼點）' })
    private smoothTargetPosition: boolean = true;

    /** followTarget 位置平滑速度（越大越快貼近，建議 6~14）。 */
    @property({ tooltip: 'followTarget 位置平滑速度（越大越快貼近，建議 6~14）' })
    private targetPositionFollowSpeed: number = 10;

    /** followTarget 每秒最大移動距離（像素，避免大步長瞬移）。 */
    @property({ tooltip: 'followTarget 每秒最大移動距離（像素，避免大步長瞬移）' })
    private targetMaxMoveSpeed: number = 520;

    /** 是否同步 followTarget 角度（曲線切線方向）。 */
    @property({ tooltip: '是否同步 followTarget 角度（曲線切線方向）' })
    private driveTargetAngle: boolean = true;

    /** followTarget 角度平滑係數（0~1）。 */
    @property({ tooltip: 'followTarget 角度平滑係數（0~1）' })
    private targetAngleLerp: number = 0.18;

    /** followTarget 跟隨時的額外偏移（目標父節點座標）。 */
    @property({ type: Vec3, tooltip: 'followTarget 跟隨時的額外偏移（目標父節點座標）' })
    private targetOffset: Vec3 = new Vec3(0, 0, 0);

    /** 是否啟用跨相機座標轉換（UI 曲線 -> 目標相機）。 */
    @property({ tooltip: '是否啟用跨相機座標轉換（UI 曲線 -> 目標相機）' })
    private useCrossCameraMapping: boolean = false;

    /** 曲線所在 Camera（通常是 UI Camera）。 */
    @property({ type: Camera, tooltip: '曲線所在 Camera（通常是 UI Camera）' })
    private graphCamera: Camera = null;

    /** 目標節點所在 Camera（例如 Main Camera）。 */
    @property({ type: Camera, tooltip: '目標節點所在 Camera（例如 Main Camera）' })
    private targetCamera: Camera = null;

    /** curve 欄位。 */
    private curve: MultiplierCurvePoint[] = [];
    /** currentMultiplier 欄位。 */
    private currentMultiplier: number = 1;
    /** currentElapsed 欄位。 */
    private currentElapsed: number = 0;
    /** targetMultiplier 欄位。 */
    private targetMultiplier: number = 1;
    /** targetElapsed 欄位。 */
    private targetElapsed: number = 0;
    /** isRunning 欄位。 */
    private isRunning: boolean = false;
    /** curveMinT 欄位。 */
    private curveMinT: number = 0;
    /** curveMaxT 欄位。 */
    private curveMaxT: number = 1;
    /** curveMinM 欄位。 */
    private curveMinM: number = 0.2;
    /** curveMaxM 欄位。 */
    private curveMaxM: number = 1;
    /** minT 欄位。 */
    private minT: number = 0;
    /** maxT 欄位。 */
    private maxT: number = 1;
    /** minMetricM 欄位。 */
    private minMetricM: number = 0;
    /** maxMetricM 欄位。 */
    private maxMetricM: number = 1;
    /** warnedMissingGraph 欄位。 */
    private warnedMissingGraph: boolean = false;
    /** warnedMissingPlotArea 欄位。 */
    private warnedMissingPlotArea: boolean = false;
    /** warnedSmallPlotArea 欄位。 */
    private warnedSmallPlotArea: boolean = false;
    /** warnedInsufficientCurve 欄位。 */
    private warnedInsufficientCurve: boolean = false;
    private tmpScreen: Vec3 = new Vec3();
    private tmpWorld: Vec3 = new Vec3();
    private tmpLocal: Vec3 = new Vec3();
    private tmpFollowTargetLocal: Vec3 = new Vec3();

    /**
     * releaseFollowTarget。
     * @param target? target?
     */
    public releaseFollowTarget(target?: Node): void {
        if (!this.followTarget) return;
        if (target && this.followTarget !== target) return;

        this.driveTargetByMultiplier = false;
        this.driveTargetAngle = false;
        this.followTarget = null;
    }

    /** start。 */
    start() {
        this.resolveRefs();

        const gameData = GameData.getInstance();
        this.applyCurve(gameData.MultiplierCurve);
        this.currentMultiplier = this.curve.length > 0 ? this.curve[0].m : 1;
        this.currentElapsed = this.curve.length > 0 ? this.curve[0].t : 0;
        this.targetMultiplier = this.currentMultiplier;
        this.targetElapsed = this.currentElapsed;

        gameData.on(GmaeModel.MultiplierCurve, this.onMultiplierCurve, this);
        gameData.on(GmaeModel.Multiplier, this.onMultiplier, this);
        gameData.on(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        gameData.on(GmaeModel.BettingCountdown, this.onBetting, this);
        gameData.on(GmaeModel.Explode, this.onExplode, this);
        gameData.on(GmaeModel.Settled, this.onSettled, this);

        this.syncProgressFromCurrentGameState();
        this.redraw();
        this.updateFollowTarget();
    }

    /**
     * update。
     * @param deltaTime deltaTime
     */
    update(deltaTime: number) {
        if (deltaTime <= 0) return;
        if (this.curve.length < 2) return;

        if (this.isRunning && this.predictElapsedBetweenServerTicks) {
            this.targetElapsed = Math.min(this.curveMaxT, this.targetElapsed + deltaTime);
        }

        const smooth = 1 - Math.exp(-Math.max(0, this.progressSmoothingSpeed) * deltaTime);
        const nextElapsed = this.currentElapsed + (this.targetElapsed - this.currentElapsed) * smooth;
        const nextMultiplier = this.currentMultiplier + (this.targetMultiplier - this.currentMultiplier) * smooth;

        const changed =
            Math.abs(nextElapsed - this.currentElapsed) > 0.00001 ||
            Math.abs(nextMultiplier - this.currentMultiplier) > 0.00001;
        if (changed) {
            this.currentElapsed = nextElapsed;
            this.currentMultiplier = nextMultiplier;

            if (this.showProgress || this.drawOnlyProgress) {
                this.redraw();
            }
        }
        this.updateFollowTarget(deltaTime);
    }

    /**
     * sampleByMultiplier。
     * @param multiplier multiplier
     * @returns sampleByMultiplier 回傳值
     */
    public sampleByMultiplier(multiplier: number): CurveSample | null {
        if (!this.plotArea) return null;
        if (this.curve.length < 2) return null;

        const clampedMultiplier = this.clampMultiplier(multiplier);
        const segment = this.findSegmentByMultiplier(clampedMultiplier);
        if (segment < 0) return null;

        const a = this.curve[segment];
        const b = this.curve[segment + 1];
        const mSpan = b.m - a.m;
        const ratio = Math.abs(mSpan) > 0.000001
            ? this.clamp((clampedMultiplier - a.m) / mSpan, 0, 1)
            : 0;

        const t = a.t + (b.t - a.t) * ratio;
        const localPoint = this.toLocalPoint(t, clampedMultiplier);
        const angle = this.getAngleByTime(t);
        const worldPosition = this.plotArea.convertToWorldSpaceAR(localPoint);

        return { worldPosition, angle };
    }

    /** sampleByCurrentProgress。 */
    public sampleByCurrentProgress(): { worldPosition: Vec3; angle: number } | null {
        return this.getProgressSample();
    }

    /**
     * onMultiplierCurve。
     * @param curve curve
     */
    private onMultiplierCurve(curve: MultiplierCurvePoint[]) {
        this.applyCurve(curve);
        this.targetElapsed = this.clamp(this.targetElapsed, this.curveMinT, this.curveMaxT);
        this.currentElapsed = this.clamp(this.currentElapsed, this.curveMinT, this.curveMaxT);
        this.syncProgressFromCurrentGameState();
        this.redraw();
        this.updateFollowTarget();
    }

    /**
     * onMultiplier。
     * @param multiplier multiplier
     */
    private onMultiplier(multiplier: number) {
        if (!Number.isFinite(multiplier)) return;
        this.targetMultiplier = Math.max(0, multiplier);
        this.isRunning = true;
        if (this.showProgress || this.drawOnlyProgress) {
            this.redraw();
        }
        this.updateFollowTarget();
    }

    /**
     * onRunningElapsed。
     * @param elapsed elapsed
     */
    private onRunningElapsed(elapsed: number) {
        if (!Number.isFinite(elapsed)) return;
        const scaledElapsed = elapsed * this.runningElapsedScale;
        this.targetElapsed = this.clamp(Math.max(0, scaledElapsed), this.curveMinT, this.curveMaxT);
        const pointByElapsed = this.getPointByElapsed(this.targetElapsed);
        if (pointByElapsed) {
            this.targetMultiplier = Math.max(this.targetMultiplier, pointByElapsed.m);
        }
        this.isRunning = true;
        if (this.showProgress || this.drawOnlyProgress) {
            this.redraw();
        }
        this.updateFollowTarget();
    }

    /** onBetting。 */
    private onBetting() {
        const startMultiplier = this.curve.length > 0 ? this.curve[0].m : 1;
        const startElapsed = this.curve.length > 0 ? this.curve[0].t : 0;
        this.currentMultiplier = startMultiplier;
        this.currentElapsed = startElapsed;
        this.targetMultiplier = startMultiplier;
        this.targetElapsed = startElapsed;
        this.isRunning = false;
        if (this.showProgress || this.drawOnlyProgress) {
            this.redraw();
        }
        this.updateFollowTarget(0, true);
    }

    /**
     * onExplode。
     * @param crashPoint crashPoint
     */
    private onExplode(crashPoint: number) {
        if (Number.isFinite(crashPoint)) {
            this.targetMultiplier = Math.max(0, crashPoint);
        }
        this.isRunning = false;
    }

    /** onSettled。 */
    private onSettled() {
        this.isRunning = false;
    }

    /**
     * syncProgressFromCurrentGameState。
     */
    private syncProgressFromCurrentGameState() {
        const gameData = GameData.getInstance();
        const startMultiplier = this.curve.length > 0 ? this.curve[0].m : 1;
        const startElapsed = this.curve.length > 0 ? this.curve[0].t : 0;

        if (gameData.RoundState === 'Running' || gameData.RoundState === 'Crashed') {
            const scaledElapsed = Math.max(0, gameData.RunningElapsed * this.runningElapsedScale);
            const clampedElapsed = this.clamp(scaledElapsed, this.curveMinT, this.curveMaxT);
            const pointByElapsed = this.getPointByElapsed(clampedElapsed);

            this.currentElapsed = pointByElapsed?.t ?? clampedElapsed;
            this.targetElapsed = this.currentElapsed;
            this.currentMultiplier = pointByElapsed?.m ?? startMultiplier;
            this.targetMultiplier = this.currentMultiplier;
            this.isRunning = gameData.RoundState === 'Running';
            return;
        }

        this.currentMultiplier = startMultiplier;
        this.currentElapsed = startElapsed;
        this.targetMultiplier = startMultiplier;
        this.targetElapsed = startElapsed;
        this.isRunning = false;
    }

    /** resolveRefs。 */
    private resolveRefs() {
        if (!this.graph) {
            this.graph = this.getComponent(Graphics);
        }
        if (!this.plotArea) {
            this.plotArea = this.getComponent(UITransform);
        }

        if (!this.graph && !this.warnedMissingGraph) {
            warn('[CrashCurveGraphView] Graphics 未設定，無法繪製曲線');
            this.warnedMissingGraph = true;
        }
        if (!this.plotArea && !this.warnedMissingPlotArea) {
            warn('[CrashCurveGraphView] plotArea(UITransform) 未設定，無法計算座標');
            this.warnedMissingPlotArea = true;
        }
        if (this.plotArea && !this.warnedSmallPlotArea) {
            const { width, height } = this.plotArea.contentSize;
            if (width < 150 || height < 80) {
                warn(`[CrashCurveGraphView] plotArea 尺寸偏小（${width} x ${height}），可能看起來像沒畫出來`);
                this.warnedSmallPlotArea = true;
            }
        }
    }

    /**
     * applyCurve。
     * @param curve curve
     */
    private applyCurve(curve: MultiplierCurvePoint[] | null | undefined) {
        const normalized = Array.isArray(curve)
            ? curve
                .filter((item) => Number.isFinite(item?.t) && Number.isFinite(item?.m))
                .map((item) => ({ t: Number(item.t), m: Number(item.m) }))
                .filter((item) => item.t >= 0 && item.m > 0)
                .sort((a, b) => a.t - b.t)
            : [];

        this.curve = normalized;
        this.rebuildBounds();
    }

    /** rebuildBounds。 */
    private rebuildBounds() {
        if (this.curve.length < 2) {
            this.curveMinT = 0;
            this.curveMaxT = 1;
            this.curveMinM = 0.2;
            this.curveMaxM = 1;
            this.minT = 0;
            this.maxT = 1;
            this.minMetricM = 0;
            this.maxMetricM = 1;
            return;
        }

        this.curveMinT = this.curve[0].t;
        this.curveMaxT = this.curve[this.curve.length - 1].t;

        let minM = Number.POSITIVE_INFINITY;
        let maxM = Number.NEGATIVE_INFINITY;
        for (const p of this.curve) {
            if (p.m < minM) minM = p.m;
            if (p.m > maxM) maxM = p.m;
        }
        this.curveMinM = minM;
        this.curveMaxM = maxM;

        this.minT = this.curveMinT;
        this.maxT = this.curveMaxT;
        if (this.visualMaxTimeSeconds > 0) {
            this.maxT = this.curveMinT + this.visualMaxTimeSeconds;
        }
        if (this.maxT - this.minT < 0.000001) {
            this.maxT = this.minT + 1;
        }

        const displayMinM = this.visualMinMultiplier > 0 ? this.visualMinMultiplier : this.curveMinM;
        let displayMaxM = this.visualMaxMultiplier > 0 ? this.visualMaxMultiplier : this.curveMaxM;
        if (displayMaxM - displayMinM < 0.000001) {
            displayMaxM = displayMinM + 1;
        }

        const minMetric = this.metricM(displayMinM);
        const maxMetric = this.metricM(displayMaxM);
        this.minMetricM = Math.min(minMetric, maxMetric);
        this.maxMetricM = Math.max(minMetric, maxMetric);

        if (this.maxMetricM - this.minMetricM < 0.000001) {
            this.maxMetricM = this.minMetricM + 1;
        }
    }

    /** redraw。 */
    private redraw() {
        if (!this.graph) return;

        this.graph.clear();
        if (this.curve.length < 2) {
            if (!this.warnedInsufficientCurve) {
                warn('[CrashCurveGraphView] multiplierCurve 點數不足（< 2），目前不繪製');
                this.warnedInsufficientCurve = true;
            }
            return;
        }
        this.warnedInsufficientCurve = false;

        if (this.drawOnlyProgress) {
            this.drawProgress();
            return;
        }

        this.graph.lineWidth = this.lineWidth;
        this.graph.strokeColor = this.curveColor;

        const first = this.toLocalPoint(this.curve[0].t, this.curve[0].m);
        this.graph.moveTo(first.x, first.y);
        for (let i = 1; i < this.curve.length; i++) {
            const p = this.curve[i];
            const local = this.toLocalPoint(p.t, p.m);
            this.graph.lineTo(local.x, local.y);
        }
        this.graph.stroke();

        if (!this.showProgress) return;
        this.drawProgress();
    }

    /** drawProgress。 */
    private drawProgress() {
        if (this.curve.length < 2) return;

        const progress = this.getProgressPoint();
        if (!progress) return;
        const { t: progressT, m: progressM } = progress;

        this.graph.lineWidth = Math.max(1, this.lineWidth * 0.7);
        this.graph.strokeColor = this.progressColor;

        const start = this.toLocalPoint(this.curve[0].t, this.curve[0].m);
        this.graph.moveTo(start.x, start.y);

        for (let i = 1; i < this.curve.length; i++) {
            const p = this.curve[i];
            if (p.t >= progressT) break;
            const local = this.toLocalPoint(p.t, p.m);
            this.graph.lineTo(local.x, local.y);
        }

        const current = this.toLocalPoint(progressT, progressM);
        this.graph.lineTo(current.x, current.y);

        this.graph.stroke();
    }

    /**
     * toLocalPoint。
     * @param t t
     * @param m m
     * @returns toLocalPoint 回傳值
     */
    private toLocalPoint(t: number, m: number): Vec3 {
        const width = this.plotArea.contentSize.width;
        const height = this.plotArea.contentSize.height;
        const anchor = this.plotArea.anchorPoint;

        const left = -width * anchor.x + this.paddingLeft;
        const right = width * (1 - anchor.x) - this.paddingRight;
        const bottom = -height * anchor.y + this.paddingBottom;
        const top = height * (1 - anchor.y) - this.paddingTop;

        const usableW = Math.max(1, right - left);
        const usableH = Math.max(1, top - bottom);

        const tNorm = this.clamp((t - this.minT) / (this.maxT - this.minT), 0, 1);
        const mMetric = this.metricM(Math.max(0.000001, m));
        const mNorm = this.clamp((mMetric - this.minMetricM) / (this.maxMetricM - this.minMetricM), 0, 1);

        const normX = this.swapAxes ? tNorm : mNorm;
        const normY = this.swapAxes ? mNorm : tNorm;

        const rawX = left + normX * usableW;
        const rawY = bottom + normY * usableH;
        const sx = Math.max(0.01, this.curveScaleX);
        const sy = Math.max(0.01, this.curveScaleY);

        return new Vec3(
            left + (rawX - left) * sx + this.curveOffsetX,
            bottom + (rawY - bottom) * sy + this.curveOffsetY,
            0
        );
    }

    /**
     * metricM。
     * @param m m
     * @returns metricM 回傳值
     */
    private metricM(m: number): number {
        const safeM = Math.max(0.000001, m);
        if (!this.useLogY) return safeM;
        return Math.log(safeM);
    }

    /**
     * clampMultiplier。
     * @param multiplier multiplier
     * @returns clampMultiplier 回傳值
     */
    private clampMultiplier(multiplier: number): number {
        if (this.curve.length < 1) return multiplier;
        const minM = this.curve[0].m;
        const maxM = this.curve[this.curve.length - 1].m;
        return this.clamp(multiplier, Math.min(minM, maxM), Math.max(minM, maxM));
    }

    /**
     * findSegmentByMultiplier。
     * @param multiplier multiplier
     * @returns findSegmentByMultiplier 回傳值
     */
    private findSegmentByMultiplier(multiplier: number): number {
        if (this.curve.length < 2) return -1;

        const first = this.curve[0];
        if (multiplier <= first.m) return 0;

        for (let i = 0; i < this.curve.length - 1; i++) {
            const a = this.curve[i];
            const b = this.curve[i + 1];
            const minM = Math.min(a.m, b.m);
            const maxM = Math.max(a.m, b.m);
            if (multiplier >= minM && multiplier <= maxM) {
                return i;
            }
        }

        return this.curve.length - 2;
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

    /**
     * updateFollowTarget。
     * @param deltaTime deltaTime
     * @param forceSnap forceSnap
     */
    private updateFollowTarget(deltaTime: number = 0, forceSnap: boolean = false) {
        if (!this.driveTargetByMultiplier) return;
        if (!this.followTarget) return;

        const sample = this.getProgressSample();
        if (!sample) return;

        const world = this.mapGraphWorldToTargetWorld(sample.worldPosition);
        this.setTargetByWorld(world, deltaTime, forceSnap);

        if (!this.driveTargetAngle) return;
        const t = this.clamp(this.targetAngleLerp, 0, 1);
        const current = this.followTarget.angle;
        this.followTarget.angle = current + (sample.angle - current) * t;
    }

    /**
     * getProgressSample。
     * @returns getProgressSample 回傳值
     */
    private getProgressSample(): CurveSample | null {
        if (!this.plotArea) return null;
        if (this.curve.length < 2) return null;

        const progress = this.getProgressPoint();
        if (!progress) return null;

        const segment = this.findSegmentByTime(progress.t);
        if (segment < 0) return null;

        const localPoint = this.toLocalPoint(progress.t, progress.m);
        const angle = this.getAngleByTime(progress.t);
        const worldPosition = this.plotArea.convertToWorldSpaceAR(localPoint);

        return { worldPosition, angle };
    }

    /**
     * getAngleByTime。
     * @param t t
     * @returns getAngleByTime 回傳值
     */
    private getAngleByTime(t: number): number {
        const tSpan = Math.max(0.000001, this.curveMaxT - this.curveMinT);
        const dt = Math.max(0.0005, tSpan * 0.01);
        const prev = this.getPointByElapsed(t - dt);
        const next = this.getPointByElapsed(t + dt);
        return this.getAngleFromPoints(prev, next);
    }

    private getAngleFromPoints(
        a: { t: number; m: number } | null,
        b: { t: number; m: number } | null
    ): number {
        if (!a || !b) return 0;
        const pa = this.toLocalPoint(a.t, a.m);
        const pb = this.toLocalPoint(b.t, b.m);
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) return 0;
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }

    /**
     * mapGraphWorldToTargetWorld。
     * @param graphWorldPosition graphWorldPosition
     * @returns mapGraphWorldToTargetWorld 回傳值
     */
    private mapGraphWorldToTargetWorld(graphWorldPosition: Vec3): Vec3 {
        if (!this.useCrossCameraMapping) {
            this.tmpWorld.set(graphWorldPosition);
            return this.tmpWorld;
        }
        if (!this.graphCamera || !this.targetCamera) {
            this.tmpWorld.set(graphWorldPosition);
            return this.tmpWorld;
        }

        this.graphCamera.worldToScreen(graphWorldPosition, this.tmpScreen);
        this.targetCamera.screenToWorld(this.tmpScreen, this.tmpWorld);
        return this.tmpWorld;
    }

    /**
     * setTargetByWorld。
     * @param worldPosition worldPosition
     * @param deltaTime deltaTime
     * @param forceSnap forceSnap
     */
    private setTargetByWorld(worldPosition: Vec3, deltaTime: number, forceSnap: boolean) {
        const parent = this.followTarget.parent;
        if (parent) {
            parent.inverseTransformPoint(this.tmpLocal, worldPosition);
        } else {
            this.tmpLocal.set(worldPosition);
        }

        this.tmpFollowTargetLocal.set(
            this.tmpLocal.x + this.targetOffset.x,
            this.tmpLocal.y + this.targetOffset.y,
            this.tmpLocal.z + this.targetOffset.z
        );

        const shouldSnap = forceSnap || !this.smoothTargetPosition;
        if (shouldSnap) {
            this.followTarget.setPosition(this.tmpFollowTargetLocal);
            return;
        }

        const dt = deltaTime > 0 ? deltaTime : (1 / 60);
        const speed = Math.max(0, this.targetPositionFollowSpeed);
        const t = speed > 0 ? (1 - Math.exp(-speed * dt)) : 1;

        const current = this.followTarget.position;
        const desiredX = current.x + (this.tmpFollowTargetLocal.x - current.x) * t;
        const desiredY = current.y + (this.tmpFollowTargetLocal.y - current.y) * t;
        const desiredZ = current.z + (this.tmpFollowTargetLocal.z - current.z) * t;

        const stepX = desiredX - current.x;
        const stepY = desiredY - current.y;
        const stepZ = desiredZ - current.z;
        const stepDist = Math.sqrt(stepX * stepX + stepY * stepY + stepZ * stepZ);
        const maxStep = Math.max(0, this.targetMaxMoveSpeed) * dt;

        if (stepDist <= 0.000001 || maxStep <= 0 || stepDist <= maxStep) {
            this.followTarget.setPosition(desiredX, desiredY, desiredZ);
            return;
        }

        const ratio = maxStep / stepDist;
        this.followTarget.setPosition(
            current.x + stepX * ratio,
            current.y + stepY * ratio,
            current.z + stepZ * ratio
        );
    }

    /** getProgressPoint。 */
    private getProgressPoint(): { t: number; m: number } | null {
        if (this.curve.length < 2) return null;

        const timeBased = this.useRunningElapsedProgress
            ? this.getPointByElapsed(this.currentElapsed)
            : null;
        const multiplierBased = this.getPointByMultiplier(this.currentMultiplier);

        if (timeBased && multiplierBased && this.clampProgressByMultiplier) {
            return timeBased.t <= multiplierBased.t ? timeBased : multiplierBased;
        }
        return timeBased ?? multiplierBased;
    }

    /**
     * getPointByElapsed。
     * @param elapsed elapsed
     */
    private getPointByElapsed(elapsed: number): { t: number; m: number } | null {
        if (!Number.isFinite(elapsed)) return null;
        if (this.curve.length < 2) return null;

        const clampedT = this.clamp(elapsed, this.curveMinT, this.curveMaxT);
        const segment = this.findSegmentByTime(clampedT);
        if (segment < 0) return null;

        const a = this.curve[segment];
        const b = this.curve[segment + 1];
        const dt = b.t - a.t;
        const ratio = dt > 0.000001 ? this.clamp((clampedT - a.t) / dt, 0, 1) : 0;
        const m = a.m + (b.m - a.m) * ratio;
        return { t: clampedT, m };
    }

    /**
     * getPointByMultiplier。
     * @param multiplier multiplier
     */
    private getPointByMultiplier(multiplier: number): { t: number; m: number } | null {
        if (!Number.isFinite(multiplier)) return null;
        if (this.curve.length < 2) return null;

        const clampedMultiplier = this.clampMultiplier(multiplier);
        const segment = this.findSegmentByMultiplier(clampedMultiplier);
        if (segment < 0) return null;

        const a = this.curve[segment];
        const b = this.curve[segment + 1];
        const mSpan = b.m - a.m;
        const ratio = Math.abs(mSpan) > 0.000001
            ? this.clamp((clampedMultiplier - a.m) / mSpan, 0, 1)
            : 0;
        const t = a.t + (b.t - a.t) * ratio;
        return { t, m: clampedMultiplier };
    }

    /**
     * findSegmentByTime。
     * @param t t
     * @returns findSegmentByTime 回傳值
     */
    private findSegmentByTime(t: number): number {
        if (this.curve.length < 2) return -1;
        if (t <= this.curve[0].t) return 0;

        for (let i = 0; i < this.curve.length - 1; i++) {
            const a = this.curve[i];
            const b = this.curve[i + 1];
            if (t >= a.t && t <= b.t) {
                return i;
            }
        }
        return this.curve.length - 2;
    }
}
