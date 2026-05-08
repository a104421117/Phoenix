import { _decorator, Button, Component, Node, WebView, director, log, warn } from 'cc';
import { NodeSwitcher } from '../../Game.Client.Common/NodeSwitcher';
import { GameData } from '../Model/GameData';
import { GameController } from '../Controller/GameController';

const { ccclass, property } = _decorator;

enum PopupIndex {
    Settings = 0,
    Help = 1,
    BetHistory = 2,
    Audio = 3,
    Leave = 4,
    AfkMultiplier = 5,
    CrashHistory = 6,
    Afk = 7,
}

type ButtonBinding = {
    button: Button;
    handler: () => void;
};

@ccclass('GamePopupController')
export class GamePopupController extends Component {
    @property({ type: NodeSwitcher })
    private popupsSwitcher: NodeSwitcher = null;

    @property({ type: Button })
    private settingsOpenButton: Button = null;

    @property({ type: Button })
    private helpOpenButton: Button = null;

    @property({ type: Button })
    private betHistoryOpenButton: Button = null;

    @property({ type: WebView })
    private betHistoryWebView: WebView = null;

    @property({ type: Node })
    private betHistoryLoadingNode: Node = null;
    private betHistoryUrl: string = '';

    @property
    private betHistoryBridgeScheme: string = 'phoenix';

    @property({ type: Button })
    private audioOpenButton: Button = null;

    @property({ type: Button })
    private leaveOpenButton: Button = null;

    @property({ type: Button })
    private afkMultiplierOpenButton: Button = null;

    @property({ type: Button })
    private crashHistoryOpenButton: Button = null;

    @property({ type: Button })
    private afkOpenButton: Button = null;

    @property({ type: [Button] })
    private closeButtons: Button[] = [];

    @property({ type: Button })
    private backToLobbyButton: Button = null;

    private initialized: boolean = false;
    private betHistoryWebViewEventsBound: boolean = false;
    private betHistoryJsBridgeBound: boolean = false;
    private betHistoryWindowMessageBound: boolean = false;
    private betHistoryJsCallback: ((raw: string) => void) | null = null;
    private betHistoryWindowMessageHandler: ((event: MessageEvent) => void) | null = null;
    private buttonBindings: ButtonBinding[] = [];

    start() {
        this.initialize();
    }

    protected onEnable(): void {
        this.initialize();
    }

    protected onDisable(): void {
        this.unbindBetHistoryWebViewEvents();
        this.unbindBetHistoryJsBridge();
        this.unbindBetHistoryWindowMessage();
        this.setBetHistoryLoadingVisible(false);
        this.closeAll();
        this.unbindAllButtons();
        this.initialized = false;
    }

    protected onDestroy(): void {
        this.unbindBetHistoryWebViewEvents();
        this.unbindBetHistoryJsBridge();
        this.unbindBetHistoryWindowMessage();
        this.unbindAllButtons();
    }

    /** ?豲??謘????秋撒?????蹍bView ?哨?颲???????銋?*/
    public initialize() {
        if (this.initialized) {
            return;
        }

        this.ensureSwitcher();
        if (!this.popupsSwitcher) {
            return;
        }

        this.applyRuntimeConfig();
        this.bindBetHistoryWebViewEvents();
        this.bindBetHistoryJsBridge();
        this.bindBetHistoryWindowMessage();
        this.setBetHistoryLoadingVisible(false);

        const seen = new Set<Node>();
        this.bindOpenButtons(seen);
        this.bindCloseButtons(seen);
        this.bindBackToLobbyButton(seen);
        this.closeAll();
        this.initialized = true;
    }

    private applyRuntimeConfig() {
        this.betHistoryUrl = GameData.getInstance().BetHistoryUrl.trim();
    }

    private ensureSwitcher() {
        if (!this.popupsSwitcher) {
            this.popupsSwitcher = this.getComponent(NodeSwitcher);
        }
    }

    private bindOpenButtons(seen: Set<Node>) {
        this.bindOpenButtonByIndex(this.settingsOpenButton, PopupIndex.Settings, seen);
        this.bindOpenButtonByIndex(this.helpOpenButton, PopupIndex.Help, seen);
        this.bindSingleButton(this.betHistoryOpenButton, seen, () => this.onBetHistoryOpenClick());
        this.bindOpenButtonByIndex(this.audioOpenButton, PopupIndex.Audio, seen);
        this.bindOpenButtonByIndex(this.leaveOpenButton, PopupIndex.Leave, seen);
        this.bindOpenButtonByIndex(this.afkMultiplierOpenButton, PopupIndex.AfkMultiplier, seen);
        this.bindOpenButtonByIndex(this.crashHistoryOpenButton, PopupIndex.CrashHistory, seen);
        this.bindOpenButtonByIndex(this.afkOpenButton, PopupIndex.Afk, seen);
    }

