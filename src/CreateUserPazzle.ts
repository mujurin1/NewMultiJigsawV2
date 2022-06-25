import { Label, LabelParameterObject } from "@akashic-extension/akashic-label";
import { SceneEx } from "./eoc/SceneEx";
import { Action, ActionData } from "./eoc/Server";
import { JoinPlayer } from "./events/player";
import { ChangePage, ChangePageParam, Edit, EditParam, ShareImage, ShareImageParam } from "./events/userPazzle";
import { addDragDrop, base64ToArrayBuffer, ConvertJpgImage, createFillLabel, createScrollLabel, newFont, removeDropFile, spriteSet } from "./lib/funcs";
import { decode } from "./lib/jpeg/decoder";
import { CutParam } from "./lib/pieceCut";
import { BitmapImage } from "./models/BitmapImage";
import { GameParams } from "./params";
import { Slider } from "./models/Slider";
import { StrokeRect } from "./models/StrokeRect";
import { encode } from "./lib/jpeg/encoder";
import { Image as JpgImage } from "./lib/jpeg/image";
import { PieceScene } from "./PieceScene";

export class CreatePuzzle {
  private readonly scene: PieceScene;

  private readonly start: (value: CutParam) => void;
  private readonly back: () => void;

  public readonly display: g.E;

  private shareBtn: g.FilledRect;
  /** 開始ボタンを押していないかどうか */
  private isEdit: boolean = true;

  private previewPanel: g.FilledRect;
  private preview: g.E;
  private dropData: ShareImageParam;
  /** パズルになる領域を表示する */
  private border: StrokeRect;

  // ピース編集情報
  private pieceSize: g.CommonSize = { width: 0, height: 0 };
  private matrix: g.CommonOffset = { x: 0, y: 0 };
  private sum: number = 0;
  /** 画像サイズ（KB） */
  private capacity: number = 0;
  /** 実際のパズルのサイズ */
  private puzzleSize: g.CommonSize = { width: 0, height: 0 };
  /** 元絵から、パズルにする領域の原点 */
  private puzzleOrigin: g.CommonOffset = { x: 0, y: 0 };

  /**
   * 0: 画像サイズ "画像サイズ XXX KB"
   * 1: 総数       "ピース数 XXX枚"
   * 2: 行列数     "行 XX枚  列 XX枚"
   * 3: サイズ     "縦 XX  横 XX"
   */
  private pieceInfoLabel: Label;

