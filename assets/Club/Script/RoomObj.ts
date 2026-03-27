import { _decorator, Component, Label, Button } from 'cc';
import { sp } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RoomObj')
export class RoomObj extends Component {
    @property({ type: Label })
    private roomIdLabel: Label = null;
    @property({ type: Label })
    private playerCountLabel: Label = null;
    @property({ type: Button })
    private joinBtn: Button = null;
    @property({ type: sp.Skeleton })
    private spine: sp.Skeleton = null;

    private roomId: string = '';
    private callback: (roomId: string) => void = null;

    public init(roomId: string, playerCount: number, maxPlayers: number, callback: (roomId: string) => void) {
        this.roomId = roomId;
        this.roomIdLabel.string = roomId;
        this.playerCountLabel.string = `${playerCount}/${maxPlayers}`;
        this.callback = callback;
        this.joinBtn.node.on(Button.EventType.CLICK, this.onJoin, this);
        this.spine.setAnimation(0, 'table_crash_phoenix_idle', true);
        this.node.active = true;
    }

    public reset() {
        this.joinBtn.node.off(Button.EventType.CLICK, this.onJoin, this);
        this.spine.setCompleteListener(null);
        this.callback = null;
        this.node.active = false;
    }

    private onJoin() {
        this.joinBtn.interactable = false;
        this.spine.setAnimation(0, 'table_crash_phoenix_play', true);
        this.callback?.(this.roomId);
    }
}