    private bindOpenButtonByIndex(button: Button | null, popupIndex: number, seen: Set<Node>) {
        this.bindSingleButton(button, seen, () => this.openPopup(popupIndex));
    }

    private bindCloseButtons(seen: Set<Node>) {
        this.bindButtons(this.closeButtons, seen, () => this.closeAll());
    }

    private bindBackToLobbyButton(seen: Set<Node>) {
        this.bindSingleButton(this.backToLobbyButton, seen, () => this.onBackToLobbyClick());
    }

    private bindButtons(buttons: Button[], seen: Set<Node>, handler: () => void) {
        if (!Array.isArray(buttons) || buttons.length <= 0) {
            return;
        }

        buttons.forEach((button) => {
            this.bindSingleButton(button, seen, handler);
        });
    }

    private bindSingleButton(button: Button | null, seen: Set<Node>, handler: () => void) {
        if (!button?.node || seen.has(button.node)) {
            return;
        }
        seen.add(button.node);
        this.bindButton(button, handler);
    }

    private bindButton(button: Button, handler: () => void) {
        button.node.on(Button.EventType.CLICK, handler, this);
        this.buttonBindings.push({ button, handler });
    }

    private unbindAllButtons() {
        this.buttonBindings.forEach((binding) => {
            binding.button?.node?.off(Button.EventType.CLICK, binding.handler, this);
        });
        this.buttonBindings.length = 0;
    }

    private bindBetHistoryWebViewEvents() {
        if (this.betHistoryWebViewEventsBound || !this.betHistoryWebView?.node) return;
        this.betHistoryWebView.node.on(WebView.EventType.LOADING, this.onBetHistoryWebViewLoading, this);
        this.betHistoryWebView.node.on(WebView.EventType.LOADED, this.onBetHistoryWebViewLoaded, this);
        this.betHistoryWebView.node.on(WebView.EventType.ERROR, this.onBetHistoryWebViewError, this);
        this.betHistoryWebViewEventsBound = true;
    }

    private unbindBetHistoryWebViewEvents() {
        if (!this.betHistoryWebViewEventsBound || !this.betHistoryWebView?.node) return;
        this.betHistoryWebView.node.off(WebView.EventType.LOADING, this.onBetHistoryWebViewLoading, this);
        this.betHistoryWebView.node.off(WebView.EventType.LOADED, this.onBetHistoryWebViewLoaded, this);
        this.betHistoryWebView.node.off(WebView.EventType.ERROR, this.onBetHistoryWebViewError, this);
        this.betHistoryWebViewEventsBound = false;
    }

    /** ?秋撒? WebView ?賹? JS ?????逮tOnJSCallback???*/
    private bindBetHistoryJsBridge() {
        if (this.betHistoryJsBridgeBound || !this.betHistoryWebView) return;

        const webViewAny = this.betHistoryWebView as any;
        const scheme = this.betHistoryBridgeScheme.trim();
        if (scheme && typeof webViewAny.setJavascriptInterfaceScheme === 'function') {
            webViewAny.setJavascriptInterfaceScheme(scheme);
        }

        if (typeof webViewAny.setOnJSCallback === 'function') {
            this.betHistoryJsCallback = this.betHistoryJsCallback ?? ((raw: string) => this.onBetHistoryWebViewMessage(raw));
            webViewAny.setOnJSCallback(this.betHistoryJsCallback);
            this.betHistoryJsBridgeBound = true;
        }
    }

    /** ?秋撒???? window message????iframe/postMessage ?殷?蹓??*/
    private bindBetHistoryWindowMessage() {
        if (this.betHistoryWindowMessageBound) return;
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

        this.betHistoryWindowMessageHandler = this.betHistoryWindowMessageHandler
            ?? ((event: MessageEvent) => this.onBetHistoryWindowMessage(event));
        window.addEventListener('message', this.betHistoryWindowMessageHandler as EventListener);
        this.betHistoryWindowMessageBound = true;
    }

