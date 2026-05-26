import { _decorator, Color, Component, Graphics, UITransform, Vec3, warn } from 'cc';
import { GameData } from '../Model/GameData';
import { GmaeModel, RoundState } from '../Model/GameData';
import { type CrashMultiplierCurvePointContract } from '../Model/WebsocketManager';
const { ccclass, property } = _decorator;

/** CurveSample 型別定義。 */
type CurveSample = {
    worldPosition: Vec3;
    angle: number;
};

/**
 * 鳳凰曲線單一來源（pending modularize）：
 *   - 持有曲線資料 + 兩段式時間映射 + 內插 + slope 計算 + 繪圖
 *   - 對外暴露 query API（realToCurveT、getCurvePoint*、getCurveSlope、sampleBy*）給 PhoenixController 等消費者
 *   - 未來抽 module 時把這些 query 跟資料整段挪到 PhoenixCurve.ts，view 只留繪圖
 */
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

    /** 進度線尾端圓形標記半徑（像素，<=0 代表不畫）。 */
    @property({ tooltip: '進度線尾端圓形標記半徑（像素，<=0 代表不畫）' })
    private progressHeadRadius: number = 8;

    /** 進度線尾端圓形顏色（預設橘）。 */
    @property({ type: Color, tooltip: '進度線尾端圓形顏色' })
    private progressHeadColor: Color = new Color(255, 165, 0, 255);

    /** 是否僅繪製目前進度（不先畫整條曲線）。 */
    @property({ tooltip: '是否僅繪製目前進度（不先畫整條曲線）' })
    private drawOnlyProgress: boolean = true;

    /** 進度優先使用 server runningElapsed。 */
    @property({ tooltip: '進度優先使用 server runningElapsed' })
    private useRunningElapsedProgress: boolean = true;

    /** 進度追蹤平滑速度（越大越貼近 server，建議 8~16）。 */
    @property({ tooltip: '進度追蹤平滑速度（越大越貼近 server）', range: [8, 16, 1], slide: true })
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

    /* ===== 鳳凰飛行曲線設計常數（見 phoenix_curve_guide.md）===== */
    private static readonly FAST_TARGET_CURVE = 137;
    private static readonly MAX_CURVE = 158;
    private static readonly MAX_MULT = 1500;

    /* ===== 預設曲線（20 節點，server 未提供時 fallback）===== */
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

    /* ===== 曲線資料 ===== */
    private curve: CrashMultiplierCurvePointContract[] = [...CrashCurveGraphView.DEFAULT_MULTIPLIER_CURVE];
    /** 由曲線各段斜率推導出的 slope 範圍（給 PhoenixController 用來算飛行角度）。 */
    private curveSlopeMin: number = 0;
    private curveSlopeMax: number = 1;

    /* ===== 動畫狀態（view 自留：current 緩動趨近 target，由 server event 推進 target）===== */
    private currentMultiplier: number = 1;
    private currentElapsed: number = 0;
    private targetMultiplier: number = 1;
    private targetElapsed: number = 0;

    /* ===== 顯示用邊界（curve data + view config，redraw 用）===== */
    private minT: number = 0;
    private maxT: number = 1;
    private minMetricM: number = 0;
    private maxMetricM: number = 1;

    private warnedMissingGraph: boolean = false;
    private warnedMissingPlotArea: boolean = false;
    private warnedSmallPlotArea: boolean = false;
    private warnedInsufficientCurve: boolean = false;

    start() {
        this.resolveRefs();
        this.applyCurve(this.curve);
        this.syncProgressFromCurrentGameState();

        GameData.getInstance().onGameState(GmaeModel.MultiplierCurve, this.onMultiplierCurve, this);
        GameData.getInstance().onGameState(GmaeModel.Multiplier, this.onMultiplier, this);
        GameData.getInstance().onGameState(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().onGameState(GmaeModel.BettingCountdown, this.onBetting, this);
        GameData.getInstance().onGameState(GmaeModel.Settled, this.onSettled, this);

        this.redraw();
    }

    protected onDestroy(): void {
        GameData.getInstance().offGameState(GmaeModel.MultiplierCurve, this.onMultiplierCurve, this);
        GameData.getInstance().offGameState(GmaeModel.Multiplier, this.onMultiplier, this);
        GameData.getInstance().offGameState(GmaeModel.RunningElapsed, this.onRunningElapsed, this);
        GameData.getInstance().offGameState(GmaeModel.BettingCountdown, this.onBetting, this);
        GameData.getInstance().offGameState(GmaeModel.Settled, this.onSettled, this);
    }

    /** 每幀做動畫平滑（current 緩動趨近 target）。target 只由 server event 推進，不做本地預測。 */
    update(deltaTime: number) {
        if (deltaTime <= 0) return;
        if (this.curve.length < 2) return;
        if (this.shouldHideCurve()) {
            this.clearGraph();
            return;
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
    }

    /* ===== 對外 query API（曲線 / 時間映射 / 內插 / slope）===== */

    public get MaxCurve(): number { return CrashCurveGraphView.MAX_CURVE; }
    public get MaxMult(): number { return CrashCurveGraphView.MAX_MULT; }

    /** 快段結束實際秒（nodes[length/4].t，預設 3.0）。 */
    public get FastEnd(): number {
        return this.curve.length >= 2
            ? this.curve[Math.floor(this.curve.length / 4)].t
            : 0;
    }

    /** 慢段結束實際秒（nodes[length/2].t，預設 32.0）。 */
    public get SlowEnd(): number {
        return this.curve.length >= 2
            ? this.curve[Math.floor(this.curve.length / 2)].t
            : 0;
    }

    /**
     * 兩段式時間映射：實際秒數 → 曲線秒數。
     *   - 快段（0 ~ FastEnd）：壓縮成 0 ~ FAST_TARGET_CURVE
     *   - 慢段（FastEnd ~ SlowEnd）：拉伸成 FAST_TARGET_CURVE ~ MAX_CURVE
     *   - 鎖定（realT > SlowEnd）：固定 MAX_CURVE
     */
    public realToCurveT(realT: number): number {
        const fastEnd = this.FastEnd;
        const slowEnd = this.SlowEnd;
        if (realT <= 0 || fastEnd <= 0 || slowEnd <= fastEnd) return 0;

        if (realT <= fastEnd) {
            return realT * (CrashCurveGraphView.FAST_TARGET_CURVE / fastEnd);
        }

        if (realT <= slowEnd) {
            const slowDur = slowEnd - fastEnd;
            return CrashCurveGraphView.FAST_TARGET_CURVE
                + (CrashCurveGraphView.MAX_CURVE - CrashCurveGraphView.FAST_TARGET_CURVE) * (realT - fastEnd) / slowDur;
        }

        return CrashCurveGraphView.MAX_CURVE;
    }

    /** 取曲線資料的時間/倍率邊界（純資料邊界，不含 view 視覺裁切）。 */
    public getCurveBounds(): { minT: number; maxT: number; minM: number; maxM: number } {
        if (this.curve.length < 2) return { minT: 0, maxT: 1, minM: 0.2, maxM: 1 };
        let minM = Number.POSITIVE_INFINITY;
        let maxM = Number.NEGATIVE_INFINITY;
        for (const p of this.curve) {
            if (p.m < minM) minM = p.m;
            if (p.m > maxM) maxM = p.m;
        }
        return { minT: this.curve[0].t, maxT: this.curve[this.curve.length - 1].t, minM, maxM };
    }

    /** 用曲線秒數線性內插得到 (t, m)。 */
    public getCurvePointByCurveT(curveT: number): { t: number; m: number } | null {
        if (this.curve.length < 2) return null;
        const minT = this.curve[0].t;
        const maxT = this.curve[this.curve.length - 1].t;
        const clampedT = Math.max(minT, Math.min(maxT, curveT));
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

    /** 反向：用倍率反推曲線上對應的 (t, m)。 */
    public getCurvePointByMultiplier(multiplier: number): { t: number; m: number } | null {
        if (this.curve.length < 2) return null;
        const firstM = this.curve[0].m;
        const lastM = this.curve[this.curve.length - 1].m;
        const lo = Math.min(firstM, lastM);
        const hi = Math.max(firstM, lastM);
        const clampedM = Math.max(lo, Math.min(hi, multiplier));
        const idx = this.findSegmentByMultiplier(clampedM);
        if (idx < 0) return null;
        const a = this.curve[idx];
        const b = this.curve[idx + 1];
        const mSpan = b.m - a.m;
        const ratio = Math.abs(mSpan) > 0.000001 ? (clampedM - a.m) / mSpan : 0;
        return { t: a.t + (b.t - a.t) * ratio, m: clampedM };
    }

    /** 用實際秒數一次拿到 { curveT, multiplier }；超過 SlowEnd 鎖在 MAX_MULT。 */
    public getCurvePointAtRealT(realT: number): { curveT: number; multiplier: number } {
        const curveT = this.realToCurveT(realT);
        if (curveT >= CrashCurveGraphView.MAX_CURVE) {
            return { curveT, multiplier: CrashCurveGraphView.MAX_MULT };
        }
        const point = this.getCurvePointByCurveT(curveT);
        return { curveT, multiplier: point?.m ?? 0 };
    }

    /**
     * 取得 multiplier 所在曲線段的「標準化斜率」（0~1）。
     * PhoenixController 拿這個值對應到自己的角度範圍。
     */
    public getCurveSlope(multiplier: number): number | null {
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
            return Math.max(0, Math.min(1, (slope - this.curveSlopeMin) / slopeSpan));
        }
        return slope > 0 ? 1 : 0;
    }

    /* ===== 對外 sample API（PhoenixController 用來把鳳凰擺在曲線上）===== */

    public sampleByMultiplier(multiplier: number): CurveSample | null {
        if (!this.plotArea) return null;
        const point = this.getCurvePointByMultiplier(multiplier);
        if (!point) return null;
        const local = this.toLocalPoint(point.t, point.m);
        const angle = this.getAngleByTime(point.t);
        return { worldPosition: this.plotArea.convertToWorldSpaceAR(local), angle };
    }

    public sampleByCurrentProgress(): CurveSample | null {
        return this.getProgressSample();
    }

    public sampleByElapsed(elapsedSeconds: number): CurveSample | null {
        if (!this.plotArea) return null;
        const point = this.getCurvePointByCurveT(elapsedSeconds);
        if (!point) return null;
        const local = this.toLocalPoint(point.t, point.m);
        const angle = this.getAngleByTime(point.t);
        return { worldPosition: this.plotArea.convertToWorldSpaceAR(local), angle };
    }

    /* ===== Event handlers ===== */

    private onMultiplierCurve(curve: CrashMultiplierCurvePointContract[]) {
        this.applyCurve(curve);
        const bounds = this.getCurveBounds();
        this.targetElapsed = this.clamp(this.targetElapsed, bounds.minT, bounds.maxT);
        this.currentElapsed = this.clamp(this.currentElapsed, bounds.minT, bounds.maxT);
        this.syncProgressFromCurrentGameState();
        this.redraw();
    }

    private onMultiplier(multiplier: number) {
        if (!Number.isFinite(multiplier)) return;
        this.targetMultiplier = Math.max(0, multiplier);
        if (this.shouldHideCurve()) {
            this.clearGraph();
            return;
        }
        if (this.showProgress || this.drawOnlyProgress) {
            this.redraw();
        }
    }

    private onRunningElapsed(elapsed: number) {
        if (!Number.isFinite(elapsed)) return;
        const realT = Math.max(0, elapsed);
        const curveT = this.realToCurveT(realT);
        const bounds = this.getCurveBounds();
        this.targetElapsed = this.clamp(curveT, bounds.minT, bounds.maxT);
        const point = this.getCurvePointByCurveT(curveT);
        if (point && Number.isFinite(point.m) && point.m > 0) {
            this.targetMultiplier = Math.max(this.targetMultiplier, point.m);
        }
        if (this.shouldHideCurve()) {
            this.clearGraph();
            return;
        }
        if (this.showProgress || this.drawOnlyProgress) {
            this.redraw();
        }
    }

    private onBetting() {
        const startMultiplier = this.curve.length > 0 ? this.curve[0].m : 1;
        const startElapsed = this.curve.length > 0 ? this.curve[0].t : 0;
        this.currentMultiplier = startMultiplier;
        this.currentElapsed = startElapsed;
        this.targetMultiplier = startMultiplier;
        this.targetElapsed = startElapsed;
        this.clearGraph();
    }

    private onSettled() {
        this.targetMultiplier = Math.max(0, this.currentMultiplier);
    }

    /** 從目前 GameData 狀態同步動畫狀態（場景進入時、曲線更新時呼叫）。 */
    private syncProgressFromCurrentGameState() {
        const gameData = GameData.getInstance();
        const startMultiplier = this.curve.length > 0 ? this.curve[0].m : 1;
        const startElapsed = this.curve.length > 0 ? this.curve[0].t : 0;

        if (gameData.RoundState === RoundState.Running || gameData.RoundState === RoundState.Crashed) {
            const bounds = this.getCurveBounds();
            const clampedT = this.clamp(Math.max(0, gameData.RunningElapsed), bounds.minT, bounds.maxT);
            const point = this.getCurvePointByCurveT(clampedT);
            this.currentElapsed = point?.t ?? clampedT;
            this.targetElapsed = this.currentElapsed;
            this.currentMultiplier = point?.m ?? startMultiplier;
            this.targetMultiplier = this.currentMultiplier;
            return;
        }

        this.currentMultiplier = startMultiplier;
        this.currentElapsed = startElapsed;
        this.targetMultiplier = startMultiplier;
        this.targetElapsed = startElapsed;
    }

    /* ===== 曲線資料管理（normalize / bounds / slope）===== */

    /** server 推來的曲線經 normalize + 重算 slope/bounds 後存進 this.curve；無效資料 fallback DEFAULT。 */
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
            : [...CrashCurveGraphView.DEFAULT_MULTIPLIER_CURVE];

        this.rebuildSlopeRange();
        this.rebuildDisplayBounds();
    }

    /** 算各段 (m_{i+1} - m_i) / (t_{i+1} - t_i) 的 min/max，給 getCurveSlope normalize 用。 */
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

    /* ===== 繪圖相關 ===== */

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

    /** 把「曲線資料邊界」與「view 視覺設定」合成成 toLocalPoint 用的 minT/maxT/minMetricM/maxMetricM。 */
    private rebuildDisplayBounds() {
        const bounds = this.getCurveBounds();

        this.minT = bounds.minT;
        this.maxT = this.visualMaxTimeSeconds > 0 ? bounds.minT + this.visualMaxTimeSeconds : bounds.maxT;
        if (this.maxT - this.minT < 0.000001) this.maxT = this.minT + 1;

        const displayMinM = this.visualMinMultiplier > 0 ? this.visualMinMultiplier : bounds.minM;
        let displayMaxM = this.visualMaxMultiplier > 0 ? this.visualMaxMultiplier : bounds.maxM;
        if (displayMaxM - displayMinM < 0.000001) displayMaxM = displayMinM + 1;

        const minMetric = this.metricM(displayMinM);
        const maxMetric = this.metricM(displayMaxM);
        this.minMetricM = Math.min(minMetric, maxMetric);
        this.maxMetricM = Math.max(minMetric, maxMetric);
        if (this.maxMetricM - this.minMetricM < 0.000001) this.maxMetricM = this.minMetricM + 1;
    }

    private redraw() {
        if (!this.graph) return;

        this.graph.clear();
        if (this.shouldHideCurve()) return;
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
        const points = this.curve.map((p) => this.toLocalPoint(p.t, p.m));
        this.strokeSmoothPath(points);

        if (!this.showProgress) return;
        this.drawProgress();
    }

    private shouldHideCurve(): boolean {
        return GameData.getInstance().RoundState === RoundState.Betting;
    }

    private clearGraph() {
        if (!this.graph) return;
        this.graph.clear();
    }

    private drawProgress() {
        if (this.curve.length < 2) return;

        const progress = this.getProgressPoint();
        if (!progress) return;
        const { t: progressT, m: progressM } = progress;

        this.graph.lineWidth = Math.max(1, this.lineWidth * 0.7);
        this.graph.strokeColor = this.progressColor;

        const visible: Vec3[] = [];
        for (let i = 0; i < this.curve.length; i++) {
            if (this.curve[i].t >= progressT) break;
            visible.push(this.toLocalPoint(this.curve[i].t, this.curve[i].m));
        }
        const endPoint = this.toLocalPoint(progressT, progressM);
        this.strokeSmoothPath(visible, endPoint);

        // 進度線尾端畫實心圓當作當前倍數的標記
        if (this.progressHeadRadius > 0) {
            this.graph.fillColor = this.progressHeadColor;
            this.graph.circle(endPoint.x, endPoint.y, this.progressHeadRadius);
            this.graph.fill();
        }
    }

    /**
     * 用 quadratic bezier 平滑連接一串 local points。
     *   - 每個內部節點當 control point、與下一節點的 midpoint 當 endpoint
     *   - 視覺上曲線通過「midpoints」而不是「原始節點」，但形狀貼合且平滑（無轉折角）
     *   - endPoint：可選的尾端額外點（progress 線用）
     */
    private strokeSmoothPath(points: Vec3[], endPoint?: Vec3) {
        if (points.length === 0) {
            if (!endPoint) return;
            this.graph.moveTo(endPoint.x, endPoint.y);
            this.graph.stroke();
            return;
        }

        this.graph.moveTo(points[0].x, points[0].y);

        if (points.length === 1) {
            if (endPoint) this.graph.lineTo(endPoint.x, endPoint.y);
            this.graph.stroke();
            return;
        }

        for (let i = 1; i < points.length - 1; i++) {
            const mx = (points[i].x + points[i + 1].x) * 0.5;
            const my = (points[i].y + points[i + 1].y) * 0.5;
            this.graph.quadraticCurveTo(points[i].x, points[i].y, mx, my);
        }

        const last = points[points.length - 1];
        if (endPoint) {
            this.graph.quadraticCurveTo(last.x, last.y, endPoint.x, endPoint.y);
        } else {
            this.graph.lineTo(last.x, last.y);
        }

        this.graph.stroke();
    }

    /** (t, m) → 繪圖區內的本地座標 (Vec3)。 */
    private toLocalPoint(t: number, m: number): Vec3 {
        const width = this.plotArea.contentSize.width;
        const height = this.plotArea.contentSize.height;
        const anchor = this.plotArea.anchorPoint;

        const left = -width * anchor.x;
        const bottom = -height * anchor.y;

        const tNorm = this.clamp((t - this.minT) / (this.maxT - this.minT), 0, 1);
        const mMetric = this.metricM(Math.max(0.000001, m));
        const mNorm = this.clamp((mMetric - this.minMetricM) / (this.maxMetricM - this.minMetricM), 0, 1);

        const normX = this.swapAxes ? tNorm : mNorm;
        const normY = this.swapAxes ? mNorm : tNorm;

        return new Vec3(
            left + normX * width,
            bottom + normY * height,
            0
        );
    }

    /** 倍率軸的視覺度量（linear 或 log）。屬於 view 視覺設定。 */
    private metricM(m: number): number {
        const safeM = Math.max(0.000001, m);
        if (!this.useLogY) return safeM;
        return Math.log(safeM);
    }

    /** 取得當前進度點：預設用 currentElapsed 反查曲線，否則用 currentMultiplier 反查。 */
    private getProgressPoint(): { t: number; m: number } | null {
        if (this.curve.length < 2) return null;
        if (this.useRunningElapsedProgress) {
            return this.getCurvePointByCurveT(this.currentElapsed);
        }
        return this.getCurvePointByMultiplier(this.currentMultiplier);
    }

    private getProgressSample(): CurveSample | null {
        if (!this.plotArea) return null;
        const progress = this.getProgressPoint();
        if (!progress) return null;
        const local = this.toLocalPoint(progress.t, progress.m);
        const angle = this.getAngleByTime(progress.t);
        return { worldPosition: this.plotArea.convertToWorldSpaceAR(local), angle };
    }

    /** 取得曲線在 t 處的本地切線角度（需要 toLocalPoint 才能算，留在 view）。 */
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

    private clamp(value: number, min: number, max: number): number {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
}
