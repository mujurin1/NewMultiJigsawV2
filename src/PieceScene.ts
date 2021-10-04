import { SceneEx } from "./eoc/SceneEx";
import { ChangeDefficulty, ChangePazzle, PazzleComplete, StartPazzle, UserPuzzle } from "./events/jigsaw";
import { Jigsaw } from "./Jigsaw";
import { CutParam, pieceCut } from "./lib/pieceCut";
import { AssetManager, PazzleAsset } from "./models/AssetManager";
import { JoinRequest, MovePiece, PickPiece, PutPiece } from "./events/player";
import { Title } from "./Title";
import { JoinPlayer } from "./events/player";
import { ConnectPiece, ConnectPieceParam, FitPiece, FitPieceParam } from "./events/piece";
import { resolvePlayerInfo } from "@akashic-extension/resolve-player-info";
import { Piece } from "./models/Piece";
import { GameParams } from "./params";
import { ServerError } from "./eoc/ErrorMessage";
import { CreatePuzzle } from "./CreateUserPazzle";



export interface PieceSceneParams extends g.SceneParameterObject {
}

export class PieceScene extends SceneEx {
  public title: Title;

  /** 生成後のジグソーパズルなのでタイトル画面までは udnefined */
  public jigsaw: Jigsaw;
  /** パズルのアセットの管理者 */
  public assetManager: AssetManager;

  /** MovePieceイベントの送信を間引く */
  private pieceMoveWait = 3;
  private pieceMoveCnt = 0;

  /** 参加ボタン  存在すれば、まだ参加してない */
  public joinBtn: g.E;

  constructor(params: PieceSceneParams) {
    super(params);

    this.onLoad.addOnce(this.onLoaded, this);
  }

