import { SceneEx } from "../eoc/SceneEx";
import { Jigsaw } from "../Jigsaw";
import { PickPiece, MovePiece, PutPiece } from "../events/player";
import { Player } from "./Player";
import { CreatePazzleParam } from "../lib/pieceCut";
import { PieceScene } from "../PieceScene";

export interface PieceParam {
  scene: PieceScene,
  jigsaw: Jigsaw,
  pieceID: number,
  createParam: CreatePazzleParam,
}


export class Piece extends g.Sprite {
  private readonly jigsaw: Jigsaw;

  public readonly pieceID: number;

  // MEMO: parentPiece か childPiece の両方値が入っていることはありえない
  /** このピースが所属するピース */
  public parentPiece: Piece | undefined = undefined;
  /** このピースに所属するピース */
  public readonly childPiece: Piece[] = [];
  /** ボードにハマっているか */
  public isFit: boolean = false;
  /** 繋がるピースのID */
  public readonly connects: number[];
  /** このピースの正解座標 */
  public readonly answer: g.CommonOffset;
  /** ピースを今掴んでいるプレイヤー */
  public holder: Player | undefined = undefined;

  /** ピースレイヤー上から計算したピースの座標 */
  get position(): g.CommonOffset {
    // 親がいるかどうか（Piece.Parent は pieceLayer の可能性がある）
    const isNotParent = (this.parent as Piece).isFit == undefined;
    if (isNotParent) {
      return { x: this.x, y: this.y };
    } else {
      let disPx = (<Piece>this.parent).justPxBw(this);
      let ownPos = (<Piece>this.parent).position;
      return {
        x: ownPos.x + disPx.x,
        y: ownPos.y + disPx.y
      };
    }
  }
  get sceneEx(): SceneEx { return this.scene as SceneEx; }

  constructor(params: PieceParam) {
    super({
      src: params.createParam.piecesSrc.src,
      srcX: params.createParam.cutInfo[params.pieceID].x,
      srcY: params.createParam.cutInfo[params.pieceID].y,
      width: params.createParam.cutInfo[params.pieceID].width,
      height: params.createParam.cutInfo[params.pieceID].height / 1,
      touchable: true,
      ...params
    });

    this.jigsaw = params.jigsaw;
    this.pieceID = params.pieceID;
    this.connects = params.createParam.connectIds[this.pieceID];
    this.answer = params.createParam.answerPos[this.pieceID];

    // this.onPointDown.add(this.PickEvent, this);
    // this.onPointMove.add(this.MoveEvent, this);
    // this.onPointUp.add(this.PutEvent, this);
  }

  // g.E の moveBy をオーバーライド
  public moveBy(x: number, y: number) {
    super.moveBy(x, y);
    this.limitCheck();
  }
  // g.E の moveTo をオーバーライド
  public moveTo(prm: g.CommonOffset): void;
  public moveTo(x: number, y: number): void;
  public moveTo(obj: any, y?: any) {
    if (typeof obj === "number") super.moveTo(obj, y);
    else super.moveTo(obj);
    if (!this.parentPiece)
      this.limitCheck();
  }

  private limitCheck() {
    if (this.x < 0)
      this.x = 0;
    else if (this.x > this.jigsaw.pieceLimit.x)
      this.x = this.jigsaw.pieceLimit.x;
    if (this.y < 0)
      this.y = 0;
    else if (this.y > this.jigsaw.pieceLimit.y)
      this.y = this.jigsaw.pieceLimit.y;
  }

  // /**
  //    ピースを持ち上げるイベント\
  //    この端末のプレイヤーが参加してなければ呼ばれない
  //  */
  // private PickEvent(e: g.PointDownEvent) {
  //   // スキップ中は操作不能
  //   if (g.game.isSkipping) return;
  //   // 親ピースがいれば、親にイベントを送る
  //   if (!!this.parentPiece) {
  //     this.parentPiece.PickEvent(e);
  //     return;
  //   }
  //   // 誰かがすでに持っていた場合、何もしない
  //   if (!this.holder) {
  //     this.pickPoint = { x: this.x, y: this.y };
  //     this.holder = this.jigsaw.me;
  //     this.sceneEx.send(new PickPiece({
  //       pieceID: this.pieceID,
  //       playerID: this.jigsaw.me.playerID
  //     }));
  //     // 動かしたピースを一番上に表示させる
  //     this.parent.append(this);
  //   }
  // }
  // /**
  //  * ピースを動かすイベント
  //  */
  // private MoveEvent(e: g.PointMoveEvent) {
  //   // スキップ中は操作不能
  //   if (g.game.isSkipping) return;
  //   // スマホだと移動してないのにイベントが発生する？（akashic server 環境で確認。ニコ生ではどうなのか不明）
  //   if (e.prevDelta.x == 0 && e.prevDelta.y == 0) return;
  //   // 親ピースがいれば、親にイベントを送る
  //   if (!!this.parentPiece) {
  //     this.parentPiece.MoveEvent(e);
  //     return;
  //   }
  //   // 自分以外の人が持っていた場合、何もしない
  //   if (this.jigsaw.me.SamePlayerID(this.holder)) {
  //     this.moveTo(this.pickPoint.x + e.startDelta.x * this.jigsaw.cameraScale, this.pickPoint.y + e.startDelta.y * this.jigsaw.cameraScale);
  //     this.modified();
  //     // this.sceneEx.send(new MovePiece({
  //     //   pieceID: this.pieceID,
  //     //   playerID: this.jigsaw.me.playerID,
  //     //   pos: this.position
  //     // }));
  //     // ローカルで動かしているピースを一番上に表示させた方が良いよね
  //     this.parent.append(this);
  //   }
  // }
  // /**
  //  * ピースを離す（置く）イベント
  //  * */
  // private PutEvent(e: g.PointUpEvent) {
  //   // スキップ中は操作不能
  //   if (g.game.isSkipping) return;
  //   // 親ピースがいれば、親にイベントを送る
  //   if (!!this.parentPiece) {
  //     this.parentPiece.PutEvent(e);
  //     return;
  //   }
  //   // 自分以外の人が持っていた場合、何もしない
  //   if (this.jigsaw.me.SamePlayerID(this.holder)) {
  //     this.moveBy(e.prevDelta.x, e.prevDelta.y);
  //     // this.lastDelta = e.prevDelta;
  //     this.modified();
  //     this.holder = undefined;
  //     this.sceneEx.send(new PutPiece({
  //       pieceID: this.pieceID,
  //       playerID: this.jigsaw.me.playerID,
  //       pos: this.position
  //     }));
  //   }
  // }


  /**
   * ピース同士の正解座標の距離を返す
   */
  public justPxBw(piece: Piece): g.CommonOffset {
    return {
      x: piece.answer.x - this.answer.x,
      y: piece.answer.y - this.answer.y
    };
  }
}