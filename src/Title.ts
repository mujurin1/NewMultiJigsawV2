import { Label } from "@akashic-extension/akashic-label";
import { labelAutoReSizeW, newFont, spriteSet } from "./lib/funcs";
import { AssetManager } from "./models/AssetManager";
import { Asset, GameParams } from "./params";
import { PieceScene } from "./PieceScene";


export interface TitleParam {
  scene: PieceScene,
  assetManager: AssetManager,
  changePazzleCallback: (s: boolean) => void,
  changeDifficultyCallback: (n: number) => void,
  startJigsawCallback: () => void
}

/**
 * タイトル画面
 */
export class Title {
  private scene: PieceScene;
  /** パズルのアセットの管理者 */
  private readonly assetManager: AssetManager;

  /** タイトル画面全体の表示エンティティ */
  public readonly display: g.E;
  /** 選択した難易度 0: 簡単  1: 普通  2: 難しい */
  public selectDifID: number = 0;
  /** プレビュー中のパズルのID */
  public selectPzlID: number;
  /** ユーザー画像パズルかどうか */
  public get isUserPuzzle(): boolean {
    return this.selectPzlID == this.assetManager.assets.length;
  }

  /** パズルアセットを変更しようとした時に呼ばれる */
  private readonly changePazzleCallback: (b: boolean) => void;
  /** 難易度を変更しようとした時に呼ばれる */
  private readonly changeDifficultyCallback: (d: number) => void;
  /** ゲームを開始しようとした時に呼ばれる */
  private readonly startJigsawCallback: () => void;

  /** info パズルの情報  
   * cihldren[
   *   0: タイトルの背景画像.children[タイトルテキスト],
   *   1: レベル１背景.children[レベル１テキスト],
   *   2: レベル２背景.children[レベル２テキスト],
   *   3: レベル３背景.children[レベル３テキスト],
   *   4: 参加人数画像.children[参加人数テキスト],
   * ]
   */
  private readonly info: g.E;
  /**
   * 参加者数情報  
   * joinCnt.children[0] == 参加者数テキスト
   */
  public readonly joinCnt: g.E;
  /** プレビュー画像 */
  private readonly preview: g.FilledRect;
  /** 各難易度情報の要素  .child(0) is Label */
  private readonly dif_Entitys: g.E[];

  /** 普通のフォントノーマル */
  private readonly fontN: g.Font;
  /** 縁取りフォントボーダー */
  private readonly fontB: g.Font;


