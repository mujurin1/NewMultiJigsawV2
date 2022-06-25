/** 通知カードの状態の列挙型 */
export const NoticeCardState = {
  /** 表示されるのを待機している */
  Waiting: "waiting",
  /** 表示されようとしている（表示アニメーション中） */
  Opening: "opening",
  /** 表示中 */
  Displaying: "displaying",
  /** 非表示にされようとしている（非表示アニメーション中） */
  Closing: "closing",
  /** 表示終了 */
  EndOfDisplay: "endOfDisplay",
} as const;
export type NoticeCardState = typeof NoticeCardState[keyof typeof NoticeCardState];



// 表示時間　5秒


/**
 * 通知カードインターフェース
 */
export interface NoticeCard {
  /** 通知の表示エンティティ */
  readonly display: g.E;
  /** 通知の表示状態を取得します */
  readonly state: NoticeCardState;
  /** 通知が表示状態になったら呼ばれる関数をセットします */
  onOpened: () => void;
  /** 通知が非表示状態になったら呼ばれる関数をセットします */
  onClosed: () => void;

  /**
   * 通知を表示します
   */
  open(): void;
  /**
   * 通知を非表示にします
   */
  close(): void;
}

/**
 * 通知ビューア
 * 
 * 通知カードの管理・表示を行う
 */
export class NoticeViewer {
  private readonly _scene: g.Scene;
  /** 通知カードの配列 */
  private readonly _noticeCards: NoticeCard[] = [];
  /** 通知の表示を停止しているか */
  private _isStoping: boolean;
  /** 通知が表示される時間（ミリ秒） */
  private displayTime: number;

  /** 表示エンティティ */
  public readonly display: g.E;
  /** 通知の表示を停止しているか */
  public get isStoping() { return this._isStoping; }

  /**
   * コンストラクタ
   * @param scene シーン
   * @param displayTime 通知が表示される時間（ミリ秒）
   */
  public constructor(scene: g.Scene, displayTime: number) {
    if (displayTime < 0) displayTime = 0;

    this._scene = scene;
    this.displayTime = displayTime;
    this.display = new g.E({
      scene,
      width: g.game.width,
      height: g.game.height
    });
  }

  /**
   * 通知カードを追加します\
   * 追加された通知カードは順次表示されます
   * @param card 通知カード
   */
  public addNoticeCard(card: NoticeCard) {
    this._noticeCards.push(card);
    card.onOpened = () => this.openedCard(card);
    card.onClosed = () => this.closedCard(card);

    if (this._noticeCards.every(card => card.state === NoticeCardState.Waiting)) {
      this.openNoticeCard();
    }
  }

  /** 次の通知カードを表示します */
  private openNoticeCard() {
    const card = this._noticeCards.find(card => card.state === NoticeCardState.Waiting);
    if (card == null)
      return;

    this.openCard(card);
  }

  /**
   * 通知の表示を停止します\
   * 現在表示中の通知は非表示になります
   */
  public stop() {
    if (this._isStoping) return;
    this._isStoping = true;

    // 現在表示中のカードを非表示にする
    this._noticeCards.forEach(card => {
      if (card.state === NoticeCardState.Displaying)
        this.closeCard(card);
    });
  }

  /** 通知の表示を再開します */
  public resume() {
    if (!this._isStoping) return;
    this._isStoping = false;

    this.openNoticeCard();
  }

  /**
   * 通知カードが表示状態になったら呼ばれる
   * @param card 表示状態になった通知カード
   */
  private openedCard(card: NoticeCard) {
    // displayTime 秒後に非表示にする
    this._scene.setTimeout(() => {
      this.closeCard(card);
    }, this.displayTime, this);
  }

  /**
   * 通知カードが非表示状態になったら呼ばれる
   * @param card 非表示状態になった通知カード
   */
  private closedCard(card: NoticeCard) {
    // if(card.state === NoticeCardState.EndOfDisplay)
    //   return;

    const idx = this._noticeCards.findIndex(c => c === card);
    if (idx === -1) return;

    this.display.remove(card.display);
    this._noticeCards.splice(idx, 1);

    if (this._isStoping || this._noticeCards.length === 0)
      return;

    this.openNoticeCard();
  }

  /**
   * 通知カードを表示状態にします
   * @param card 表示する通知カード
   */
  private openCard(card: NoticeCard): void {
    if (card.state !== NoticeCardState.Waiting) return;

    this.display.append(card.display);
    card.open();
  }

  /**
   * 通知カードを非表示状態にします
   * @param card 非表示にする通知カード
   */
  private closeCard(card: NoticeCard): void {
    if (card.state !== NoticeCardState.Displaying) return;

    card.close();
  }
}





















// export interface NoticeContent { }
// /**
//  * 通知基底クラス
//  */
// export abstract class Notice<NoticeContent> {
//   protected readonly scene: g.Scene;
//   /** 通知を表示するエンティティ */
//   public readonly display: g.E;
//   private _visible: boolean = false;
//   /** 表示中に次の表示をしようとした時スタックされる */
//   protected stack: NoticeContent[] = [];
//   /** 表示時間 */
//   protected waitTime: number = 5;

//   /** 表示し始めから完全に表示されるまで呼ばれる */
//   protected shown: () => void;
//   /** 通知パネルが完全に表示されたかどうか */
//   protected isShownd: () => boolean;
//   /** 非表示にし始めてから完全に隠れるまで呼ばれる */
//   protected hidden: () => void;
//   /** 通知パネルが完全に非表示になったかどうか */
//   protected isHiddend: () => boolean;


