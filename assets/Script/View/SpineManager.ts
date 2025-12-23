import { _decorator, Component, Node, sp, Vec2, Vec3 } from 'cc';
import { getInstance, Manager } from '../../lib/BaseManager';
import { Move, FlyState } from './Move';
const { ccclass, property } = _decorator;

export const enum PhoenixState {
    None,
    Egg,
    Move,
    Fly,
    Die
}


@ccclass('SpineManager')
export class SpineManager extends Manager {
    private state: PhoenixState = PhoenixState.None;
    public set State(state: PhoenixState) {
        switch (state) {
            case PhoenixState.None:
                break;
            case PhoenixState.Egg:
                break;
            case PhoenixState.Move:
                this.PhoenixInit();
                break;
            case PhoenixState.Fly:
                getInstance(Move).state = FlyState.Fly;
                break;
            case PhoenixState.Die:
                break;
        }
        this.state = state;
    }
    @property({ type: sp.Skeleton }) private egg: sp.Skeleton;
    @property({ type: sp.Skeleton }) private Phoenix: sp.Skeleton;
    @property({ type: sp.Skeleton }) private feather: sp.Skeleton;
    @property({ type: sp.Skeleton }) private Start: sp.Skeleton;

    start() {
        let self = this;
        this.Start.setCompleteListener(() => {
            self.closeStart();
        })
        this.closeEgg();
        this.closePhoenix();
        this.closeStart();
    }

    update(deltaTime: number) {
        switch (this.state) {
            case PhoenixState.None:
                break;
            case PhoenixState.Egg:
                break;
            case PhoenixState.Move:
                this.PhoenixMove(deltaTime);
                break;
            case PhoenixState.Fly:
                this.PhoenixFly(deltaTime);
                break;
            case PhoenixState.Die:
                break;
        }
    }

    eggIdle(): void {
        this.egg.enabled = true;
        this.egg.setAnimation(0, "start", false);
        this.egg.addAnimation(0, "idle", true);
    }

    eggDie(): void {
        this.egg.enabled = true;
        this.egg.setAnimation(0, "die", false);
    }

    closeEgg(): void {
        this.egg.enabled = false;
    }

    private closeStart(): void {
        this.Start.enabled = false;
    }

    private PhoenixInit(): void {
        this.Phoenix.node.setPosition(this.moveInit.x, this.moveInit.y);
        this.Phoenix.node.setRotationFromEuler(this.eulerInit.x, this.eulerInit.y, this.eulerInit.z);
        this.Phoenix.enabled = true;
        this.Start.setAnimation(0, "StarGane-VFX", false);
        this.Start.enabled = true;
        this.Phoenix.setAnimation(0, "fly", true);
    }

    private moveInit: Vec2 = new Vec2(-800, -145);
    private moveTaget = -300;
    private moveSpeed = 100;
    private PhoenixMove(t: number): void {
        const pos = this.Phoenix.node.getPosition();
        const x = pos.x + t * this.moveSpeed;
        const y = pos.y;

        if (x > this.moveTaget) {
            this.State = PhoenixState.Fly;
        } else {
            this.Phoenix.node.setPosition(x, y);
        }
    }

    private eulerInit = new Vec3(0, 0, 0);
    private eulerTaget = 90;
    private eulerSpeed: number = 1;

    private flyTaget = 200;
    private flySpeed = 10;

    // private targetQuat: Quat = new Quat();

    private PhoenixFly(t: number): void {
        const euler = this.Phoenix.node.eulerAngles;
        const eulerX = euler.x;
        const eulerY = euler.y;
        const eulerZ = euler.z + t * this.eulerSpeed;

        const pos = this.Phoenix.node.getPosition();
        const flyX = pos.x + t * this.flySpeed;
        const flyY = pos.y;

        if (eulerZ <= this.eulerTaget) {
            this.Phoenix.node.setRotationFromEuler(eulerX, eulerY, eulerZ);
        }

        if (flyX <= this.flyTaget) {
            this.Phoenix.node.setPosition(flyX, flyY);
        }

        if (flyX > this.flyTaget && eulerZ > this.eulerTaget) {
            this.State = PhoenixState.None;
        }
    }

    closePhoenix(): void {
        this.Phoenix.enabled = false;
    }
}


