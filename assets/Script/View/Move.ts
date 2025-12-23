import { _decorator, Component, Node } from 'cc';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

export const enum FlyState {
    None,
    Fly,
    Reset,
}


@ccclass('Move')
export class Move extends Manager {
    public state: FlyState = FlyState.None;
    private flySpeed: number = 20;
    private resetSpeed: number = 500;
    private flyTarget: number = 5600;
    start() {

    }

    update(deltaTime: number) {
        switch (this.state) {
            case FlyState.None:
                break;
            case FlyState.Fly:
                this.Fly(deltaTime);
                break;
            case FlyState.Reset:
                this.Reset(deltaTime);
                break;
        }
    }

    private Fly(t: number) {
        const pos = this.node.getPosition();
        const x = pos.x;
        const y = pos.y + t * this.flySpeed;
        this.node.setPosition(x, y);
        if (y > this.flyTarget) {
            this.state = FlyState.None;
        }
    }

    private Reset(t: number) {
        const pos = this.node.getPosition();
        const x = pos.x;
        const y = pos.y - t * this.resetSpeed;
        if (y > 0) {
            this.node.setPosition(x, y);
        } else {
            this.state = FlyState.None;
        }
    }
}


