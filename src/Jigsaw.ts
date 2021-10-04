import { Piece } from "./models/Piece";
import { Player, PlayerParam } from "./models/Player";
import { PieceScene } from "./PieceScene";
import { MoveParam, MovePiece, PickParam, PutParam } from "./events/player";
import { CreatePazzleParam } from "./lib/pieceCut";
import { ConnectPieceParam, FitPieceParam } from "./events/piece";
import { PlayingUI } from "./PlayingUI";
import { GameParams } from "./params";
import { Animation } from "./Animation";
import { ErrorNotice, NomalNotice, Notice } from "./models/notice";
import { ServerErrorParam } from "./eoc/ErrorMessage";
import { ScoreBoard } from "./ScoreBoard";

export interface JigsawParam {
  scene: PieceScene,
}

export class Jigsaw {
  private readonly scene: PieceScene;

  /** アツマール用ランキングボード */
  public readonly scoreBoard: ScoreBoard;

  /** ゲームの状態 */
  public jigsawState: "Title" | "Playing" | "Complete" = "Title";
  /** プレイヤー配列 */
  public readonly players: Player[] = [];
  /** 通知用 */
  private readonly nomalNotice: NomalNotice;
  private readonly errorNotice: ErrorNotice;

  /** この端末のプレイヤーが参加ボタンを押して JoinPlayer イベントが来るのを待っている間 True */
  public isJoinWait: boolean = false;
  /**自分のプレイヤー情報  
   * 参加してなければ undefined
   */
  public me: Player | undefined = undefined;

  /** パズルのID アツマールでスコアボードに利用する */
  private pazzleID: number;
  /** パズルのレベル アツマールでスコアボードに利用する */
  private level: number;
  public fitPer: number = 0;
  private pieceCol: number;
  private pieceRow: number;
  private noticeEvent: g.Trigger = new g.Trigger();

  /** ジグソーパズルの画面 */
  public readonly display: g.E;
  /** ジグソーパズルの完成画像 */
  public preview: g.Sprite;
  /** ピース配列 */
  public readonly pieces: Piece[] = [];
  /** ハマったピースの数 */
  public fitCount: number = 0;

  /** 見る範囲のカメラ */
  private readonly camera: g.Camera2D;
  /** ピースをはめる板面 */
  private board: g.E;
  /** 背景 常にカメラの全体を覆っている */
  private background: g.FilledRect;
  /** ピースレイヤー この範囲内をピースが移動できる */
  private pieceLayer: g.E;
  /** UIレイヤー 常にカメラの全体を覆っている */
  public uiLayer: PlayingUI;

  /** 外周が完成したかどうか */
  private isAlignOuter: boolean = false;

  public get cameraScale(): number { return this.camera.scaleX; }
  public get pieceLimit(): g.CommonOffset { return { x: this.pieceLayer.width, y: this.pieceLayer.height }; }
  /**
   * display の原点と board の原点の差  
   */
  public margin: g.CommonSize = { width: 0, height: 0 };

  /** 一致するプレイヤーIDのプレイヤーを返す */
  public samePlayerID(playerID: string): Player | undefined {
    return this.players.find(p => p.playerID == playerID);
  }

  constructor(params: JigsawParam) {
    this.scene = params.scene;
    this.nomalNotice = new NomalNotice(this.scene);
    this.errorNotice = new ErrorNotice(this.scene);
    this.camera = new g.Camera2D({
      width: g.game.width,
      height: g.game.height,
      anchorX: null
    });
    this.display = new g.E({ scene: this.scene });

    if (GameParams.operation == "atsumaru")
      this.scoreBoard = new ScoreBoard(this.scene);
  }

  /** サーバーでエラーが発生した時に呼ばれる */
  public serverError(params: ServerErrorParam) {
    console.log(`SERVER ERROR!!\n${params.message}`);
    this.errorNotice.show(params.message);
  }

