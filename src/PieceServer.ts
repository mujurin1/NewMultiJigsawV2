import { Server, ServerParameterObject } from "./eoc/Server";
import { ConnectPiece, FitPiece } from "./events/piece";
import { JoinPlayer, JoinRequest, MovePiece, PickPiece, PutPiece } from "./events/player";
import { ChangeDefficulty, ChangePazzle, PazzleComplete, StartPazzle, UserPuzzle } from "./events/jigsaw";
import { Piece } from "./models/Piece";
import { PieceScene } from "./PieceScene";
import { GameParams } from "./params";
import { ChangePage, Edit, ShareImage } from "./events/userPazzle";

export class PieceServer extends Server<PieceScene> {
  private get jigsaw() { return this.scene.jigsaw; }

  /** ピースがくっ付く許容値 */
  private permission: number;
  /** ピースを持てる最大秒数 */
  private readonly holdPieceTime: number = 30;
  /** ピースを離すイベント解除オブジェクトを保持 */
  private readonly holdEvents: { [playerID: string]: g.TimerIdentifier } = {};

  constructor(params: ServerParameterObject<PieceScene>) {
    super(params);

    this.scene.onUpdate.add(() => this.update(), this);
    this.addReceiveMethod(JoinRequest.receive(e => {
      this.broadcast(new JoinPlayer({
        playerID: e.param.playerID,
        name: e.param.name
      }));
    }));

    /* サーバが受け取るピースの動作３つのイベントに関するメモ
     * 掴む  ：ピースを掴めるのは、参加したプレイヤーだけ
     *         だが念の為、送信者のプレイヤーIDが参加者リストにあるか調べる
     * 動かす：ピースを動かすイベントを送れるのは、
     *         送信元でピースを持っている事になっているプレイヤーだけ
     *         だが、ピース操作ラグ対策のため、ローカルでの操作はサーバーから送られたイベントを待たない
     *         そのため、サーバーでは所有者でないプレイヤーからイベントが送られることがある
     * 離す  ：基本的に動かすと同じ
     */
    this.addReceiveMethod(PickPiece.receive(e => {
      const piece = this.jigsaw.pieces[e.param.pieceID];
      // 親が存在していたらだめ || すでにハマっていたらだめ
      if (piece == undefined || piece.parentPiece != undefined || piece.isFit) return;
      // アツマールの場合はすでに掴んでいるので、１００％信用する
      if ((!piece.holder && !!this.jigsaw.samePlayerID(e.param.playerID)) ||
        GameParams.operation == "atsumaru") {
        this.broadcast(e);
        // 一定時間後にピースを離すイベントを追加
        this.holdEvents[e.param.playerID] = this.scene.setTimeout(() => {
          this.scene.send(new PutPiece({
            pieceID: e.param.pieceID,
            playerID: e.param.playerID,
            pos: { x: piece.x, y: piece.y }
          }));
        }, this.holdPieceTime * 1000, this);
      }
    }));
    this.addReceiveMethod(MovePiece.receive(e => {
      const piece = this.jigsaw.pieces[e.param.pieceID];
      // 親が存在していたらだめ || すでにハマっていたらだめ
      if (piece == undefined ||piece.parentPiece != undefined || piece.isFit) return;
      if (!!piece.holder && piece.holder.playerID == e.param.playerID) {
        this.broadcast(e);
      }
    }));
    this.addReceiveMethod(PutPiece.receive(e => {
      const piece = this.jigsaw.pieces[e.param.pieceID];
      // 親が存在していたらだめ || すでにハマっていたらだめ
      if (piece == undefined ||piece.parentPiece != undefined || piece.isFit) return;
      // アツマールの場合はすでに掴んでいるので、１００％信用する
      if ((!!piece.holder && !!this.jigsaw.samePlayerID(e.param.playerID)) ||
        GameParams.operation == "atsumaru") {
        this.broadcast(e);
        // 一定時間後にピースを離すイベントを解除
        const putEvent = this.holdEvents[e.param.playerID];
        if (putEvent != undefined && !putEvent.destroyed()) {
          this.scene.clearTimeout(putEvent);
          delete this.holdEvents[e.param.playerID];
        }

        let pieceSet = this.connectPieceAll(piece);
        if (!!pieceSet) {  // ピースがくっついた！
          // 親の pieceID の方が若いようにする
          if (pieceSet.parent.pieceID > pieceSet.child.pieceID) {
            pieceSet = { parent: pieceSet.child, child: pieceSet.parent };
          }
          this.broadcast(new ConnectPiece({
            parentID: pieceSet.parent.pieceID,
            childID: pieceSet.child.pieceID,
            playerID: e.param.playerID
          }));
        } else if (this.fitBoard(piece)) {  // ピースがボードにハマった！
          this.broadcast(new FitPiece({ pieceID: piece.pieceID, playerID: e.param.playerID }));
        }
        // パズルが完成したか調べる
        if (this.jigsaw.fitCount == this.jigsaw.pieces.length) {
          this.broadcast(new PazzleComplete(e.param.playerID));
        }
      }
    }));

    // タイトル画面でのイベント
    // パズルアセットの変更
    this.addReceiveMethod(ChangePazzle.receive(e => this.broadcast(e)));
    this.addReceiveMethod(ChangeDefficulty.receive(e => this.broadcast(e)));
    this.addReceiveMethod(UserPuzzle.receive(e => this.broadcast(e)));
    this.addReceiveMethod(StartPazzle.receive(e => {
      // ピースのくっつく許容値を設定
      this.permission = e.param;
      // this.permission = 100000;
      this.broadcast(e);
    }));
    // ユーザー画像編集画面でのイベント
    this.addReceiveMethod(ChangePage.receive(e => this.broadcast(e)));
    this.addReceiveMethod(ShareImage.receive(e => this.broadcast(e)));
    this.addReceiveMethod(Edit.receive(e => this.broadcast(e)));
  }

