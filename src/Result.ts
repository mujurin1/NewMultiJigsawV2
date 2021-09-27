import { Label } from "@akashic-extension/akashic-label";
import { labelAutoReSizeW, newFont } from "./lib/funcs";
import { Player } from "./models/Player";
import { Asset } from "./params";

/**
 * パズルクリア後のリザルト
 */
export class Result {
  private readonly scene: g.Scene;

  /** 最後に渡された情報 undefined なら最後に更新されてから描画されている */
  private lastPlayers: Player[] | undefined;
  private lastPlayer: Player | undefined;

  /** リザルト全体の表示背景も兼ねてる */
  public display: g.E;
  /** ランキング表示部分このエンティティ範囲外は描画されないはず */
  private rankPane: g.Pane;
  private rankingView: g.E;
  // フォント
  private lastPlayerFont: g.Font;
  private rankingNameFont: g.Font;
  private myRankingNameFont: g.Font;
  // 最後の人の王冠と名前
  private lastPlayerName: Label;
  // ランキング
  private rankCrowns: g.Sprite[];
  private rankRanks: Label[];
  private rankNames: Label[];
  private rankScores: Label[];

  constructor(scene: g.Scene) {
    this.scene = scene;

    this.display = new g.Sprite({
      scene,
      src: scene.asset.getImageById("result"),
      x: 50, y: 10,
      hidden: true,
    });
    this.rankPane = new g.Pane({
      scene,
      width: 780,
      height: 365,
      x: 45, y: 180,
      parent: this.display,
      touchable: true,
    });
    this.rankingView = new g.E({
      scene,
      width: this.rankPane.width,
      height: 0,
      parent: this.rankPane,
    });

    // 最後にピースをハメたプレイヤー
    this.lastPlayerFont = newFont("sans-serif", 50, "#23664B");
    // ランキング
    this.rankingNameFont = newFont("sans-serif", 36);
    this.myRankingNameFont = newFont("sans-serif", 36, "blue");

    // ランキング配列初期化
    this.rankCrowns = new Array();
    this.rankRanks = new Array();
    this.rankNames = new Array();
    this.rankScores = new Array();

    // ==================================== 最後のピースをハメた人 ====================================
    // 王冠マーク
    new g.Sprite({
      scene,
      parent: this.display,
      src: scene.asset.getImageById("crown_0"),
      x: 55, y: 90,
    });
    // 名前
    this.lastPlayerName = new Label({
      scene,
      parent: this.display,
      font: this.lastPlayerFont,
      text: "",
      widthAutoAdjust: true,
      lineBreak: false,
      width: 640,
      x: 170, y: 90,
    });

    // タッチイベント
    this.rankPane.onPointMove.add(ev => {
      this.rankingView.y += ev.prevDelta.y;
      if (this.rankingView.y < this.rankPane.height - this.rankingView.height)
        this.rankingView.y = this.rankPane.height - this.rankingView.height;
      if (this.rankingView.y > 0)
        this.rankingView.y = 0;
      this.rankingView.modified();
    });
  }

  /**
   * リザルトを表示する
   */
  public show(): void {
    this.display.show();
    // 非表示中に情報が更新されていたときは描画し直す
    if (!this.lastPlayers) {
      this.rankingView.y = 0;
      this.rankingView.modified();
    } else {
      this.draw(this.lastPlayers, this.lastPlayer);
    }
  }

  /**
   * リザルトを非表示にする
   */
  public hide(): void {
    this.display.hide();
  }

  /**
   * リザルトを描画する
   * @param lastP 最後のピースをハメたプレイヤー
   * @param players プレイヤーの配列
   */
  public draw(players: Player[], lastP?: Player) {
    // 非表示中は描画しない
    if (!this.display.visible()) {
      this.lastPlayers = players;
      this.lastPlayer = lastP;
      return;
    }
    this.lastPlayers = undefined;
    this.lastPlayer = undefined

    for (let i = 0; i < this.rankCrowns.length; i++) {
      this.rankCrowns[i].destroy();
    }
    for (let i = 0; i < this.rankRanks.length; i++) {
      this.rankRanks[i].destroy();
      this.rankNames[i].destroy();
      this.rankScores[i].destroy();
    }

    this.rankCrowns = new Array();
    this.rankRanks = new Array();
    this.rankNames = new Array();
    this.rankScores = new Array();

    // １人分のランキング列縦幅
    const height = 57;
    const margin_wid = 10;
    const crown_wid = 40;
    const rank_x = crown_wid + margin_wid;
    const rank_wid = 113;
    const name_wid = 520;
    const name_x = rank_x + rank_wid + margin_wid * 2;
    const score_wid = 150;
    const score_x = name_x + name_wid + margin_wid;

    this.rankingView.height = height * players.length;

    // 最後のピースをはめた人
    if (!!lastP) {
      this.lastPlayerName.text = lastP.name;
      labelAutoReSizeW(this.lastPlayerName, 640);
    }

    if (!!this.rankingView.children)
      for (let i = this.rankingView.children.length - 1; i >= 0; i--)
        this.rankingView.remove(this.rankingView.children[i]);
    // if (!!this.rankingView.children)
    //   for (const c of this.rankingView.children)
    //     this.rankingView.remove(c);

    // ========================================= ランキング =========================================
    for (let i = 0; i < players.length; i++) {
      let p = players[i];
      // 王冠マーク
      if (p.score > 0 && p.rank <= 3) {
        let crown = new g.Sprite({
          scene: this.scene,
          parent: this.rankingView,
          src: this.scene.asset.getImageById("crown_" + p.rank),
          x: 5, y: height * i
        });
        this.rankCrowns.push(crown);
      }
      // 順位
      let rank = new Label({
        scene: this.scene,
        parent: this.rankingView,
        font: p.playerID == g.game.selfId ? this.myRankingNameFont : this.rankingNameFont,
        text: p.rank + "位",
        textAlign: "right",
        x: rank_x, y: height * i,
        width: rank_wid
      });
      // 名前
      let name = new Label({
        scene: this.scene,
        parent: this.rankingView,
        font: p.playerID == g.game.selfId ? this.myRankingNameFont : this.rankingNameFont,
        text: p.name,
        widthAutoAdjust: true,
        lineBreak: false,
        x: name_x, y: height * i,
        width: name_wid
      });
      labelAutoReSizeW(name, name_wid);
      // スコア
      let score = new Label({
        scene: this.scene,
        parent: this.rankingView,
        font: p.playerID == g.game.selfId ? this.myRankingNameFont : this.rankingNameFont,
        text: p.score + "",
        lineBreak: false,
        x: score_x, y: height * i,
        width: score_wid
      });
      this.rankRanks.push(rank);
      this.rankNames.push(name);
      this.rankScores.push(score);
    }
  }
}