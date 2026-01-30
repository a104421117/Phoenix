import { _decorator, Component, Node, Button, Label, EventHandler } from 'cc';
import { BaseModel } from './BaseModel';

const { ccclass, property } = _decorator;

/**
 * 數字選擇器
 * 以陣列 index 為主，+/- 切換值
 */
@ccclass('NumberSelector')
export class NumberSelector extends Component {

    @property({ type: [Number], tooltip: '可選數值陣列' })
    private values: number[] = [10, 50, 100, 500, 1000, 5000];

    @property({ tooltip: '初始 index' })
    private defaultIndex: number = 0;

    @property({ tooltip: '是否循環選擇' })
    private loop: boolean = false;

    @property({ type: Button })
    private minusBtn: Button = null;

    @property({ type: Button })
    private plusBtn: Button = null;

    @property({ type: Label })
    private valueLabel: Label = null;

    @property({ type: [EventHandler], tooltip: '值變化回調' })
    private onValueChanged: EventHandler[] = [];

    private _currentIndex: number = 0;

    // ===== Getters =====

    /** 當前 index */
    public get currentIndex(): number {
        return this._currentIndex;
    }

    /** 當前值 */
    public get currentValue(): number {
        return this.values[this._currentIndex] ?? 0;
    }

    /** 是否在最小值 */
    public get isMin(): boolean {
        return this._currentIndex <= 0;
    }

    /** 是否在最大值 */
    public get isMax(): boolean {
        return this._currentIndex >= this.values.length - 1;
    }

    // ===== Setting =====

    /** 設置可選值陣列 */
    public set Values(vals: number[]) {
        this.values = vals;
        this.reset();
    }

    // ===== Lifecycle =====

    protected onLoad(): void {
        this._currentIndex = Math.min(this.defaultIndex, this.values.length - 1);
        this._setupListeners();
    }

    protected start(): void {
        this._updateDisplay();
    }

    private _setupListeners(): void {
        this.minusBtn?.node.on('click', this._onMinusClick, this);
        this.plusBtn?.node.on('click', this._onPlusClick, this);
    }

    // ===== Event Handlers =====

    private _onMinusClick(): void {
        this.decrease();
    }

    private _onPlusClick(): void {
        this.increase();
    }

    // ===== Public Methods =====

    /** 增加 index */
    public increase(): boolean {
        if (this._currentIndex < this.values.length - 1) {
            this._currentIndex++;
            this._onIndexChanged();
            return true;
        } else if (this.loop) {
            this._currentIndex = 0;
            this._onIndexChanged();
            return true;
        }
        return false;
    }

    /** 減少 index */
    public decrease(): boolean {
        if (this._currentIndex > 0) {
            this._currentIndex--;
            this._onIndexChanged();
            return true;
        } else if (this.loop) {
            this._currentIndex = this.values.length - 1;
            this._onIndexChanged();
            return true;
        }
        return false;
    }

    /** 設置 index */
    public setIndex(index: number, triggerCallback: boolean = true): void {
        const newIndex = Math.max(0, Math.min(index, this.values.length - 1));
        if (newIndex !== this._currentIndex) {
            this._currentIndex = newIndex;
            if (triggerCallback) {
                this._onIndexChanged();
            } else {
                this._updateDisplay();
            }
        }
    }

    /** 設置值（找到對應 index） */
    public setValue(value: number, triggerCallback: boolean = true): boolean {
        const index = this.values.indexOf(value);
        if (index !== -1) {
            this.setIndex(index, triggerCallback);
            return true;
        }
        return false;
    }

    /** 設置可選值陣列 */
    public setValues(values: number[], resetIndex: boolean = true): void {
        this.values = values;
        if (resetIndex) {
            this._currentIndex = 0;
        } else {
            this._currentIndex = Math.min(this._currentIndex, values.length - 1);
        }
        this._updateDisplay();
    }

    /** 重置到默認 index */
    public reset(): void {
        this._currentIndex = Math.min(this.defaultIndex, this.values.length - 1);
        this._updateDisplay();
    }

    /** 設置是否可交互 */
    public setInteractable(enabled: boolean): void {
        if (this.minusBtn) this.minusBtn.interactable = enabled;
        if (this.plusBtn) this.plusBtn.interactable = enabled;
    }

    // ===== Private Methods =====

    private _onIndexChanged(): void {
        this._updateDisplay();
        this._emitValueChanged();
    }

    private _updateDisplay(): void {
        // 更新數值顯示
        if (this.valueLabel) {
            const valueStr = BaseModel.getFormatNum(this.currentValue);
            this.valueLabel.string = valueStr;
        }

        // 更新按鈕狀態（非循環模式）
        if (!this.loop) {
            if (this.minusBtn) {
                this.minusBtn.interactable = !this.isMin;
            }
            if (this.plusBtn) {
                this.plusBtn.interactable = !this.isMax;
            }
        }
    }

    private _emitValueChanged(): void {
        EventHandler.emitEvents(this.onValueChanged, this.currentValue, this._currentIndex);
    }
}
