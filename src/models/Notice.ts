import { Label } from "@akashic-extension/akashic-label";
import { labelAutoReSizeW, newFont } from "../lib/funcs";

/**
 * 通知内容
 */
export interface NoticeContent { }

/**
 * 通知インターフェース
 */
export abstract class Notice<NoticeContent> {
  protected readonly scene: g.Scene;
  /** 通知パネル */
  public readonly display: g.E;
  private _visible: boolean = false;
  /** 表示中に次の表示をしようとした時スタックされる */
  protected stack: NoticeContent[] = [];
  /** 表示時間 */
  protected waitTime: number = 5;

  /** 表示し始めから完全に表示されるまで呼ばれる */
  protected shown: () => void;
  /** 通知パネルが完全に表示されたかどうか */
  protected isShownd: () => boolean;
  /** 非表示にし始めてから完全に隠れるまで呼ばれる */
  protected hidden: () => void;
  /** 通知パネルが完全に非表示になったかどうか */
  protected isHiddend: () => boolean;


  /** 通知が表示されているか */
  public get visible() { return this._visible; }

  constructor(scene: g.Scene) {
    this.scene = scene;
    this.display = new g.E({
      scene,
      width: g.game.width,
      height: g.game.height
    });
    this.createPanel();
  }

  /** コンストラクタから呼び出される */
  protected abstract createPanel(): void;

  /**
   * 通知表示
   * @param context 
   */
  public show(context: NoticeContent): void {
    if (!this.visible) {
      this.changeContext(context);
      this.scene.onUpdate.add(this.showing, this);
      this._visible = true;
    } else {
      this.stack.push(context);
    }
  }

  /** 通知非表示 */
  public hide() {
    if (this.visible) {
      this.scene.onUpdate.add(this.hiding, this);
      this._visible = false;
    }
  }

  /** 通知パネルを書き換える */
  protected abstract changeContext(context: NoticeContent): void;

  /**
   * 通知パネルを表示するイベント  
   * scene.onUpdate にセットされる  
   * 画面外からゆっくり表示する等
   */
  private showing(): void {
    this.shown?.();
    if (this.isShownd()) this.shownEvent();
  }

  /**
   * 通知パネルを表示し終わったら呼ばれる
   */
  protected shownEvent(): void {
    this.scene.onUpdate.remove(this.showing, this);
    this.scene.setTimeout(() => {
      this.hide();
    }, this.waitTime * 1000, this);
  }


  /**
   * 通知パネルを非表示にするイベント  
   * scene.onUpdate にセットされる  
   * 画面外へゆっくり消える等
   */
  private hiding(): void {
    this.hidden?.();
    if (this.isHiddend()) this.hiddenEvent();
  }
  /**
   * 通知パネルを非表示にし終わったら呼ばれる
   */
  protected hiddenEvent(): void {
    this.scene.onUpdate.remove(this.hiding, this);
    if (this.stack.length != 0) {
      const context = this.stack.splice(0, 1)[0];
      this.show(context);
    }
  }
}

export interface NomalNoticeContext extends NoticeContent {
  text: string;
  audio?: g.AudioAsset;
}

/**
 * ポップアップ通知用
 */
export class NomalNotice extends Notice<NomalNoticeContext> {
  /** 表示速度 */
  protected readonly speed: number = 15;
  /** 通知カード */
  protected card: g.FilledRect;
  /** テキスト */
  protected label: Label;

  protected createPanel() {
    this.card = new g.FilledRect({
      scene: this.scene,
      parent: this.display,
      cssColor: "rgba(255,255,255,0.5)",
      x: -310, y: 10,
      width: 300, height: 70
    });

    const font = newFont("sans-serif", 40);
    this.label = new Label({
      scene: this.scene,
      parent: this.card,
      x: 10, y: 10,
      width: 270,
      font,
      widthAutoAdjust: true,
      lineBreak: false,
      text: ""
    });

    this.shown = () => {
      this.card.x += this.speed;
      this.card.modified();
    }
    this.isShownd = () => this.card.x > 30;
    this.hidden = () => {
      this.card.x -= this.speed;
      this.card.modified();
    }
    this.isHiddend = () => this.card.x <= -this.card.width - 30;
  }

  protected changeContext(context: NomalNoticeContext) {
    this.label.text = context.text;
    context.audio?.play();
    labelAutoReSizeW(this.label, 270);
  }
}

/**
 * エラーメッセージ通知クラス
 */
export class ErrorNotice extends Notice<string> {
  protected waitTime = 10;
  protected speed = 15;

  private label: Label;

  protected createPanel() {
    const card = new g.FilledRect({
      scene: this.scene,
      parent: this.display,
      cssColor: "rgba(255,255,0,0.8)",
      x: 100, y: -410,
      width: 1100, height: 180
    });

    const font = newFont("sans-serif", 40, "red");
    new Label({
      scene: this.scene,
      parent: card,
      x: 10, y: 10,
      width: 1100,
      font,
      widthAutoAdjust: true,
      lineBreak: false,
      text: "サーバーインスタンスでエラーが発生しました"
    });
    this.label = new Label({
      scene: this.scene,
      parent: card,
      x: 10, y: 60,
      width: 1100,
      font: newFont("sans-serif", 25),
      widthAutoAdjust: true,
      lineBreak: false,
      text: ""
    });

    this.shown = () => {
      card.y += this.speed;
      card.modified();
    }
    this.isShownd = () => card.y > 10;
    this.hidden = () => {
      card.y -= this.speed;
      card.modified();
    }
    this.isHiddend = () => card.y <= -card.height - 10;
  }

  protected changeContext(message: string) {
    this.label.text = `${message}\nエラー内容を作者に報告してくれると助かります`;
    this.label.invalidate();
  }
}