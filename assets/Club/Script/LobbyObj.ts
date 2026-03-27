import { _decorator, Component, Label, Button } from 'cc';
import { sp } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LobbyObj')
export class LobbyObj extends Component {
    @property({ type: Label })
    private lobbyIdLabel: Label = null;
    @property({ type: Label })
    private betRangeLabel: Label = null;
    @property({ type: Button })
    private joinBtn: Button = null;
    @property({ type: sp.Skeleton })
    private spine: sp.Skeleton = null;

    private lobbyId: string = '';
    private callback: (lobbyId: string) => void = null;

    public init(lobbyId: string, minBet: number, maxBet: number, callback: (lobbyId: string) => void) {
        this.lobbyId = lobbyId;
        this.lobbyIdLabel.string = lobbyId;
        this.betRangeLabel.string = `${minBet}~${maxBet}`;
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
        this.callback?.(this.lobbyId);
    }
}