  private onLoaded() {
    this.assetManager = new AssetManager(this);
    this.title = new Title({
      scene: this,
      assetManager: this.assetManager,
      changePazzleCallback: isRight => {
        if (g.game.isSkipping) return;
        this.send(new ChangePazzle({ isRight }));
      },
      changeDifficultyCallback: dif => {
        if (g.game.isSkipping) return;
        this.send(new ChangeDefficulty({ dif }));
      },
      startJigsawCallback: () => {
        if (g.game.isSkipping) return;
        if (this.title.isUserPuzzle)
          this.send(new UserPuzzle(undefined));
        else {
          const size = this.assetManager.assets[this.title.selectPzlID].difficulty[this.title.selectDifID].size;
          if (size.width > size.height)
            this.send(new StartPazzle(size.width / 5));
          else
            this.send(new StartPazzle(size.height / 5));
        }
      }
    });
    this.jigsaw = new Jigsaw({ scene: this });

    this.append(this.title.display);

    // 参加ボタン
    // アツマールソロの場合はなし
    if (GameParams.operation == "nicolive") {
      this.joinBtn = new g.Sprite({
        scene: this,
        parent: this,
        src: this.asset.getImageById("joinBtn"),
        x: 10, y: 602,
        touchable: true
      });
      this.joinBtn.onPointDown.add(() => {
        if (g.game.isSkipping) return;
        if (this.jigsaw.isJoinWait) return;
        resolvePlayerInfo({ limitSeconds: 30 }, (err, pi) => {
          if (!pi) return;
          if (!pi.name) return;
          this.joinBtn.destroy();
          this.joinBtn = undefined;

          // // ユーザー名が自動所得だった場合に名前を決める。
          // if(!pi.userData.accepted) {
          //   pi.name = `あいうえおかきくけこさしすさしす ${Math.floor(Math.random()*100)}`;
          // }
          this.send(new JoinRequest({ playerID: g.game.selfId, name: pi.name }));

          // 持っているピースの位置によってカメラを動かすイベントを追加
          this.onPointDownCapture.add(this.checkPickPiece, this);
        });

        this.jigsaw.isJoinWait = true;
      }, this);
    } else if (GameParams.operation == "atsumaru") {
      // アツマールソロなら最初に名前取得をする
      this.jigsaw.isJoinWait = true;
      resolvePlayerInfo({ limitSeconds: 30 }, (err, pi) => {
        if (!pi) return;
        if (!pi.name) return;
        // // ユーザー名が自動所得だった場合に名前を決める。
        // if(!pi.userData.accepted) {
        //   pi.name = `あいうえおかきくけこさしすさしす ${Math.floor(Math.random()*100)}`;
        // }
        this.send(new JoinRequest({ playerID: g.game.selfId, name: pi.name }));

        // 持っているピースの位置によってカメラを動かすイベントを追加
        this.onPointDownCapture.add(this.checkPickPiece, this);
      });

      // スコアボードを追加
      this.append(this.jigsaw.scoreBoard.display);
    }
    // プレイヤー参加
    this.addReceiveMethod(JoinPlayer.receive(e => {
      this.jigsaw.joinPlayer(e.param);
      // タイトル画面のプレイヤー数表示を更新
      if (this.jigsaw.jigsawState == "Title")
        this.title.joinPlayer(this.jigsaw.players.length);
    }));
    // ピースが動いた
    this.addReceiveMethod(PickPiece.receive(e => this.jigsaw.PickPiece(e.param)));
    this.addReceiveMethod(MovePiece.receive(e => this.jigsaw.MovePiece(e.param)));
    this.addReceiveMethod(PutPiece.receive(e => this.jigsaw.PutPiece(e.param)));
    // タイトル画面
    this.addReceiveMethod(ChangePazzle.receive(e => this.title.changePazzle(e.param.isRight)));
    this.addReceiveMethod(ChangeDefficulty.receive(e => this.title.changeDefficulty(e.param.dif)));
    const startEvent = StartPazzle.receive(() => this.pazzleStart());
    this.addReceiveMethod(startEvent, this);
    // パズル情報編集画面
    this.addReceiveMethod(UserPuzzle.receive(e => {
      this.removeReceiveMethod(startEvent, this);
      this.append(this.title.joinCnt);
      this.title.display.hide();
      const createPuzzle = new CreatePuzzle(
        this,
        value => {
          this.title.display.append(this.title.joinCnt);
          // this.title.display.show();
          // ピースの許容値をStartイベントで行っているので、悪影響が無いように「無理やり」呼び出す
          const size = value.difficulty.size
          if (size.width > size.height)
            this.send(new StartPazzle(size.width / 5));
          else
            this.send(new StartPazzle(size.height / 5));
          this.pazzleStart(value);
        },
        () => {
          this.title.display.append(this.title.joinCnt);
          this.title.display.show();
          this.addReceiveMethod(startEvent, this);
        });
      this.append(createPuzzle.display);
    }));
  }

  /**
   * パズルを始める
   * @param cutParam ユーザー画像パズルの場合は指定する
   */
  private pazzleStart(cutParam?: CutParam) {
    if (this.jigsaw.jigsawState != "Title") return;

    // ユーザー画像かどうか
    if (cutParam != undefined) {
      // ユーザー画像パズル
      this.jigsaw.startPazzle({
        ...pieceCut(cutParam),
        title: "ユーザー投稿画像"
      });
    } else {
      // アセットパズル
      const asset = this.assetManager.assets[this.title.selectPzlID];
      this.jigsaw.startPazzle({
        ...pieceCut(cutParam ?? {
          scene: this,
          pazzleID: this.title.selectPzlID,
          level: this.title.selectDifID + 1,
          wakus: [].concat(...this.assetManager.wakus),
          previewSrc: asset.preview,
          difficulty: asset.difficulty[this.title.selectDifID]
        }),
        title: asset.title
      });
    }

    // タイトルからパズルに切り替える
    this.remove(this.title.display);
    this.append(this.jigsaw.display);
    // 参加ボタンが残っている場合、プレイ場面のUIレイヤーに追加
    if (!!this.joinBtn) this.jigsaw.uiLayer.display.append(this.joinBtn);

    // 画面を動かすイベントを追加
    this.onPointMoveCapture.add(this.moveCameraEvent, this);
    // ピースイベントを追加
    this.addReceiveMethod(ConnectPiece.receive(e => this.jigsaw.connectPiece(e.param)));
    this.addReceiveMethod(FitPiece.receive(e => this.jigsaw.fitPiece(e.param)));
    // パズルが完成した
    this.addReceiveMethod(PazzleComplete.receive(e => this.jigsaw.completed(e.param)));
    // サーバーエラーメッセージ受信
    this.addReceiveMethod(ServerError.receive(e => this.jigsaw.serverError(e.param)));
  }