  constructor(scene: PieceScene, start: (value: CutParam) => void, back: () => void) {
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

    const question = createScrollLabel(
      { scene, parent: this.display, cssColor: "rgba(0,0,0,0.9)", width: 770, height: 460, x: 25, y: 35, touchable: true },
      {
        scene, font: newFont("sans-serif", 35, "white"),
        text: `\n
   ---- HELP（HELP!ボタンで閉じます）----\n
\n\n
ここに画像をドラッグ&ドロップしてください\n
（生主のみ可能です。PCからのみ可能です）\n
\n
「この画像にする」ボタンで画像を送信します\n
送信後にピース分割数を決めれます\n
（右上に書いている容量分通信します）\n
\n
赤い枠線は、実際にパズルになる領域です\n
ドラッグで移動できます\n
\n
一度送信した後に画像を変える場合は\n
ゲームを貼り直した方が良いです\n
（前の画像分無駄に重くなってしまうため）\n
\n
ゲーム開始後およそ２分間（非同期中）\n
・ピースをはめることが出来ません\n
・操作が他人と共有されません\n
\n
\n
[よくありそうなQ&A]\n

Q.この画像にするボタンが反応しません\n
A.画像は　80x80　以上にして下さい\n
   それでも動かないなら、少し待って下さい\n

Q.開始ボタンが反応しません\n
A.パズルは　２行２列　以上にして下さい\n
   それでも動かないなら、少し待って下さい\n

Q.他の人はピースを動かしているのに\n
   自分はピースを動かせません\n
A.画像送信後の非同期中に参加をすると\n
   稀に参加出来ないことがあるようです\n
   リロードして参加しなおして下さい\n

Q.ゲーム開始後すぐ動かないのが嫌だ\n
A.画像容量が 80KB 以下ならすぐ動くかも\n
  （容量はあくまで目安なので）\n

Q.スマホではできませんか？\n
A.出来ません。ごめんなさい。\n

`,
        lineGap: -17,
        width: 0, x: 10
      });


    const helpBtn = createFillLabel(
      {
        scene, parent: this.display, cssColor: "#00C24E",
        x: 840, y: 600, height: 100, width: 230, touchable: true
      },
      {
        scene, font: newFont("sans-serif", 65, "white"), text: "HELP!",
        textAlign: "center", y: 5, width: 0
      });

    helpBtn.onPointDown.add(() => {
      if (question.visible()) question.hide(); else question.show();
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
      this.preview.scale(1);
      this.preview.modified();
      // パズル開始
      this.start({
        scene: this.scene,
        level: -1,
        wakus: [].concat(...this.scene.assetManager.wakus),
        pazzleID: -1,
        previewSrc: g.SpriteFactory.createSpriteFromE(this.scene, this.preview),
        difficulty: {
          count: this.sum,
          size: this.pieceSize,
          origin: this.puzzleOrigin
        }
      });
    }
  }

  /** 画像の共有 */
  private ShareImage(e: ActionData<ShareImageParam>) {
    if (GameParams.isOwner) {
      removeDropFile();
      this.shareBtn.destroy();
      this.SharedLiverOnlyUI();
      if (!g.game.isSkipping) {
        this.border.show();
        return;
      }
    }

    this.CreateImage(e.param);
  }

  /** 画像の生成 */
  private CreateImage(data: ShareImageParam) {
    this.previewPanel.children?.pop();
    // this.capacity = (new Blob([data.jpgByteChars])).size;
    this.capacity = encodeURIComponent(data.jpgByteChars).replace(/%../g, "x").length;
    // なんか結構ずれるので、これくらい増やしておく
    this.capacity = Math.floor(this.capacity * 1.1)

    const jpgBytes = [];
    for (let i = 0; i < data.jpgByteChars.length; i++) {
      jpgBytes.push(data.jpgByteChars[i].charCodeAt(0));
    }

    const jpg = decode(new Uint8Array(jpgBytes));

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
      hidden: GameParams.isOwner && !g.game.isSkipping
    });
    this.border.onPointMove.add(e => {
      this.puzzleOrigin.x += e.prevDelta.x / this.preview.scaleX;
      this.puzzleOrigin.y += e.prevDelta.y / this.preview.scaleX;
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
    if (GameParams.isOwner && !g.game.isSkipping) return;

    if (e.param.type == "Size") {
      this.pieceSize.width = e.param.data[0];
      this.pieceSize.height = e.param.data[1];
      this.EditInfoUpdate();
    } else {
      if (GameParams.isServer) return;
      this.puzzleOrigin = { x: e.param.data[0], y: e.param.data[1] };
      this.border.x = this.puzzleOrigin.x;
      this.border.y = this.puzzleOrigin.y;
      this.border.modified();
    }
  }

  /** パズル情報更新 */
  private EditInfoUpdate() {
    this.matrix.x = Math.floor(this.preview.width / this.pieceSize.width);
    this.matrix.y = Math.floor(this.preview.height / this.pieceSize.height);
    this.sum = this.matrix.x * this.matrix.y;
    this.puzzleSize.width = this.matrix.x * this.pieceSize.width;
    this.puzzleSize.height = this.matrix.y * this.pieceSize.height;
    this.puzzleOrigin.x = Math.floor((this.preview.width - this.puzzleSize.width) / 2);
    this.puzzleOrigin.y = Math.floor((this.preview.height - this.puzzleSize.height) / 2);

    this.pieceInfoLabel.text = `         -- 画像 --\n
サイズ ${this.preview.width} x ${this.preview.height}\n
容量 ${this.capacity / 1000} KB\n

        -- ピース --\n
合計 ${this.sum} 枚\n
行 ${this.matrix.x} 枚  列 ${this.matrix.y} 枚\n
横 ${this.pieceSize.width} px  縦 ${this.pieceSize.height} px\n`;
    this.pieceInfoLabel.invalidate();

    // サーバーでは色々ないのでここで戻る
    if (!GameParams.isServer || GameParams.operation == "atsumaru") {
      // 実際にパズルになる画像のエリア表示
      this.border.x = this.puzzleOrigin.x;
      this.border.y = this.puzzleOrigin.y;
      this.border.width = this.puzzleSize.width;
      this.border.height = this.puzzleSize.height;
      this.border.modified();
    }
  }

  /** パズル編集情報描画 */
  private EditInfo() {
    // 初期値を入れておく
    this.pieceSize = { width: 60, height: 60 };

    const font = newFont("sans-serif", 38);
    let x = 10, y = 10;
    const infoWaku = new g.FilledRect({
      scene: this.scene,
      parent: this.display,
      cssColor: "rgba(176,247,204,0.8)",
      width: 430,
      height: 360,
      x: 830, y: 35
    })
    this.pieceInfoLabel = new Label({
      scene: this.scene, font,
      parent: infoWaku,
      text: "         -- 画像 --\n\nサイズ XXXX x XXXX\n\n容量 XXX KB\n\n\n        -- ピース --\n\n合計 XXX 枚\n\n行 XXX 枚  列 XXX 枚\n\n横 XX px  縦 XX px\n",
      lineGap: -17,
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
      cssColor: "rgba(0,194,78,0.8)",
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
      x: 7,
      width: back.width
    });

    const sliderParam = {
      scene,
      parent: back,
      per: 0.125, min: 40,
      gripWidth: 25,
      width: 460, height: 60,
      x: 120
    };

    const sliderW = new Slider({ ...sliderParam, max: 200, y: 64 });
    sliderW.onValueChange.add(n => {
      if (this.isEdit) {
        this.pieceSize.width = Math.floor(n);
        this.EditInfoUpdate();
      }
    });
    sliderW.onBarDown.add(n => {
      if (this.isEdit)
        this.scene.send(new Edit({ type: "Size", data: [Math.floor(n), this.pieceSize.height] }))
    });

    sliderW.onSliderUp.add(n => {
      if (this.isEdit)
        this.scene.send(new Edit({ type: "Size", data: [Math.floor(n), this.pieceSize.height] }))
    });
    const sliderH = new Slider({ ...sliderParam, max: 200, y: 133 });
    sliderH.onValueChange.add(n => {
      if (this.isEdit) {
        this.pieceSize.height = Math.floor(n);
        this.EditInfoUpdate();
      }
    });
    sliderH.onBarDown.add(n => {
      if (this.isEdit)
        this.scene.send(new Edit({ type: "Size", data: [this.pieceSize.width, Math.floor(n)] }))
    });
    sliderH.onSliderUp.add(n => {
      if (this.isEdit)
        this.scene.send(new Edit({ type: "Size", data: [this.pieceSize.width, Math.floor(n)] }))
    });

    const startBtn = new g.Sprite({
      scene, parent: this.display, src: scene.asset.getImageById("playBtn"), x: 1080, y: 597, touchable: true
    })

    startBtn.onPointDown.add(() => {
      if (this.matrix.x >= 2 && this.matrix.y >= 2 && this.isEdit) {
        this.isEdit = false;
        scene.send(new ChangePage({ page: "S" }))
      }
    });
  }

  /** ファイルをドラッグアンドドロップされた */
  private onDragDrop(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();

    const fr = new FileReader();
    fr.readAsArrayBuffer(e.dataTransfer.files[0]);

    fr.onload = e => {
      const arrayB = <ArrayBuffer>e.target.result;

      ConvertJpgImage(arrayB).then(id => {
        let jpgByteChars = "";
        const img = id;
        const jpg = encode(img);
        for (let i = 0; i < jpg.data.length; i++) {
          jpgByteChars += (String.fromCharCode(jpg.data[i]));
        }
        this.dropData = {
          jpgByteChars,
          width: id.width,
          height: id.height
        };
        this.CreateImage(this.dropData);
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
      x: 20, y: 500,
      touchable: true
    });
    new Label({
      scene,
      parent: back,
      font: newFont("sans-serif", 60, "white"),
      text: "戻る",
      width: back.width,
      x: 20, y: 10
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
      width: 400,
      x: 250, y: 550,
      touchable: true
    });
    new Label({
      scene,
      parent: this.shareBtn,
      font: newFont("sans-serif", 50, "white"),
      text: " この画像にする",
      width: this.shareBtn.width,
      y: 15
    });
    this.shareBtn.onPointDown.add(() => {
      if (g.game.isSkipping) return;
      if (this.dropData != undefined) {
        // 最低2x2、最小40pxのため、最小画像サイズは80x80
        if (this.preview.width >= 80 && this.preview.height >= 80)
          scene.send(new ShareImage(this.dropData));
      }
    });
  }
}