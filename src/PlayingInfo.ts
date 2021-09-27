import { Label } from "@akashic-extension/akashic-label";
import { Font } from "@akashic/akashic-engine";
import { Jigsaw } from "./Jigsaw";
import { labelAutoReSizeH, labelAutoReSizeW, newFont } from "./lib/funcs";
import { StopWatch } from "./models/StopWatch";
import { PieceScene } from "./PieceScene";

/**
 * 経過時間やスコア等表示するレイヤー
 */
export class PlayingInfo {
  private readonly jigsaw: Jigsaw;

  /** 情報を表示するレイヤー */
  public display: g.E;

  /** ストップウォッチ */
  private stopWatch: StopWatch;
  public stopTimer() { this.stopWatch.stop(); }
  public get time() { return this.stopWatch.ElapsedTime_HMS; }

  // =============================== ピース完成率 ===============================
  private readonly _pieceFont: Font;
  private readonly _pieceLabel: Label;
  private readonly _pieceChange: (t: string) => void;
  // =============================== 経過時間 ===============================
  private readonly _timeFont: Font;
  private readonly _timeLabel: Label;
  private readonly _timeChange: (t: string) => void;
  // =============================== スコアボード ===============================
  /** 表示するスコアボードの人数 */
  private readonly _scoreLength = 5;
  /** スコアボードの１人分の高さ */
  private readonly _scoreHeight = 40;
  /** スコア用レイヤー */
  private readonly _scoreFont: Font;
  private readonly _nameLabels: Label[];
  private readonly _scoreChanges: ((name: string, score: number) => void)[];
  // 自分のスコア
  private readonly _myFont: Font;
  private readonly _myLabel: Label;
  private readonly _myChange: (name: string, score: number) => void;