  /**
   * ボードにピースがハマるか調べる
   */
  private fitBoard(piece: Piece): boolean {
    let pos = piece.position;
    return (Math.abs(pos.x - piece.answer.x - this.jigsaw.margin.width) < this.permission &&
      Math.abs(pos.y - piece.answer.y - this.jigsaw.margin.height) < this.permission);
  }

  /**
   * 指定したピースがくっつくかどうかを調べ、くっ付くなら値を返す  
   * 一度に繋がるピースは1つだけ
   * @param piece 検査するピース
   * @returns 繋がったピースID  繋がらなければ `undefined`
   */
  private connectPieceAll(piece: Piece): { parent: Piece, child: Piece } | undefined {
    // 一度に繋がるピースは1つだけにしておく
    for (let child of piece.childPiece) {
      const ocp = this.connectPieceNext(child);
      if (!!ocp)
        return ocp;
    }
    return this.connectPieceNext(piece);
  }
  /**
   * ピースと、隣のピースが繋がるかを調べる  
   * @param piece 検査するピース
   * @returns 繋がったピースID繋がらなければ `undefined`
   */
  private connectPieceNext(piece: Piece): { parent: Piece, child: Piece } | undefined {
    for (let nextId of piece.connects) {
      const ocp = this.connectPiece(piece, this.jigsaw.pieces[nextId]);
      if (ocp != undefined) return ocp;
    }
    return undefined;
  }

  /**
   * ２つのピースがくっ付く座標に存在するか調べる  
   * ２つのピースがくっ付くピース同士かここで調べてない
   */
  private connectPiece(parentP: Piece, childP: Piece): { parent: Piece, child: Piece } | undefined {
    // すでに繋がっている
    if (parentP.parentPiece != undefined &&
      (parentP.parentPiece.pieceID == childP.pieceID ||
        childP.parentPiece != undefined &&
        (parentP.pieceID == childP.parentPiece.pieceID ||
          parentP.parentPiece.pieceID == childP.parentPiece.pieceID
        )
      ) ||
      childP.parentPiece != undefined &&
      parentP.pieceID == childP.parentPiece.pieceID
    ) return undefined;

    // どっちかのピースを誰かが持っている
    if (parentP.holder != undefined || childP.holder != undefined ||
      !!parentP.parentPiece?.holder || !!childP.parentPiece?.holder)
      return undefined;

    // ボードにハマっているピース
    if (parentP.isFit || childP.isFit) return undefined;

    // 繋がるかどうかを調べる
    if (!this.isConnect(parentP, childP)) return undefined;

    // pieceA と pieceB が繋がるのはここまでで確定した

    // parent がいればバトンタッチする
    if (parentP.parentPiece != undefined)
      parentP = parentP.parentPiece;
    if (childP.parentPiece != undefined)
      childP = childP.parentPiece;

    return {
      parent: parentP,
      child: childP
    };
  }

  /**
   * ２つのピースが繋がる位置にあるかを調べる  
   * 隣り合ってないピースとも繋がると言われるので注意
   * @returns 繋がるかどうかどちらかのピースがこのボードのものでないなら `null`
   */
  private isConnect(pieceA: Piece, pieceB: Piece): boolean {
    const just = pieceA.justPxBw(pieceB);

    const posA = pieceA.position;
    const posB = pieceB.position;
    return (Math.abs(posB.x - posA.x - just.x) <= this.permission &&
      Math.abs(posB.y - posA.y - just.y) <= this.permission);
  }
}