  /**
   * 画面を掴んでカメラを移動する  
   * タイトル画面なら動かさない
   */
  public moveCameraEvent(e: g.PointMoveEvent): void {
    // 特定のエンティティを操作していたときは、カメラを動かさない
    const target = e.target as any;
    // target == カメラを操作する要素 || (参加してない && ピース)
    if (target != undefined &&
      (typeof target.isMoveCamera == "boolean" || (this.joinBtn != undefined && target.pieceID != undefined)))
      this.jigsaw.moveCamera(e.prevDelta);
  }

  // ====================================== ピースの位置でカメラを動かすための ======================================

  /** 掴んだピース */
  private pickPiece: Piece;
  /** 動かすピース（掴んだピース or 掴んだピースの親ピース） */
  private get movePiece() { return this.pickPiece.parentPiece ?? this.pickPiece; }
  /** ピースを持ち上げた座標 */
  public pickPoint: g.CommonOffset;
  /** 前回送信したピース座標 */
  private beforePiecePos: g.CommonOffset = { x: -1, y: -1 };
  /** 画面上のマウス座標 */
  private mousePoint: g.CommonOffset;
  private pointerID: number = undefined;
  /** 前回ピースを置いた時の時間 */
  private lastPutTime = 0;

  /** 
   * 何かを掴んだら呼ばれる  
   * * 掴んだピースを動かす
   * * ピースを掴んだらイベント登録する
   */
  public checkPickPiece(e: g.PointDownEvent): void {
    // スキップ中は操作不能
    if (g.game.isSkipping) return;
    // マルチタップ対策
    if (typeof this.pointerID == "number") return;
    // 自分が存在しない
    if (this.jigsaw.me == undefined) return;

    this.pickPiece = e.target as Piece;
    // 型チェック
    if (this.pickPiece == undefined || typeof this.pickPiece.pieceID != "number") {
      this.pickPiece = undefined;
      return;
    }

    // 誰かが掴んでいる
    if (this.pickPiece.holder != undefined) return;

    // 連打対策（アツマールソロは連打OK）
    if (GameParams.operation == "nicolive" && g.game.getCurrentTime() - this.lastPutTime < 100) return;

    this.pointerID = e.pointerId;

    this.pickPoint = { x: this.movePiece.x, y: this.movePiece.y };
    this.movePiece.holder = this.jigsaw.me;
    this.send(new PickPiece({
      pieceID: this.movePiece.pieceID,
      playerID: this.jigsaw.me.playerID
    }));
    // 動かしたピースを一番上に表示させる
    this.movePiece.parent.append(this.movePiece);
    this.movePiece.modified();

    // マウス座標に応じてカメラを動かすためのコード
    this.mousePoint = this.jigsaw.uiLayer.display.globalToLocal(this.pickPiece.localToGlobal(e.point));

    // 移動と離すイベントを追加する
    this.onPointMoveCapture.add(this.checkMovePiece, this);
    this.onPointUpCapture.add(this.checkPutPiece, this);
    this.onUpdate.add(this.moveCameraFromPiece, this);
  }
  /** ピースを動かしたら値を変更する */
  private checkMovePiece(e: g.PointMoveEvent): void {
    // スキップ中は操作不能
    if (g.game.isSkipping) return;
    // マルチタップ対策
    if (this.pointerID != e.pointerId) return;
    // スマホだと移動してないのにイベントが発生する？（akashic server 環境で確認。ニコ生ではどうなのか不明）
    if (e.prevDelta.x == 0 && e.prevDelta.y == 0) return;

    if (!!this.pickPiece && this.jigsaw.me.SamePlayerID(this.movePiece.holder)) {
      this.lastPutTime = g.game.getCurrentTime();
      this.movePiece.moveTo(this.pickPoint.x + e.startDelta.x * this.jigsaw.cameraScale, this.pickPoint.y + e.startDelta.y * this.jigsaw.cameraScale);
      // 動かしたピースを一番上に表示させる
      this.movePiece.parent.append(this.movePiece);
      this.movePiece.modified();

      this.mousePoint.x += e.prevDelta.x;
      this.mousePoint.y += e.prevDelta.y;
    }
  }