  /**
   * ゲームが始まった時に呼ばれる
   */
  public startPazzle(params: CreatePazzleParam) {
    this.jigsawState = "Playing";
    if (GameParams.operation == "atsumaru")
      this.scoreBoard.display.remove();
    this.pazzleID = params.pazzleID;
    this.level = params.level;

    this.uiLayer = new PlayingUI(this.scene, params.title, params.preview);
    this.uiLayer.result.draw(this.players);
    this.background = new g.FilledRect({
      scene: this.scene,
      parent: this.display,
      cssColor: this.uiLayer.colors[0],
      width: g.game.width,
      height: g.game.height,
      anchorX: null,
      touchable: true
    });

    // background, uiLayer をタッチした時だけカメラを動かしたいので、専用の値を設定してそれで判断する
    (<any>this.background).isMoveCamera = true;

    const preview = params.preview;
    this.preview = preview;
    this.margin = { width: preview.width, height: preview.height };

    this.pieceLayer = new g.E({
      scene: this.scene,
      parent: this.display,
      width: preview.width * 3,
      height: preview.height * 3
    });
    this.display.append(this.uiLayer.display);

    this.uiLayer.zoomIn = () => this.zoomBy(0.9);
    this.uiLayer.zoomOut = () => this.zoomBy(1.1);
    this.uiLayer.colorChange = col => {
      this.background.cssColor = col;
      this.background.modified();
    };
    // 画面の表示非表示を切り替える
    let cameraScale: number;
    let cameraPlace: g.CommonOffset;
    this.uiLayer.hideDisplay = () => {
      viewBtn.show();
      this.scene.onPointMoveCapture.remove(this.scene.moveCameraEvent, this.scene);
      this.scene.onPointDownCapture.remove(this.scene.checkPickPiece, this.scene);
      cameraScale = this.camera.scaleX;
      cameraPlace = { x: this.camera.x, y: this.camera.y };
      this.camera.scale(1);
      this.camera.moveTo(0, 0);
      this.camera.modified();
      this.background.hide();
      this.pieceLayer.hide();
      this.uiLayer.display.hide();
    };
    const viewBtn = new g.FilledRect({
      scene: this.scene,
      cssColor: "white",
      x: 1180, y: 630,
      width: 96, height: 96,
      opacity: 0.5,
      touchable: true,
      hidden: true
    });
    new g.Sprite({
      scene: this.scene,
      parent: viewBtn,
      src: this.scene.asset.getImageById("visibleBtn")
    });
    this.scene.append(viewBtn);
    viewBtn.onPointDown.add(() => {
      viewBtn.hide();
      this.scene.onPointMoveCapture.add(this.scene.moveCameraEvent, this.scene);
      if (this.scene.joinBtn == undefined) {
        this.scene.onPointDownCapture.add(this.scene.checkPickPiece, this.scene);
      }
      this.camera.scale(cameraScale);
      this.camera.moveTo(cameraPlace);
      this.camera.modified();
      this.uiLayer.display.show();
      this.pieceLayer.show();
      this.background.show();
    });

    // ピースの生成
    for (let id = 0; id < params.cutInfo.length; id++) {
      const piece = new Piece({
        scene: this.scene,
        jigsaw: this,
        pieceID: id,
        createParam: params
      });
      this.pieces.push(piece);
      this.pieceLayer.append(piece);
    }
    this.randomLineUp();

    // this.pieceLayer.resizeTo(preview.width * 3, preview.height * 3);
    // this.pieceLayer.modified();
    this.board = new g.FilledRect({
      scene: this.scene,
      parent: this.display,
      cssColor: "rgba(255,255,255,0.3)",
      width: preview.width,
      height: preview.height,
      x: this.margin.width,
      y: this.margin.height
    });
    this.display.insertBefore(this.board, this.pieceLayer);

    g.game.focusingCamera = this.camera;
    // カメラの初期拡大率・位置を設定
    this.camera.scale(this.pieceLayer.width / (this.camera.width + 0.5));
    this.camera.moveTo(preview.width * this.camera.scaleX / 3, preview.height * this.camera.scaleX / 3);

    this.cameraModified();


    if (GameParams.operation == "atsumaru") {
      this.uiLayer.display.append(this.scoreBoard.display);
      this.uiLayer.showScoreBoard = () => {
        this.scoreBoard.show(this.pazzleID + 1, this.level);
      }
    }
    this.uiLayer.display.append(this.nomalNotice.display);
    this.uiLayer.display.append(this.errorNotice.display);

    // ピースの縦横列数を計算
    this.pieceCol = 2;
    while (this.pieces[this.pieceCol - 1].connects.length != 2) this.pieceCol++;
    this.pieceRow = this.pieces.length / this.pieceCol;

    // 通知イベント
    // 外周が完成
    const alignOuter = () => {
      // 上、左、右、下の順で検査
      for (let i = 0; i < this.pieceCol; i++) if (!this.pieces[i].isFit) return;
      for (let i = 0; i < this.pieces.length; i += this.pieceCol) if (!this.pieces[i].isFit) return;
      for (let i = this.pieceCol - 1; i < this.pieces.length; i += this.pieceCol) if (!this.pieces[i].isFit) return;
      for (let i = 1; i <= this.pieceCol; i++) if (!this.pieces[this.pieces.length - i].isFit) return;
      this.isAlignOuter = true;
      if (this.fitCount != this.pieces.length)
        this.nomalNotice.show({ text: "外周完成！", audio: this.scene.asset.getAudioById("voice_outer") });
      this.noticeEvent.remove(alignOuter, this);
      this.noticeEvent.remove(alignTop, this);
      this.noticeEvent.remove(alignLeft, this);
      this.noticeEvent.remove(alignRight, this);
      this.noticeEvent.remove(alignBottom, this);
    }
    this.noticeEvent.add(alignOuter, this);
    const alignTop = () => {
      if (this.isAlignOuter) return;
      for (let i = 0; i < this.pieceCol; i++) if (!this.pieces[i].isFit) return;
      this.nomalNotice.show({ text: "上端完成！", audio: this.scene.asset.getAudioById("voice_top") });
      this.noticeEvent.remove(alignTop, this);
    }
    const alignLeft = () => {
      if (this.isAlignOuter) return;
      for (let i = 0; i < this.pieces.length; i += this.pieceCol) if (!this.pieces[i].isFit) return;
      this.nomalNotice.show({ text: "左端完成！", audio: this.scene.asset.getAudioById("voice_left") });
      this.noticeEvent.remove(alignLeft, this);
    }
    const alignRight = () => {
      if (this.isAlignOuter) return;
      for (let i = this.pieceCol - 1; i < this.pieces.length; i += this.pieceCol) if (!this.pieces[i].isFit) return;
      this.nomalNotice.show({ text: "右端完成！", audio: this.scene.asset.getAudioById("voice_right") });
      this.noticeEvent.remove(alignRight, this);
    }
    const alignBottom = () => {
      if (this.isAlignOuter) return;
      for (let i = 1; i <= this.pieceCol; i++) if (!this.pieces[this.pieces.length - i].isFit) return;
      this.nomalNotice.show({ text: "下端完成！", audio: this.scene.asset.getAudioById("voice_bottom") });
      this.noticeEvent.remove(alignBottom, this);
    }
    // 辺ごとの通知は100ピースを超えたパズルのみ
    if (this.pieces.length >= 100) {
      this.noticeEvent.add(alignTop, this);
      this.noticeEvent.add(alignLeft, this);
      this.noticeEvent.add(alignRight, this);
      this.noticeEvent.add(alignBottom, this);
    }
    const per25 = () => {
      if (this.fitPer >= 25) {
        this.nomalNotice.show({ text: "２５％完成！", audio: this.scene.asset.getAudioById("voice_25") });
        this.noticeEvent.remove(per25, this);
        const per50 = () => {
          if (this.fitPer >= 50) {
            this.nomalNotice.show({ text: "５０％完成！", audio: this.scene.asset.getAudioById("voice_50") });
            this.noticeEvent.remove(per50, this);
            const per75 = () => {
              if (this.fitPer >= 75) {
                this.nomalNotice.show({ text: "７５％完成！", audio: this.scene.asset.getAudioById("voice_75") });
                this.noticeEvent.remove(per75, this);
              }
            }
            this.noticeEvent.add(per75, this);
          }
        }
        this.noticeEvent.add(per50, this);
      }
    }
    this.noticeEvent.add(per25, this);

    // this.display.append(params.piecesSrc);
  }

