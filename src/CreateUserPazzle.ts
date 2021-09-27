import { Label, LabelParameterObject } from "@akashic-extension/akashic-label";
import { SceneEx } from "./eoc/SceneEx";
import { Action, ActionData } from "./eoc/Server";
import { JoinPlayer } from "./events/player";
import { ChangePage, ChangePageParam, Edit, EditParam, ShareImage, ShareImageParam } from "./events/userPazzle";
import { addDragDrop, base64ToArrayBuffer, ConvertBase64, createFillLabel, newFont, removeDropFile, spriteSet } from "./lib/funcs";
import { decode } from "./lib/jpeg/decoder";
import { CutParam } from "./lib/pieceCut";
import { BitmapImage } from "./models/BitmapImage";
import { GameParams } from "./params";
import { Slider } from "./models/Slider";
import { StrokeRect } from "./models/StrokeRect";

export class CreatePuzzle {
  private readonly scene: SceneEx;

  private readonly start: (value: CutParam) => void;
  private readonly back: () => void;

  public readonly display: g.E;

  private shareBtn: g.FilledRect;

  private previewPanel: g.FilledRect;
  private preview: g.E;
  private dropData: ShareImageParam;
  /** パズルになる領域を表示する */
  private border: StrokeRect;

  // ピース編集情報
  private size: g.CommonSize = { width: 0, height: 0 };
  private count: g.CommonOffset = { x: 0, y: 0 };
  private sum: number = 0;
  /** 実際のパズルのサイズ */
  private puzzleSize: g.CommonSize = { width: 0, height: 0 };
  /** 元絵から、パズルにする領域の原点 */
  private puzzleOrigin: g.CommonOffset = { x: 0, y: 0 };

  /**
   * 0: 総数   "ピース数 XXX枚"
   * 1: 行列数 "行 XX枚  列 XX枚"
   * 2: サイズ "縦 XX  横 XX"
   */
  private readonly pieceInfoLabel: Label[] = new Array(3);

