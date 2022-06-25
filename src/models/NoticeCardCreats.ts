import { Label } from "@akashic-extension/akashic-label";
import { newFont } from "../lib/funcs";
import { NoticeCard, NoticeCardState } from "./notice";

export abstract class NoticeCardTemplate implements NoticeCard {
  protected abstract font: g.Font;
  protected abstract cardMoveSpeed: number;
  protected abstract displayMargin: number;

  protected _scene: g.Scene;
  protected _state: NoticeCardState = NoticeCardState.Waiting;
  protected _audio?: g.AudioAsset;

  public display: g.E;
  public onOpened: () => {};
  public onClosed: () => {};

  public get state() { return this._state; }

  public open(): void {
    this._state = NoticeCardState.Opening;
    this._scene.onUpdate.add(this.displaying, this);
  };

  public close(): void {
    this._state = NoticeCardState.Closing;
    this._scene.onUpdate.add(this.closing, this);
  };

  public constructor(scene: g.Scene, text: string, audio?: g.AudioAsset) {
    this._scene = scene;
    this._audio = audio;

    this.setDisplay(text);
  }

  protected abstract setDisplay(text: string): void;
  protected abstract makeVisible(): void;
  protected abstract makeHide(): void;
  protected abstract complateVisible(): boolean;
  protected abstract complateHide(): boolean;

  private displaying(): void {
    this.makeVisible();

    // 完全に表示しきれたか
    if (this.complateVisible()) {
      this._state = NoticeCardState.Displaying;
      this._scene.onUpdate.remove(this.displaying, this);
      this._audio?.play();
      this.onOpened();
    }
  };

  private closing(): void {
    this.makeHide();

    // 完全に非表示にしきれたか
    if (this.complateHide()) {
      this._state = NoticeCardState.EndOfDisplay;
      this._scene.onUpdate.remove(this.closing, this);
      this.onClosed();
    }
  }
}

export class NormalNoticeCard extends NoticeCardTemplate {
  protected font = newFont("sans-serif", 40);
  protected cardMoveSpeed = 15;
  protected displayMargin = 30;

  protected setDisplay(text: string): void {
    this.font = newFont("sans-serif", 40);
    this.display = new g.FilledRect({
      scene: this._scene,
      cssColor: "rgba(255,255,255,0.5)",
      x: -310, y: 10,
      width: 300, height: 70
    });

    new Label({
      scene: this._scene,
      parent: this.display,
      x: 10, y: 10,
      width: 270,
      font: this.font,
      widthAutoAdjust: true,
      lineBreak: false,
      text
    });
  }
  protected makeVisible(): void {
    this.display.x += this.cardMoveSpeed;
    this.display.modified();
  }
  protected makeHide(): void {
    this.display.x -= this.cardMoveSpeed;
    this.display.modified();
  }
  protected complateVisible(): boolean {
    return this.display.x > this.displayMargin;
  }
  protected complateHide(): boolean {
    return this.display.x < -this.display.width - this.displayMargin;
  }
}

export class ErrorNoticeCard extends NoticeCardTemplate {
  protected font = newFont("sans-serif", 40, "red");
  protected cardMoveSpeed = 15;
  protected displayMargin = 10;

  protected setDisplay(text: string): void {
    this.font = newFont("sans-serif", 40, "red");
    this.display = new g.FilledRect({
      scene: this._scene,
      parent: this.display,
      cssColor: "rgba(255,255,0,0.8)",
      x: 100, y: -410,
      width: 1100, height: 180
    });

    new Label({
      scene: this._scene,
      parent: this.display,
      x: 10, y: 10,
      width: 1100,
      font: this.font,
      widthAutoAdjust: true,
      lineBreak: false,
      text: "サーバーインスタンスでエラーが発生しました"
    });
    new Label({
      scene: this._scene,
      parent: this.display,
      x: 10, y: 60,
      width: 1100,
      font: newFont("sans-serif", 25),
      widthAutoAdjust: true,
      lineBreak: false,
      text: `${text}\nこのメッセージの見えるスクショを@mujurin_2525に報告してくれると助かります`
    });
  }
  protected makeVisible(): void {
    this.display.y += this.cardMoveSpeed;
    this.display.modified();
  }
  protected makeHide(): void {
    this.display.y -= this.cardMoveSpeed;
    this.display.modified();
  }
  protected complateVisible(): boolean {
    return this.display.y > this.displayMargin;
  }
  protected complateHide(): boolean {
    return this.display.y < -this.display.height - this.displayMargin;
  }
}
