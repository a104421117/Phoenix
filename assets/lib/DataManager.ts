import { _decorator, CCFloat, Label } from "cc";

const { ccclass, property } = _decorator;
/**倒數 */
type Countdown = {
    /**開始 */
    start(): void;
    /**停止 */
    stop(): void;
}

export class Base {
    /**
     * 倒數函式
     * @param onTick 更新callback
     * @param onComplete 結束callback
     * @param duration 結束時間
     * @param tickTime 更新頻率(秒)
     * @returns 
     */
    public static createCountdown(onTick: Function, onComplete: Function, duration: number, tickTime: number = 1): Countdown {
        let timerId = null;

        function tick() {
            duration--;
            if (duration <= 0) {
                clearInterval(timerId);
                timerId = null;
                if (onComplete) onComplete();
                return;
            }
            if (onTick) onTick(duration);
        }

        return {
            start(): void {
                if (timerId !== null) return; // 避免重複啟動
                timerId = setInterval(tick, tickTime * 1000);
            },
            stop(): void {
                clearInterval(timerId);
                timerId = null;
            }
        };
    }
}

@ccclass('ArtWord')
export class ArtWord extends Label {
    fontMap: {
        1: "01"
        2: "23"
        3: "45"
        4: "67"
        5: "89"
        6: ":;"
        7: "<="
        8: ">?"
        9: "@A"
        0: "BC"
    }
    startChar: string = "0";
    /**
     * 初始化字型
     * @param fontWidth 字寬
     * @param count 數量
     * @param map 字串
     * @param startChar ASCII中的初始文字
     */
    initFontMap(fontWidth: number, count: number, map: number[], startChar: string = "0") {

    }
    addFontMap(fontWidth: number, count: number) {

    }

    @property({ type: CCFloat, readonly: true }) Num: number = 0;
    get NumStr() {
        let numberStr = "";
        for (let i = 0; i < this.Thousandth.length; i++) {
            let str = this.fontMap[this.Thousandth[i]];
            numberStr += str;
        }
        return numberStr;
    }
    get Thousandth() {
        return this.Num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    setThousandthNum(num: number = this.Num) {
        if (num !== this.Num) this.Num = num;
        this.string = this.Thousandth;
    }
}