  /** ピースを離したらイベント解除する */
  private checkPutPiece(e: g.PointUpEvent): void {
    // スキップ中は操作不能
    if (g.game.isSkipping) return;
    // マルチタップ対策
    if (this.pointerID != e.pointerId) return;

    // ピースを掴んでいる && ピースの所有者が自分
    if (!!this.pickPiece && this.jigsaw.me.SamePlayerID(this.movePiece.holder)) {
      this.lastPutTime = g.game.getCurrentTime();
      this.movePiece.moveBy(e.prevDelta.x, e.prevDelta.y);
      this.movePiece.holder = undefined;

      this.send(new PutPiece({
        pieceID: this.movePiece.pieceID,
        playerID: this.jigsaw.me.playerID,
        pos: this.movePiece.position
      }));

      // マウス座標に応じてカメラを動かすためのコード
      this.pickPiece = undefined;
      this.mousePoint = undefined;
      // 各イベントを削除
      this.onUpdate.remove(this.moveCameraFromPiece, this);
      this.onPointMoveCapture.remove(this.checkMovePiece, this);
      this.onPointUpCapture.remove(this.checkPutPiece, this);
      this.pointerID = undefined;
    }
  }

  /**
   * ピースの位置に応じてカメラを動かす  
   * ピースを掴んでいる間毎フレーム呼ばれる
   */
  private moveCameraFromPiece() {
    if (this.pickPiece == undefined) return;
    if (!this.movePiece.holder || !this.movePiece.holder.SamePlayerID(this.jigsaw.me) || !!this.movePiece.parentPiece) {
      this.pieceMoveCnt = 0;
      // 1.Aがピースを拾う 2.Aがピースを置く
      // 3.Bがピースを拾う 4.Bの元にAがピースを拾うイベントが今くる
      // これが成立すると、Bがピースを離したイベントが届かないので
      // これを回避するために、ここで置くイベントを送る
      this.send(new PutPiece({
        pieceID: this.movePiece.pieceID,
        playerID: this.jigsaw.me.playerID,
        pos: this.movePiece.position
      }));

      this.movePiece.holder = undefined;
      this.pickPiece = undefined;
      this.mousePoint = undefined;
      // 各イベントを削除
      this.onUpdate.remove(this.moveCameraFromPiece, this);
      this.onPointMoveCapture.remove(this.checkMovePiece, this);
      this.onPointUpCapture.remove(this.checkPutPiece, this);
      this.pointerID = undefined;
      return;
    }

    const move = this.jigsaw.moveCameraFromMouse(this.mousePoint);
    if (move.x != 0 || move.y != 0) {
      this.movePiece.moveBy(move.x, move.y);
      this.pickPoint.x += move.x;
      this.pickPoint.y += move.y;
    }
    // ピースが動いていたら、移動イベントを送信
    if (this.beforePiecePos.x != this.movePiece.x || this.beforePiecePos.y != this.movePiece.y) {
      this.movePiece.modified();

      this.beforePiecePos = { x: this.movePiece.x, y: this.movePiece.y };
      if (this.pieceMoveCnt-- <= 0) {
        this.pieceMoveCnt = this.pieceMoveWait;

        this.send(new MovePiece({
          pieceID: this.movePiece.pieceID,
          playerID: this.jigsaw.me.playerID,
          pos: this.movePiece.position
        }));
      }
    }
  }
}