  constructor(params: TitleParam) {
    const scene = params.scene;
    this.scene = scene;
    this.assetManager = params.assetManager;
    this.changePazzleCallback = params.changePazzleCallback;
    this.changeDifficultyCallback = params.changeDifficultyCallback;
    this.startJigsawCallback = params.startJigsawCallback;

    this.fontN = new g.DynamicFont({
      game: g.game,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      size: 50,
    });
    this.fontB = new g.DynamicFont({
      game: g.game,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      size: 50,
      strokeColor: "white",
      strokeWidth: 5,
    });

    this.display = new g.E({
      scene,
    });
    // ========================= プレビュー画像 =========================
    this.preview = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "rgba(0,0,0)",
      width: 770, height: 460,
      x: 25, y: 35,
    });


    // ========================= パズルの情報 =========================
    this.info = new g.E({
      scene,
      width: 380, height: 460,
      x: 850, y: 35,
      parent: this.display,
    });
    // タイトルの背景画像
    const titleBack = new g.Sprite({
      scene,
      parent: this.info,
      src: scene.asset.getImageById("title_back"),
    });
    // タイトルの文字
    new Label({
      scene,
      parent: titleBack,
      width: 360,
      font: this.fontN,
      text: "たいとる",
      widthAutoAdjust: true,
      lineBreak: false,
      anchorX: 0.5,
      anchorY: 0.5,
      x: titleBack.width * 0.5,
      y: titleBack.height * 0.5,
    });

    // =========================== 難易度選択ボタン ===========================
    const text_x = 150;
    const text_w = 170;
    const text_my = -5;
    // 背景
    const levelE = new g.Sprite({
      scene,
      parent: this.info,
      src: scene.asset.getImageById("select_E"),
      y: titleBack.y + 100,
      touchable: true,
    });
    const levelN = new g.Sprite({
      scene,
      parent: this.info,
      src: scene.asset.getImageById("select_N"),
      y: levelE.y + 100,
      opacity: 0.6,
      touchable: true,
    });
    const levelH = new g.Sprite({
      scene,
      parent: this.info,
      src: scene.asset.getImageById("select_H"),
      y: levelN.y + 100,
      opacity: 0.6,
      touchable: true,
    });
    // ラベル
    new Label({
      scene,
      parent: levelE,
      width: text_w,
      font: this.fontN,
      fontSize: 40,
      text: "50",
      textAlign: "right",
      anchorY: 0.5,
      x: text_x,
      y: levelE.height * 0.5 + text_my,
    });
    new Label({
      scene,
      parent: levelN,
      width: text_w,
      font: this.fontN,
      fontSize: 40,
      text: "100",
      textAlign: "right",
      lineBreak: false,
      anchorY: 0.5,
      x: text_x,
      y: levelE.height * 0.5 + text_my,
    });
    new Label({
      scene,
      parent: levelH,
      width: text_w,
      font: this.fontN,
      fontSize: 40,
      text: "200",
      textAlign: "right",
      lineBreak: false,
      anchorY: 0.5,
      x: text_x,
      y: levelN.height * 0.5 + text_my,
    });
    this.dif_Entitys = [levelE, levelN, levelH];

    // ================================= 難易度選択ボタンクリック =================================
    if (GameParams.isOwner) {
      // TODO: 難易度変更グローバルイベントを呼ぶ
      levelE.onPointDown.add(() => {
        if (this.selectDifID == 0) return;
        this.changeDifficultyCallback(0);
      });
      levelN.onPointDown.add(() => {
        if (this.selectDifID == 1) return;
        this.changeDifficultyCallback(1);
      });
      levelH.onPointDown.add(() => {
        if (this.selectDifID == 2) return;
        this.changeDifficultyCallback(2);
      });
    }

    // ===================================== 参加人数 =====================================
    this.joinCnt = new g.Sprite({
      scene,
      parent: this.display,
      src: scene.asset.getImageById("sanka_nin"),
      x: 850, y: 435,
    });
    // 参加人数文字
    const joinCountText = new Label({
      scene,
      parent: this.joinCnt,
      // width: text_w,
      width: 380,
      font: this.fontN,
      fontSize: 50,
      text: "0",
      textAlign: "center",
      lineBreak: false,
      anchorY: 0.5,
      y: this.joinCnt.height * 0.5 + text_my,
    });

    // バージョン情報
    new Label({
      scene,
      parent: this.display,
      font: this.fontB,
      width: 1000,
      height: 30,
      text: "v 11.1\n最後のパズルはあなたの画像です",
      fontSize: 30,
      x: 740,
      y: 650,
    });

    if (GameParams.operation == "atsumaru") {
      // ================================ アツマールソロ専用UI ================================
      const ranking = new g.FilledRect({
        scene,
        parent: this.display,
        cssColor: "#00C24E",
        x: 10, y: 602,
        width: 192, height: 108,
        touchable: true
      });
      new Label({
        scene,
        parent: ranking,
        font: newFont("sans-serif", 36, "#fff"),
        text: "ランキング",
        textAlign: "center",
        anchorY: 0.5,
        y: 54,
        width: 192
      });
      // なぜか () => score.display だと動かない
      ranking.onPointDown.add(() => {
        if (scene.jigsaw.scoreBoard.display.visible()) {
          scene.jigsaw.scoreBoard.hide();
        } else {
          // (<any>window).RPGAtsumaru.scoreboards.display(this.selectPzlID + 1);
          scene.jigsaw.scoreBoard.show(this.selectPzlID + 1, this.selectDifID + 1);
          // // スコアボードデバッグ用
          // const c = (rank: number, score: number, userName: string, userId: number) => { return { rank, score, userName, userId } };
          // // -3_001_23_45
          // // -1_013_00_01
          // const data = [
          //   c(1, -3_001_21_45, "あいうえおかきくけこさしすせそん", 1),
          //   c(2, -3_001_22_00, "abcdeabcdeabcdez", 2),
          //   c(3, -3_001_23_00, "rank3", 3),
          //   c(4, -3_001_24_00, "rank4", 4),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -3_001_25_00, "rank5", 5),
          //   c(5, -2_001_25_00, "rank5", 5),
          // ];
          // scene.jigsaw.scoreBoard.display.show();
          // scene.jigsaw.scoreBoard.draw(data);
        }
      });
    }

    if (GameParams.isOwner) {
      // ================================ ホストにだけ表示するUI ================================
      const left = new g.Sprite({
        scene,
        parent: this.display,
        src: scene.asset.getImageById("left"),
        x: 250, y: 550,
        touchable: true,
      });
      const right = new g.Sprite({
        scene,
        parent: this.display,
        src: scene.asset.getImageById("right"),
        x: 500, y: 550,
        touchable: true,
      });
      const start = new g.Sprite({
        scene,
        parent: this.display,
        src: scene.asset.getImageById("playBtn"),
        x: 950,
        y: 550,
        touchable: true,
      });
      // それぞれクリックでグローバルイベントを発行する
      left.onPointDown.add(() => this.changePazzleCallback(false));
      right.onPointDown.add(() => this.changePazzleCallback(true));
      start.onPointDown.add(() => this.startJigsawCallback());
    } else { /* リスナーにだけ表示するUIがあるならここへ */ }

    this.selectPzlID = -1;
    this.changePazzle(true);
  }

  /** 選択難易度を変更する */
  public changeDefficulty(dif: number) {
    this.selectDifID = dif;
    const easy = this.dif_Entitys[0];
    const nmal = this.dif_Entitys[1];
    const hard = this.dif_Entitys[2];
    easy.opacity = dif == 0 ? 1 : 0.6;
    easy.modified();
    nmal.opacity = dif == 1 ? 1 : 0.6;
    nmal.modified();
    hard.opacity = dif == 2 ? 1 : 0.6;
    hard.modified();
  }

  /**
   * 参加人数変更
   */
  public joinPlayer(n: number) {
    (<g.Label>this.joinCnt.children[0]).text = n + "";
    (<g.Label>this.joinCnt.children[0]).invalidate();
  }

  /**
   * ホストがパズルアセットを変更した
   * @param right T: 右のパズルに変更 F: 左のパズルに変更
   */
  public changePazzle(right: boolean): void {
    const assets = this.assetManager;
    const pzlCnt = assets.assets.length;
    // 選択したパズルIDを増やして
    this.selectPzlID += right ? +1 : -1;

    if (this.selectPzlID == -1 || this.selectPzlID == pzlCnt) this.selectPzlID = pzlCnt;
    else if (this.selectPzlID == pzlCnt + 1) this.selectPzlID = 0;
    else this.selectPzlID = (this.selectPzlID + pzlCnt) % pzlCnt;
    // パズルの種類+1番目だったら
    if (this.isUserPuzzle) {
      // パズル画像を貰う方
      this.preview.remove(this.preview.children[0]);

      const userPazzle = new g.E({ scene: this.scene });
      new Label({
        scene: this.scene,
        parent: userPazzle,
        font: newFont("sans-serif", 90, "white"),
        text: " 好きな画像で遊ぶ",
        y: 100,
        width: this.preview.width
      });
      new Label({
        scene: this.scene,
        parent: userPazzle,
        font: newFont("sans-serif", 50, "white"),
        text: "（生主がPCの時のみ遊べます）\n\n    「開始」ボタンを押すと\n     別ページに移動します",
        y: 200,
        width: this.preview.width
      })
      this.preview.append(userPazzle);

      const infos = this.info.children;

      const title = infos[0].children[0] as Label;
      title.text = "ユーザー投稿画像";
      labelAutoReSizeW(title, 360);
      const textE = infos[1].children[0] as Label;
      const textN = infos[2].children[0] as Label;
      const textH = infos[3].children[0] as Label;
      textE.text = "???";
      textN.text = "???";
      textH.text = "???";
      textE.invalidate();
      textN.invalidate();
      textH.invalidate();
    } else {
      // アセットからパズルを選択する方

      // プレビュー画像を変更する
      const selectPzl = assets.assets[this.selectPzlID];
      if (!!this.preview.children)
        this.preview.remove(this.preview.children[0]);

      this.preview.append(selectPzl.preview);
      spriteSet(selectPzl.preview, this.preview.width, this.preview.height);

      // パズル情報を変更する
      const infos = this.info.children;

      const title = infos[0].children[0] as Label;
      title.text = selectPzl.title;
      labelAutoReSizeW(title, 360);
      const textE = infos[1].children[0] as Label;
      const textN = infos[2].children[0] as Label;
      const textH = infos[3].children[0] as Label;
      textE.text = selectPzl.difficulty[0].count + "";
      textN.text = selectPzl.difficulty[1].count + "";
      textH.text = selectPzl.difficulty[2].count + "";
      textE.invalidate();
      textN.invalidate();
      textH.invalidate();
    }
  }
}


