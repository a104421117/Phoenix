import { _decorator, Component, Node } from 'cc';
import { BaseModel } from '../../Base/BaseModel';
const { ccclass, property } = _decorator;

@ccclass('PopupsManager')
export class PopupsManager extends BaseModel.Singleton<PopupsManager> {

    @property({ type: Object(BaseModel.Page) })
    private settingPage: BaseModel.Page = null;

    @property({ type: Object(BaseModel.Page) })
    private helpPage: BaseModel.Page = null;

    @property({ type: Object(BaseModel.Page) })
    private betHistoryPage: BaseModel.Page = null;

    @property({ type: Object(BaseModel.Page) })
    private audioSettingPage: BaseModel.Page = null;

    @property({ type: Object(BaseModel.Page) })
    private leavePage: BaseModel.Page = null;

    @property({ type: Object(BaseModel.Page) })
    private numSetPage: BaseModel.Page = null;

    @property({ type: Object(BaseModel.Page) })
    private multipleHistoryPage: BaseModel.Page = null;

    @property({ type: Object(BaseModel.Page) })
    private AFKPage: BaseModel.Page = null;

    start() {
        this.settingPage.init();
        this.helpPage.init();
        this.betHistoryPage.init();
        this.audioSettingPage.init();
        this.leavePage.init();
        this.numSetPage.init();
        this.multipleHistoryPage.init();
        this.AFKPage.init();
    }

    update(deltaTime: number) {

    }
}