    private unbindBetHistoryJsBridge() {
        if (!this.betHistoryJsBridgeBound || !this.betHistoryWebView) return;
        const webViewAny = this.betHistoryWebView as any;
        if (typeof webViewAny.setOnJSCallback === 'function') {
            webViewAny.setOnJSCallback(null);
        }
        this.betHistoryJsBridgeBound = false;
    }

    private unbindBetHistoryWindowMessage() {
        if (!this.betHistoryWindowMessageBound) return;
        if (typeof window === 'undefined' || typeof window.removeEventListener !== 'function') return;
        if (!this.betHistoryWindowMessageHandler) return;

        window.removeEventListener('message', this.betHistoryWindowMessageHandler as EventListener);
        this.betHistoryWindowMessageBound = false;
    }

    private onBetHistoryOpenClick() {
        this.openPopup(PopupIndex.BetHistory);
        this.openBetHistoryWebPage();
    }

    /** ?????????????????????????伍瘣?鞈?????怨?謒芷????哨?颲??*/
    private openBetHistoryWebPage() {
        const url = this.betHistoryUrl.trim();
        if (!this.betHistoryWebView || !url) {
            warn('[GamePopupController] BetHistory WebView/url not set, close BetHistory popup.');
            this.setBetHistoryLoadingVisible(false);
            this.closeBetHistoryPopup();
            return;
        }

        this.betHistoryWebView.node.active = true;
        this.betHistoryWebView.enabled = true;
        this.prepareBetHistoryWebViewInput();
        this.setBetHistoryLoadingVisible(true);
        this.betHistoryWebView.url = '';
        this.scheduleOnce(() => {
            if (!this.betHistoryWebView) return;
            this.betHistoryWebView.url = url;
            this.prepareBetHistoryWebViewInput();
        }, 0);
    }

    private onBetHistoryWebViewLoading(_: WebView, url?: string) {
        if (this.tryHandleBetHistoryBridgeUrl(url)) {
            return;
        }
        this.setBetHistoryLoadingVisible(true);
    }

    private onBetHistoryWebViewLoaded() {
        this.setBetHistoryLoadingVisible(false);
        this.injectBetHistoryPostMessageForwarder();
        this.prepareBetHistoryWebViewInput();
    }

    private onBetHistoryWebViewError() {
        this.setBetHistoryLoadingVisible(false);
        this.closeBetHistoryPopup();
    }

    private onBetHistoryWindowMessage(event: MessageEvent) {
        const accepted = this.isBetHistoryMessageOrigin(event.origin);
        log('[GamePopupController] BetHistory window.message origin:', event.origin, 'accepted:', accepted, 'data:', event.data);
        if (!accepted) {
            return;
        }
        this.onBetHistoryWebViewMessage(event.data);
    }

    public onBetHistoryWebViewMessage(raw: unknown) {
        log('[GamePopupController] BetHistory JS callback message:', raw);
        this.tryHandleBetHistoryPayload(raw);
    }

    private tryHandleBetHistoryBridgeUrl(url?: string): boolean {
        if (!url) return false;
        const scheme = this.betHistoryBridgeScheme.trim();
        if (!scheme) return false;
        const prefix = `${scheme}://`;
        if (!url.startsWith(prefix)) return false;

        const rawPayload = decodeURIComponent(url.slice(prefix.length));
        return this.tryHandleBetHistoryPayload(rawPayload);
    }

    private tryHandleBetHistoryPayload(raw: unknown): boolean {
        const data = this.parseBetHistoryPayload(raw);
        log('[GamePopupController] BetHistory parsed payload:', data);
        if (!data || data.type !== 'close') return false;

        this.setBetHistoryLoadingVisible(false);
        this.closeBetHistoryPopup();
        return true;
    }

    private parseBetHistoryPayload(raw: unknown): { type?: string } | null {
        if (raw && typeof raw === 'object') {
            const obj = raw as Record<string, unknown>;
            if (typeof obj.type === 'string') {
                return obj as { type?: string };
            }
            if ('data' in obj) {
                return this.parseBetHistoryPayload(obj.data);
            }
            if ('payload' in obj) {
                return this.parseBetHistoryPayload(obj.payload);
            }
            return null;
        }
        if (typeof raw !== 'string') return null;
        const text = raw.trim();
        if (!text) return null;
        try {
            return JSON.parse(text) as { type?: string };
        } catch {
            return null;
        }
    }

    private isBetHistoryMessageOrigin(origin: string): boolean {
        if (!origin || origin === 'null') {
            return true;
        }
        const expectedOrigin = this.getBetHistoryOrigin();
        if (!expectedOrigin) return true;
        return origin === expectedOrigin;
    }