  /**
   * プレイヤーが参加した
   */
  public joinPlayer(params: PlayerParam) {
    const player = new Player(params, this.players[this.players.length - 1]?.rank);
    const idx = this.players.findIndex(p => p.SamePlayerID(player));

    if (idx == -1) {  // 初参加プレイヤー
      this.players.push(player);
      // 自分 && 参加リクエスト中
      if (player.playerID == g.game.selfId && this.isJoinWait) {
        this.isJoinWait = false;
        this.me = player;
      }
    } else {          // 別デバイス or 再読み込み
      // 名前だけ変更する
      this.players[idx].name = player.name;
      // 別端末で自分が参加した
      if (player.playerID == g.game.selfId) {
        // 参加リクエスト中
        if (this.isJoinWait) {
          this.isJoinWait = false;
          this.me = player;
        } else {
          // 参加リクエスト中ではない→自分を除外する
          this.me = undefined;
        }
      }
    }
    if (this.jigsawState != "Title")
      this.uiLayer.result.draw(this.players);
  }

  /** 誰かがピースを掴んだイベントが来たら呼ばれる */
  public PickPiece(prm: PickParam) {
    const piece = this.pieces.find(p => p.pieceID == prm.pieceID);
    const sender = this.players.find(p => p.playerID == prm.playerID);
    // 本当は要らないと思うけど念の為チェックする
    if (piece == undefined || sender == undefined) return;
    // 送り主がこの端末だった
    if (sender.SamePlayerID(this.me)) return;
    // 誰かがピースを掴んでいる（掴むイベントが呼ばれた時に掴んでいる可能性があるのは自分だけ or Bug）
    if (piece.holder != undefined) {
      // 特に何もしなくていいと思う
    }
    piece.holder = sender;
    piece.opacity = 0.4;
    piece.touchable = false;
    piece.modified();
    // 動かしたピースを一番上に表示させる
    piece.parent.append(piece);
  }