  constructor(scene: PieceScene, title: string) {
    this.jigsaw = scene.jigsaw;

    this.display = new g.FilledRect({
      scene,
      cssColor: "rgba(255,255,255,0.5)",
      width: 300,
      height: 410,
      x: 950,
      y: 10,
    });
    this.stopWatch = new StopWatch(scene);
    this.stopWatch.start();

    // ================================== タイトル ==================================
    const titleLabel = new Label({
      scene,
      parent: this.display,
      font: newFont("sans-serif", 40),
      text: title,
      widthAutoAdjust: true,
      lineBreak: false,
      width: 280, height: 40,
      // x: 10, y: 10,
      x: 150, y: 30,
      anchorX: 0.5,
      anchorY: 0.5,
    });
    labelAutoReSizeW(titleLabel, 270);
    // ================================== ピース ==================================
    this._pieceFont = newFont("sans-serif", 30);
    this._pieceLabel = new Label({
      scene,
      parent: this.display,
      font: this._pieceFont,
      text: "0%　0/0",
      textAlign: "right",
      width: 290, height: 40,
      x: 0, y: 80,
    });
    this._pieceChange = t => {
      this._pieceLabel.text = t;
      this._pieceLabel.invalidate();
    }
    // ================================== 経過時間 ==================================
    this._timeFont = newFont("sans-serif", 30);
    this._timeLabel = new Label({
      scene,
      parent: this.display,
      font: this._timeFont,
      text: "0分0秒",
      textAlign: "right",
      width: 270, height: 40,
      x: 10, y: 120,
    });
    this._timeChange = t => {
      this._timeLabel.text = t;
      this._timeLabel.invalidate();
    }
    // ================================== スコア ==================================
    this._nameLabels = new Array(this._scoreLength);
    this._scoreChanges = new Array(this._scoreLength);
    this._scoreLength = 5;
    this._scoreFont = newFont("sans-serif", 30);
    for (let i = 0; i < this._scoreLength; i++) {
      let nl = new Label({
        scene,
        parent: this.display,
        font: this._scoreFont,
        text: "",
        width: 200, height: 170,
        x: 10, y: 160 + i * this._scoreHeight,
      });
      this._nameLabels[i] = nl;
      /** スコアの方 */
      let sl = new Label({
        scene,
        parent: this.display,
        font: this._scoreFont,
        text: "",
        textAlign: "right",
        width: 60, height: 170,
        x: 210, y: this._nameLabels[i].y,
      });
      this._scoreChanges[i] = (name, score) => {
        nl.text = name;
        nl.scale(1);
        labelAutoReSizeH(nl, 200, this._scoreHeight);
        sl.text = score + "";
        sl.invalidate();
      }
    }
    // 自分の名前
    this._myFont = newFont("sans-serif", 30, "#7345ff");
    this._myLabel = new Label({
      scene,
      parent: this.display,
      font: this._myFont,
      text: "",
      width: 200,
      x: 10, y: this._nameLabels[this._scoreLength - 1].y + this._scoreHeight,
    });
    labelAutoReSizeH(this._myLabel, 200, this._scoreHeight);
    /** 自分のスコア */
    let mySLavel = new Label({
      scene,
      parent: this.display,
      font: this._myFont,
      text: "",
      textAlign: "right",
      width: 60,
      x: 210, y: this._nameLabels[this._scoreLength - 1].y + this._scoreHeight,
    });
    this._myChange = (name, score) => {
      if (name != this._myLabel.text) {
        this._myLabel.text = name;
        this._myLabel.scale(1);
        labelAutoReSizeH(this._myLabel, 200, this._scoreHeight);
      }
      mySLavel.text = score + "";
      mySLavel.invalidate();
    }

    /* 追っかけ再生（g.game.onSkipping: True）についてのメモ
     * スキップ中に onUpdate が呼ばれるのは、グローバルイベントが存在したフレーブだけ
     * グローバルが無いフレームでは呼ばれないので、 cnt が狂う
     */

    // 普通の時の情報更新
    let cnt = 0;
    const nomalUpdate = () => {
      if (cnt++ == g.game.fps) {    // １秒に１回更新
        cnt = 0;
        this.update();
      }
    };
    // スキップ中の情報更新
    let beforeMinutes = 0;
    const skipUpdate = () => {
      const nowMinutes = Math.floor(this.stopWatch.ElapsedTime / 60) % 60;
      if (nowMinutes - beforeMinutes >= 3) {  // 前回より３分経過していたら更新(少し曖昧)
        beforeMinutes = nowMinutes;
        this.update();
      }
    }
    if (g.game.isSkipping)
      scene.onUpdate.add(skipUpdate);
    else
      scene.onUpdate.add(nomalUpdate);

    g.game.onSkipChange.add(isSkip => {
      if (isSkip) {
        scene.onUpdate.remove(nomalUpdate);
        scene.onUpdate.add(skipUpdate);
      } else {
        scene.onUpdate.remove(skipUpdate);
        scene.onUpdate.add(nomalUpdate);
      }
    });
  }

  /**
   * 表示を更新する
   */
  public update() {
    // インフォ非表示中はアップデートを省略する
    if (!this.display.visible()) return;

    // パズルの完成率と ハマったピース数／全ピース数
    const fit = this.jigsaw.fitCount;
    const max = this.jigsaw.pieces.length;
    const per = this.jigsaw.fitPer;
    const time = this.time;

    this._pieceChange(`${per}％　${`000${fit}`.slice(-(max + "").length)}/${max}`);
    // this._timeChange(`${sw.time} 秒`);
    if (time.h < 1) {
      this._timeChange(`${time.m}分${time.s}秒`);
    } else {
      this._timeChange(`${time.h}時${time.m}分${time.s}秒`);
    }
    // スコアボード
    for (let i = 0; i < this._scoreLength; i++) {
      let p = this.jigsaw.players[i];
      if (p == undefined) break;
      this._scoreChanges[i](p.name, p.score);
    }
    // 自分
    if (!!this.jigsaw.me)
      this._myChange(this.jigsaw.me.name, this.jigsaw.me.score);
  }
}