    private getBetHistoryOrigin(): string | null {
        const url = this.betHistoryUrl.trim();
        if (!url || typeof window === 'undefined' || !window?.location?.href) {
            return null;
        }
        try {
            return new URL(url, window.location.href).origin;
        } catch {
            return null;
        }
    }

    private injectBetHistoryPostMessageForwarder() {
        if (!this.betHistoryWebView) return;
        const scheme = this.betHistoryBridgeScheme.trim();
        if (!scheme) return;
        if (!this.canInjectBetHistoryForwarder()) {
            return;
        }

        const webViewAny = this.betHistoryWebView as any;
        if (typeof webViewAny.evaluateJS !== 'function') return;

        const script = `
            (function () {
                if (window.__phoenixPostMessageForwarderInstalled) return;
                window.__phoenixPostMessageForwarderInstalled = true;
                var scheme = ${JSON.stringify(scheme)};
                window.addEventListener('message', function (event) {
                    try {
                        var raw = event ? event.data : null;
                        var payload = typeof raw === 'string' ? raw : JSON.stringify(raw);
                        if (!payload) return;
                        window.location.href = scheme + '://' + encodeURIComponent(payload);
                    } catch (e) {
                        // ?寡???伍赤??芰??蹓???????嚗???                    }
                }, false);
            })();
        `;
        try {
            webViewAny.evaluateJS(script);
        } catch (error) {
            warn('[GamePopupController] WebView evaluateJS failed:', error);
        }
    }

    private canInjectBetHistoryForwarder(): boolean {
        if (typeof window === 'undefined' || !window?.location?.href) {
            return true;
        }

        const targetUrl = this.betHistoryWebView?.url?.trim();
        if (!targetUrl) return false;

        try {
            const targetOrigin = new URL(targetUrl, window.location.href).origin;
            return targetOrigin === window.location.origin;
        } catch {
            return false;
        }
    }

    /** ??WebView DOM ???????????橫??? Cocos UI ??????????綜等???*/
    private prepareBetHistoryWebViewInput() {
        if (!this.betHistoryWebView?.node) {
            return;
        }

        const webViewNode = this.betHistoryWebView.node;
        const parent = webViewNode.parent;
        if (parent) {
            webViewNode.setSiblingIndex(parent.children.length - 1);
        }

        const element = this.getBetHistoryWebElement();
        if (!element) {
            return;
        }

        element.style.pointerEvents = 'auto';
        element.style.zIndex = '2147483646';
        if (element.parentElement) {
            element.parentElement.style.pointerEvents = 'auto';
            element.parentElement.style.zIndex = '2147483646';
        }
    }

    private getBetHistoryWebElement(): HTMLElement | null {
        const webViewAny = this.betHistoryWebView as any;
        const impl = webViewAny?._impl;
        const candidates = [
            impl?._iframe,
            impl?._webview,
            impl?._webviewElement,
            webViewAny?._iframe,
            webViewAny?._webview,
        ];

        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'object' && 'style' in candidate) {
                return candidate as HTMLElement;
            }
        }

        return null;
    }

    private setBetHistoryLoadingVisible(visible: boolean) {
        if (!this.betHistoryLoadingNode) return;
        this.betHistoryLoadingNode.active = visible;
    }

    private closeBetHistoryPopup() {
        if (this.popupsSwitcher?.Index === PopupIndex.BetHistory) {
            this.popupsSwitcher.switch(-1);
        }
    }

    private openPopup(index: number) {
        if (!this.popupsSwitcher) {
            return;
        }
        if (index !== PopupIndex.BetHistory) {
            this.setBetHistoryLoadingVisible(false);
        }
        this.popupsSwitcher.switch(index);
    }

    public closeAll() {
        if (!this.popupsSwitcher) {
            return;
        }
        this.setBetHistoryLoadingVisible(false);
        this.popupsSwitcher.switch(-1);
    }

    /** ?蹓鳴 room.leave???賹?擗?? RoomScene??*/
    /** 觸發 room.leave 並切回 RoomScene；先 navigate 再 emit，room.leave 推播由 RoomSceneManager 接。 */
    private onBackToLobbyClick() {
        if (!GameController.getInstance().canLeaveRoom()) {
            return;
        }
        GameController.getInstance().leaveRoom();
        this.navigateToRoomScene();
    }

    private navigateToRoomScene() {
        this.closeAll();
        director.loadScene('RoomScene');
    }
}