//   /** 通知が表示されているか */
//   public get visible() { return this._visible; }

//   constructor(scene: g.Scene) {
//     this.scene = scene;
//     this.display = new g.E({
//       scene,
//       width: g.game.width,
//       height: g.game.height
//     });
//     this.createPanel();
//   }

//   /** コンストラクタから呼び出される */
//   protected abstract createPanel(): void;

//   /**
//    * 通知を追加して、順番が来たら表示します
//    * @param context
//    */
//   public addNotice(context: NoticeContent): void {
//     if (!this.visible) {
//       this.changeContext(context);
//       this.scene.onUpdate.add(this.showingEvent, this);
//       this._visible = true;
//     } else {
//       this.stack.push(context);
//     }
//   }

//   /** 表示されている通知を消します */
//   public hideDisplaingNotice() {
//     if (this.visible) {
//       this.scene.onUpdate.add(this.hidingEvent, this);
//       this._visible = false;
//     }
//   }

//   /** 通知パネルを書き換える */
//   protected abstract changeContext(context: NoticeContent): void;

//   /**
//    * 通知パネルを表示するイベント\
//    * scene.onUpdate にセットされる\
//    * 画面外からゆっくり表示する等
//    */
//   private showingEvent(): void {
//     this.shown?.();
//     if (this.isShownd()) this.shownEvent();
//   }

//   /**
//    * 通知パネルを表示し終わったら呼ばれる
//    */
//   protected shownEvent(): void {
//     this.scene.onUpdate.remove(this.showingEvent, this);
//     this.scene.setTimeout(() => {
//       this.hideDisplaingNotice();
//     }, this.waitTime * 1000, this);
//   }


//   /**
//    * 通知パネルを非表示にするイベント\
//    * scene.onUpdate にセットされる\
//    * 画面外へゆっくり消える等
//    */
//   private hidingEvent(): void {
//     this.hidden?.();
//     if (this.isHiddend()) this.hiddenEvent();
//   }
//   /**
//    * 通知パネルを非表示にし終わったら呼ばれる
//    */
//   protected hiddenEvent(): void {
//     this.scene.onUpdate.remove(this.hidingEvent, this);
//     if (this.stack.length != 0) {
//       const context = this.stack.splice(0, 1)[0];
//       this.addNotice(context);
//     }
//   }
// }

// export interface NomalNoticeContext extends NoticeContent {
//   text: string;
//   audio?: g.AudioAsset;
// }

// /**
//  * ポップアップ通知用
//  */
// export class NomalNotice extends Notice<NomalNoticeContext> {
//   /** 表示速度 */
//   protected readonly speed: number = 15;
//   /** 通知カード */
//   protected card: g.FilledRect;
//   /** テキスト */
//   protected label: Label;

//   protected createPanel() {
//     this.card = new g.FilledRect({
//       scene: this.scene,
//       parent: this.display,
//       cssColor: "rgba(255,255,255,0.5)",
//       x: -310, y: 10,
//       width: 300, height: 70
//     });

//     const font = newFont("sans-serif", 40);
//     this.label = new Label({
//       scene: this.scene,
//       parent: this.card,
//       x: 10, y: 10,
//       width: 270,
//       font,
//       widthAutoAdjust: true,
//       lineBreak: false,
//       text: ""
//     });

//     this.shown = () => {
//       this.card.x += this.speed;
//       this.card.modified();
//     }
//     this.isShownd = () => this.card.x > 30;
//     this.hidden = () => {
//       this.card.x -= this.speed;
//       this.card.modified();
//     }
//     this.isHiddend = () => this.card.x <= -this.card.width - 30;
//   }

//   protected changeContext(context: NomalNoticeContext) {
//     this.label.text = context.text;
//     context.audio?.play();
//     labelAutoReSizeW(this.label, 270);
//   }
// }

// /**
//  * エラーメッセージ通知クラス
//  */
// export class ErrorNotice extends Notice<string> {
//   protected waitTime = 10;
//   protected speed = 15;

//   private label: Label;

//   protected createPanel() {
//     const card = new g.FilledRect({
//       scene: this.scene,
//       parent: this.display,
//       cssColor: "rgba(255,255,0,0.8)",
//       x: 100, y: -410,
//       width: 1100, height: 180
//     });

//     const font = newFont("sans-serif", 40, "red");
//     new Label({
//       scene: this.scene,
//       parent: card,
//       x: 10, y: 10,
//       width: 1100,
//       font,
//       widthAutoAdjust: true,
//       lineBreak: false,
//       text: "サーバーインスタンスでエラーが発生しました"
//     });
//     this.label = new Label({
//       scene: this.scene,
//       parent: card,
//       x: 10, y: 60,
//       width: 1100,
//       font: newFont("sans-serif", 25),
//       widthAutoAdjust: true,
//       lineBreak: false,
//       text: ""
//     });

//     this.shown = () => {
//       card.y += this.speed;
//       card.modified();
//     }
//     this.isShownd = () => card.y > 10;
//     this.hidden = () => {
//       card.y -= this.speed;
//       card.modified();
//     }
//     this.isHiddend = () => card.y <= -card.height - 10;
//   }

//   protected changeContext(message: string) {
//     this.label.text = `${message}\nエラー内容を作者に報告してくれると助かります`;
//     this.label.invalidate();
//   }
// }