  constructor(scene: SceneEx, start: (value: CutParam) => void, back: () => void) {
    this.scene = scene;
    this.start = start;
    this.back = back;
    this.display = new g.E({
      scene,
      width: g.game.width,
      height: g.game.height
    });
    this.previewPanel = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "rgba(0,0,0)",
      width: 770, height: 460,
      x: 25, y: 35,
    });
    new Label({
      scene,
      parent: this.previewPanel,
      font: newFont("sans-serif", 50, "white"),
      text: "ここに画像をD&Dしてください\n（生主のみ可能です）",
      width: this.previewPanel.width,
      x: 20, y: 200
    });

    this.EditInfo();

    if (GameParams.isOwner) {
      addDragDrop(e => this.onDragDrop(e));
      this.LiverOnlyUI();
    }

    scene.addReceiveMethod(ChangePage.receive(this.ChangePage), this);
    scene.addReceiveMethod(ShareImage.receive(this.ShareImage), this);
    scene.addReceiveMethod(Edit.receive(this.Edit), this);
  }

  /** ページ遷移 */
  private ChangePage(e: ActionData<ChangePageParam>) {
    removeDropFile();
    this.display.destroy();
    this.scene.removeReceiveMethod(ChangePage.receive(this.ChangePage), this);
    this.scene.removeReceiveMethod(ShareImage.receive(this.ShareImage), this);
    this.scene.removeReceiveMethod(Edit.receive(this.Edit), this);
    if (e.param.page == "T") {
      this.back();
    } else {
      // パズル開始
    }
  }

  /** 画像の共有 */
  private ShareImage(e: ActionData<ShareImageParam>) {
    if (GameParams.isOwner) {
      this.shareBtn.destroy();
      this.border.show();
      return;
    }

    // サーバーにはDOMがないので、適当に生成したEで代用
    if (GameParams.isServer && !GameParams.isOwner) {
      this.preview = new g.E({
        scene: this.scene,
        width: e.param.width,
        height: e.param.height
      });
      return;
    }

    this.CreateImage(e.param);
  }

  /** 画像の生成 */
  private CreateImage(data: ShareImageParam) {
    this.previewPanel.children[0].remove();
    const base64 = data.base64;
    const jpg = decode(new Uint8Array(base64ToArrayBuffer(base64)));
    const colorBuffer: g.ImageData = {
      data: Uint8ClampedArray.from(jpg.data),
      width: jpg.width,
      height: jpg.height
    }
    this.preview = new BitmapImage({
      scene: this.scene,
      parent: this.previewPanel,
      colorBuffer,
      width: colorBuffer.width,
      height: colorBuffer.height
    });
    spriteSet(this.preview, this.previewPanel.width, this.previewPanel.height);

    // 表示領域枠生成
    this.border = new StrokeRect({
      scene: this.scene,
      parent: this.preview,
      borderWidth: 4,
      cssColor: "red",
      height: 0,
      width: 0,
      touchable: GameParams.isOwner,
      hidden: GameParams.isOwner
    });
    this.border.onPointMove.add(e => {
      this.puzzleOrigin.x += e.prevDelta.x;
      this.puzzleOrigin.y += e.prevDelta.y;
      if (this.puzzleOrigin.x < 0) this.puzzleOrigin.x = 0;
      else if (this.puzzleOrigin.x > this.preview.width - this.puzzleSize.width)
        this.puzzleOrigin.x = this.preview.width - this.puzzleSize.width;
      if (this.puzzleOrigin.y < 0) this.puzzleOrigin.y = 0;
      else if (this.puzzleOrigin.y > this.preview.height - this.puzzleSize.height)
        this.puzzleOrigin.y = this.preview.height - this.puzzleSize.height;

      this.border.x = this.puzzleOrigin.x;
      this.border.y = this.puzzleOrigin.y;
      this.border.modified();
      // 切り抜き座標を変えるだけなのでパズル情報は更新する必要なし
    });
    this.border.onPointUp.add(() => {
      this.scene.send(new Edit({ type: "Origin", data: [this.puzzleOrigin.x, this.puzzleOrigin.y] }))
    });

    // パズル情報を更新する
    this.EditInfoUpdate();
  }

  /** 画像の編集 */
  private Edit(e: ActionData<EditParam>) {
    if(GameParams.isOwner) return;
    
    if (e.param.type == "Size") {
      this.size.width = e.param.data[0];
      this.size.height = e.param.data[1];
      this.EditInfoUpdate();
    } else {
      if(GameParams.isServer) return;
      this.puzzleOrigin = { x: e.param.data[0], y: e.param.data[1] };
      this.border.x = this.puzzleOrigin.x;
      this.border.y = this.puzzleOrigin.y;
      this.border.modified();
    }
  }

  /** パズル情報更新 */
  private EditInfoUpdate() {
    this.count.x = Math.floor(this.preview.width / this.size.width);
    this.count.y = Math.floor(this.preview.height / this.size.height);
    this.sum = this.count.x * this.count.y;
    this.puzzleSize.width = this.count.x * this.size.width;
    this.puzzleSize.height = this.count.y * this.size.height;
    this.puzzleOrigin.x = Math.floor((this.preview.width - this.puzzleSize.width) / 2);
    this.puzzleOrigin.y = Math.floor((this.preview.height - this.puzzleSize.height) / 2);

    this.pieceInfoLabel[0].text = `ピース数 ${this.sum} 枚`;
    this.pieceInfoLabel[1].text = `行 ${this.count.x} 枚  列 ${this.count.y} 枚`;
    this.pieceInfoLabel[2].text = `横 ${this.size.width} px  縦 ${this.size.height} px`;
    this.pieceInfoLabel[0].invalidate();
    this.pieceInfoLabel[1].invalidate();
    this.pieceInfoLabel[2].invalidate();

    // サーバーでは色々ないのでここで戻る
    if (GameParams.isServer) return;
    // 実際にパズルになる画像のエリア表示
    this.border.x = this.puzzleOrigin.x;
    this.border.y = this.puzzleOrigin.y;
    this.border.width = this.puzzleSize.width;
    this.border.height = this.puzzleSize.height;
    this.border.modified();
  }

  /** パズル編集情報描画 */
  private EditInfo() {
    // 初期値を入れておく
    this.size = { width: 60, height: 60 };

    const font = newFont("sans-serif", 40);
    let x = 10, y = 10;
    const infoWaku = new g.FilledRect({
      scene: this.scene,
      parent: this.display,
      cssColor: "rgba(255,127,39,0.6)",
      width: 430,
      height: 180,
      x: 830, y: 220
    })
    this.pieceInfoLabel[0] = new Label({
      scene: this.scene, font,
      parent: infoWaku,
      text: "ピース数 XXX 枚",
      textAlign: "center",
      width: infoWaku.width,
      x, y
    });
    y += 60;
    this.pieceInfoLabel[1] = new Label({
      scene: this.scene, font,
      parent: infoWaku,
      text: "行 XX 枚  列 XX 枚",
      width: infoWaku.width,
      x, y
    });
    y += 50;
    this.pieceInfoLabel[2] = new Label({
      scene: this.scene, font,
      parent: infoWaku,
      text: "横 XX px  縦 XX px",
      width: infoWaku.width,
      x, y
    });

  }

  /** 画像共有後に生主にだけ表示するUI */
  private SharedLiverOnlyUI() {
    const scene = this.scene;
    const back = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "rgba(255,127,39,0.6)",
      height: 200,
      width: 600,
      x: 220, y: 500
    });
    const font = newFont("sans-serif", 50);
    new Label({
      scene, parent: back,
      font,
      text: "      ピースサイズ変更\n横幅\n縦幅",
      lineGap: 10,
      // textAlign: "center",
      width: back.width
    });

    const sliderParam = {
      scene,
      parent: back,
      per: 0.5, min: 40,
      gripWidth: 25,
      width: 460, height: 60,
      x: 120
    };

    const sliderW = new Slider({ max: 200, y: 64, ...sliderParam });
    sliderW.onValueChange.add(n => {
      this.size.width = Math.floor(n);
      this.EditInfoUpdate();
    });
    sliderW.onBarDown.add(n =>
      this.scene.send(new Edit({ type: "Size", data: [Math.floor(n), this.size.height] })));
    sliderW.onSliderUp.add(n =>
      this.scene.send(new Edit({ type: "Size", data: [Math.floor(n), this.size.height] })));
    const sliderH = new Slider({ max: 200, y: 133, ...sliderParam });
    sliderH.onValueChange.add(n => {
      this.size.height = Math.floor(n);
      this.EditInfoUpdate();
    });
    sliderH.onBarDown.add(n =>
      this.scene.send(new Edit({ type: "Size", data: [this.size.width, Math.floor(n)] })));
    sliderH.onSliderUp.add(n =>
      this.scene.send(new Edit({ type: "Size", data: [this.size.width, Math.floor(n)] })));
  }

  /** ファイルをドラッグアンドドロップされた */
  private onDragDrop(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();

    const fr = new FileReader();
    fr.readAsArrayBuffer(e.dataTransfer.files[0]);
    fr.onload = e => {
      const arrayB = <ArrayBuffer>e.target.result;
      ConvertBase64(arrayB).then(params => {
        this.dropData = params;
        this.CreateImage(params);
      });
    }
  }

  /** 生主にだけ表示するUI */
  private LiverOnlyUI() {
    const scene = this.scene;
    const back = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "#00C24E",
      height: 100,
      width: 160,
      x: 10, y: 500,
      touchable: true
    });
    new Label({
      scene,
      parent: back,
      font: newFont("sans-serif", 60, "white"),
      text: "戻る",
      width: back.width,
      x: 30, y: 15
    });
    back.onPointDown.add(() => {
      if (g.game.isSkipping) return;

      scene.send(new ChangePage({ page: "T" }));
    });
    this.shareBtn = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "#00C24E",
      height: 100,
      width: 350,
      x: 250, y: 500,
      touchable: true
    });
    new Label({
      scene,
      parent: this.shareBtn,
      font: newFont("sans-serif", 50, "white"),
      text: "この画像にする",
      width: this.shareBtn.width,
      y: 10
    });
    this.shareBtn.onPointDown.add(() => {
      if (g.game.isSkipping) return;
      if (this.dropData != undefined) {
        removeDropFile();
        this.SharedLiverOnlyUI();
        scene.send(new ShareImage(this.dropData));
      }
    });
  }
}