  /** 誰かがピースを動かしたイベントが来たら呼ばれる */
  public MovePiece(prm: MoveParam) {
    const piece = this.pieces.find(p => p.pieceID == prm.pieceID);
    const sender = this.players.find(p => p.playerID == prm.playerID);
    // 本当は要らないと思うけど念の為チェックする
    if (piece == undefined || sender == undefined) return;
    // 送り主がこの端末だった
    if (sender.SamePlayerID(this.me)) return;
    // 送り主が自分でないのに、自分がピースを掴んでいた（ローカルでラグの差のため、自分の処理が優先されたが、それは間違いだった）
    if (piece.holder == undefined || piece.holder.SamePlayerID(this.me)) {
      // 特に何もしなくていいと思う
    }
    piece.holder = sender;
    piece.moveTo(prm.pos);
    piece.modified();
  }

  /** 誰かがピースを置いたイベントが来たら呼ばれる */
  public PutPiece(prm: PutParam) {
    const piece = this.pieces.find(p => p.pieceID == prm.pieceID);
    const sender = this.players.find(p => p.playerID == prm.playerID);
    // 本当は要らないと思うけど念の為チェックする
    if (piece == undefined || sender == undefined) return;
    piece.holder = undefined;
    piece.opacity = 1;
    piece.touchable = true;
    piece.childPiece.forEach(c => c.opacity = 1);
    // 送り主がこの端末だった && 自分がピースを持っていない
    if (sender.SamePlayerID(this.me) && piece.holder != undefined) return;
    // 送り主が自分でないのに、自分がピースを掴んでいた（ローカルでラグの差のため、自分の処理が優先されたが、それは間違いだった）
    if (piece.holder == undefined || piece.holder.SamePlayerID(this.me)) {
      // 特に何もしなくていいと思う
    }
    piece.moveTo(prm.pos);
    piece.modified();
  }

  /**
   * ピースがくっついた
   */
  public connectPiece(params: ConnectPieceParam) {
    const parent = this.pieces[params.parentID];
    const child = this.pieces[params.childID];

    // 一番上の親を探す
    let masterParent = parent;
    while (!!masterParent.parentPiece) masterParent = masterParent.parentPiece;
    // 念の為。 PieceScene.moveCameraFromPiece が難しくて、ここでこれしないとバグる
    masterParent.holder = undefined;
    // 一番上の親に子を追加する
    masterParent.childPiece.push(child);
    child.parentPiece = masterParent;
    masterParent.append(child);
    child.moveTo(masterParent.justPxBw(child));
    child.modified();
    // 子に子がいれば、親に移動する
    for (let c of child.childPiece.splice(0)) {
      masterParent.childPiece.push(c);
      c.parentPiece = masterParent;
      masterParent.append(c);
      c.moveTo(masterParent.justPxBw(c));
      c.modified();
    }

    this.scoreUp(params.playerID);
  }

