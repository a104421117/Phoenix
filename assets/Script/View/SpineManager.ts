import { _decorator, Component, Node, sp } from 'cc';
import { Manager } from '../../lib/BaseManager';
const { ccclass, property } = _decorator;

@ccclass('SpineManager')
export class SpineManager extends Manager {
    @property({ type: sp.Skeleton }) private egg: sp.Skeleton;
    @property({ type: sp.Skeleton }) private Phoenix: sp.Skeleton;
    @property({ type: sp.Skeleton }) private feather: sp.Skeleton;
    @property({ type: sp.Skeleton }) private skeleton: sp.Skeleton;

    start() {
        // this.eggIdle();
        this.closeEgg();
        this.closePhoenix();
    }

    update(deltaTime: number) {

    }

    eggIdle(): void {
        this.egg.node.active = true;
        this.egg.setAnimation(0, "start", false);
        this.egg.addAnimation(0, "idle", true);
    }

    eggDie(): void {
        this.egg.node.active = true;
        this.egg.setAnimation(0, "die", false);
    }

    closeEgg(): void {
        this.egg.node.active = false;
    }

    PhoenixFly(): void {
        this.Phoenix.node.active = true;
        this.Phoenix.setAnimation(0, "fly", true);
    }

    PhoenixMove(t: number): void {
        if (t < 1) {
            const pos = this.Phoenix.node.getPosition();
            const x = -800 + t * (800 - 300);
            this.Phoenix.node.setPosition(x, pos.y);
        }
    }

    closePhoenix(): void {
        this.Phoenix.node.active = false;
    }
}