  /**
   * ピースがハマった
   */
  public fitPiece(params: FitPieceParam) {
    const piece = this.pieces[params.pieceID];
    piece.isFit = true;
    // 念の為。 PieceScene.moveCameraFromPiece が難しくて、ここでこれしないとバグる
    piece.holder = undefined;
    piece.touchable = false;
    piece.moveTo(this.margin.width + piece.answer.x, this.margin.height + piece.answer.y);
    piece.modified();
    for (let c of piece.childPiece) {
      c.isFit = true;
      c.touchable = false;
    }
    // ハマったピースを一番下に表示させる
    piece.parent.insertBefore(piece, piece.parent.children[0]);

    this.scoreUp(params.playerID);
  }

  /** プレイヤーのスコアを増やす */
  private scoreUp(playerID: string) {
    if (!!this.me && playerID == this.me.playerID)
      GameParams.myFitSound.play();
    else
      GameParams.otherFitSound.play();
    this.fitCount++;
    this.samePlayerID(playerID).FitPiece();
    this.scoreUpdate();
    this.uiLayer.result.draw(this.players);

    this.fitPer = Math.floor(this.fitCount / this.pieces.length * 100);
    this.noticeEvent.fire();
  }

  /** パズルが完成した */
  public completed(lasetPlayerID: string) {
    this.jigsawState = "Complete";
    // 紙吹雪アニメーション
    const animation = new Animation(this.scene);
    this.uiLayer.display.append(animation.display);
    animation.start();
    // タイマーを止める
    this.uiLayer.info.stopTimer();
    this.scene.asset.getAudioById("voice_8888").play();

    if (GameParams.operation == "nicolive") {
      this.uiLayer.result.draw(this.players, this.samePlayerID(lasetPlayerID));
      this.uiLayer.result.show();
      // this.uiLayer.info.stopTimer();
    } else if(GameParams.operation == "atsumaru" && this.pazzleID != -1) {
      const time = this.uiLayer.info.time;
      // レベル1  1時間23分45秒 => -3_001_23_45
      // レベル3 13時間00分01秒 => -1_013_00_01
      // 01:06:00 => -010600
      //             (4 - レベル)(1桁)              , 時間(3桁)        , 分(2桁)       , 秒(2桁)
      const score = -(4 - this.level) * 1_000_00_00 - time.h * 1_00_00 - time.m * 1_00 - time.s;
      (<any>window).RPGAtsumaru.scoreboards.setRecord(this.pazzleID + 1, score);
      // (<any>window).RPGAtsumaru.scoreboards.display(this.pazzleID + 1);
      this.scoreBoard.show(this.pazzleID + 1, this.level);
    }
  }

  /** プレイヤーのスコアを更新する */
  private scoreUpdate() {
    this.players.sort((a, b) => b.score - a.score);
    let score = 999999;
    let rank = 0;
    let skip = 1;
    for (let p of this.players) {
      if (p.score == score) {
        p.rank = rank;
        skip++;
      } else {
        rank += skip;
        p.rank = rank;
        skip = 1;
        score = p.score;
      }
    }
  }

  /** カメラの拡大率を相対的に変える */
  private zoomBy(scale: number) {
    scale *= this.camera.scaleX;
    // 拡大率が 0.1 以下にならないように
    if (scale >= 0.1)
      this.camera.scale(scale);
    this.cameraModified();
  }


  /** カメラをマウス座標によって動かす */
  public moveCameraFromMouse(point: g.CommonOffset): g.CommonOffset {
    /** カメラ移動の最大速 */
    const range = { x: 100, y: 100 };
    const speed = 20;
    let x = 0;
    let y = 0;
    point.x = Math.floor(point.x);
    point.y = Math.floor(point.y);

    if (point.x < range.x) {
      x += point.x <= 0 ? speed : speed * Math.pow((1 - point.x / range.x), 2);
    } else {
      const rx = this.uiLayer.display.width - point.x;
      if (rx < range.x) {
        x -= rx <= 0 ? speed : speed * Math.pow((1 - rx / range.x), 2);
      }
    }
    if (point.y < range.y) {
      y += point.y <= 0 ? speed : speed * Math.pow((1 - point.y / range.y), 2);
    } else {
      const by = this.uiLayer.display.height - point.y;
      if (by < range.y) {
        y -= by <= 0 ? speed : speed * Math.pow((1 - by / range.y), 2);
      }
    }

    if (x != 0 || y != 0) {
      return this.moveCamera({ x, y });
      // return this.moveCamera({x: 1, y: 1});
    }
    return { x, y };
  }

  /**
   * カメラを動かす
   */
  public moveCamera(point: g.CommonOffset): g.CommonOffset {
    const move = {
      x: -point.x * this.camera.scaleX,
      y: -point.y * this.camera.scaleY
    };
    this.camera.x += move.x;
    this.camera.y += move.y;
    // this.camera.x += -point.x * this.camera.scaleX;
    // this.camera.y += -point.y * this.camera.scaleY;

    // カメラのサイズの半分
    const cameraHW = this.camera.width / 2;
    const cameraHH = this.camera.height / 2;
    // 移動後のカメラの中心座標
    const movedX = this.camera.x + cameraHW;
    const movedY = this.camera.y + cameraHH;

    // カメラの移動制限
    if (movedX < 0 || isNaN(movedX)) {
      this.camera.x = -cameraHW;
    } else if (movedX > this.pieceLayer.width) {
      this.camera.x = this.pieceLayer.width - cameraHW;
    }
    if (movedY < 0 || isNaN(movedY)) {
      this.camera.y = -cameraHH;
    } else if (movedY > this.pieceLayer.height) {
      this.camera.y = this.pieceLayer.height - cameraHH;
    }

    this.cameraModified();
    return move;
  }

  /**
   * カメラの値を変更した後の処理
   */
  private cameraModified() {
    // カメラの変更の反映
    this.camera.modified();
    // g.game.modified();

    // `uiLayer` の調整
    this.uiLayer.display.moveTo(this.camera.x, this.camera.y);
    this.uiLayer.display.scaleX = this.camera.scaleX;
    this.uiLayer.display.scaleY = this.camera.scaleY;
    this.uiLayer.display.modified();
    // 背景も
    this.background.moveTo(this.camera.x, this.camera.y);
    this.background.scaleX = this.camera.scaleX;
    this.background.scaleY = this.camera.scaleY;
    this.background.modified();
  }

  /**
   * ピースをランダムに並べる
   */
  private randomLineUp() {
    /* list を作る初期化（０から連番）
     * list からランダムな位置の要素を切り取る（削除してその要素を取得）
     * ary に切り取った要素を順番に詰める
     * ary の要素順にピースを並べる
     */
    const list: number[] = new Array(this.pieces.length);
    const ary: number[] = new Array(this.pieces.length);
    for (let i = 0; i < list.length; i++) {
      list[i] = i;
    }
    for (let i = 0; i < ary.length; i++) {
      const r = Math.floor(g.game.random.generate() * list.length);
      const n = list.splice(r, 1);
      ary[i] = n[0];
    }
    // ピース１つに使う面積
    const mw = this.pieces[0].width * 1.4;
    const mh = this.pieces[0].height * 1.45;
    // 一番内側が縦横何枚並ぶか（横は両端を含めない、縦は含める）
    let lx = Math.ceil((this.preview.width) / mw) + 1;
    let ly = Math.ceil((this.preview.height) / mh) + 2 + 1;
    // ピースを置く位置（初期位置を設定）
    let px = this.margin.width - mw / 2;
    let py = this.margin.height - mh - mh / 2;
    let flg = true;
    const func = (): boolean => {
      let p = ary.pop();
      if (p == undefined) { flg = false; return true; }
      this.pieces[p].moveTo({ x: px, y: py });
      this.pieces[p].modified();
      return false;
    };
    // １周外になるたび８枚増える
    while (flg) {
      // 右
      for (let r = 0; r < lx; r++) {
        if (func()) break;
        px += mw;
      }
      // 下
      for (let r = 0; r < ly - 1; r++) {
        if (func()) break;
        py += mh;
      }
      // 左
      for (let r = 0; r < lx + 1; r++) {
        if (func()) break;
        px -= mw;
      }
      // 上
      for (let r = 0; r < ly; r++) {
        if (func()) break;
        py -= mh;
      }
      lx += 2;
      ly += 2;
    }
  }

}