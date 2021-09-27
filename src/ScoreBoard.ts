import { Label } from "@akashic-extension/akashic-label";
import { labelAutoReSizeW, newFont } from "./lib/funcs";

interface ScoreboardData {
  myRecord: null | {
    isNewRecord: boolean,
    rank: number,
    score: number
  },
  ranking: Array<RankingData>,
  myBestRecord: null | {
    rank: number,
    score: number,
    userName: string,
    userId: number
  },
  boardId: number,
  boardName: string
}
interface RankingData {
  rank: number;
  score: number;
  userName: string;
  userId: number;
}


export class ScoreBoard {
  private readonly scene: g.Scene;

  /** リザルト全体の表示背景も兼ねてる */
  public display: g.E;
  /** ランキング表示部分このエンティティ範囲外は描画されないはず */
  private rankPane: g.Pane;
  private rankingView: g.E;
  // フォント
  private rankingFont: g.Font;
  private myRankingFont: g.Font;

  private levelT: Label;
  private ranks: Array<RankingData>;

  /** 表示するレベル */
  public level: number = 1;

  constructor(scene: g.Scene) {
    this.scene = scene;

    this.display = new g.FilledRect({
      scene,
      cssColor: "rgb(82,243,176)",
      x: 50, y: 10,
      width: 870, height: 690,
      hidden: true,
      touchable: true
    });
    this.rankPane = new g.Pane({
      scene,
      width: 820,
      height: 550,
      x: 20, y: 20,
      parent: this.display,
      touchable: true
    });
    this.rankingView = new g.FilledRect({
      scene,
      parent: this.rankPane,
      cssColor: "rgb(204,242,227)",
      width: this.rankPane.width,
      height: this.rankPane.height
    });

    this.rankingFont = newFont("sans-serif", 34);
    this.myRankingFont = newFont("sans-serif", 34, "blue");

    // タッチイベント
    this.rankPane.onPointMove.add(ev => {
      this.rankingView.y += ev.prevDelta.y;
      if (this.rankingView.y < this.rankPane.height - this.rankingView.height)
        this.rankingView.y = this.rankPane.height - this.rankingView.height;
      if (this.rankingView.y > 0)
        this.rankingView.y = 0;
      this.rankingView.modified();
    });

    // 閉じるボタン
    const closeBtn = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "rgb(0,194,78)",
      height: 86, width: 210,
      x: 640, y: 588,
      touchable: true
    });
    new Label({
      scene,
      parent: closeBtn,
      font: newFont("sans-serif", 60, "white"),
      text: "閉じる",
      x: 17, y: 5,
      width: 200
    });
    closeBtn.onPointDown.add(() => this.hide());

    // レベル表示と変更ボタン
    this.levelT = new Label({
      scene,
      parent: this.display,
      font: newFont("sans-serif", 60),
      text: `レベル ${this.level}`,
      x: 10, y: closeBtn.y,
      width: 400
    });
    const left = new g.Sprite({
      scene,
      parent: this.display,
      src: scene.asset.getImageById("left"),
      x: 300, y: closeBtn.y,
      scaleX: 0.8, scaleY: 0.8,
      touchable: true
    });
    const right = new g.Sprite({
      scene,
      parent: this.display,
      src: scene.asset.getImageById("right"),
      x: left.x + 170, y: closeBtn.y,
      scaleX: 0.8, scaleY: 0.8,
      touchable: true
    });
    left.onPointDown.add(() => {
      this.level--;
      if (this.level == 0) this.level = 3;
      this.draw(this.ranks);
    });
    right.onPointDown.add(() => {
      this.level++;
      if (this.level == 4) this.level = 1;
      this.draw(this.ranks);
    });
  }

  /**
   * リザルトを表示する
   */
  public show(boardID: number, level: number): void {
    this.level = level;
    this.display.show();
    // ランキング情報取得
    (<any>window).RPGAtsumaru.scoreboards.getRecords(boardID).then((scoreboardData: ScoreboardData) => {
      const rankingData: Array<RankingData> = scoreboardData.ranking;
      this.draw(rankingData);
    });
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
  public draw(ranking: Array<RankingData>) {
    this.levelT.text = `レベル ${this.level}`;
    this.levelT.invalidate();

    this.ranks = ranking;
    // １人分のランキング列縦幅
    const height = 46;
    const margin_wid = 10;
    // const crown_wid = 40;
    const rank_x = 0;
    const rank_wid = 113;
    const name_wid = 480;
    const name_x = rank_x + rank_wid + margin_wid * 2;
    const score_wid = 150;
    const score_x = name_x + name_wid + margin_wid;

    if (!!this.rankingView.children)
      for (let i = this.rankingView.children.length - 1; i >= 0; i--)
        this.rankingView.remove(this.rankingView.children[i]);

    // ========================================= ランキング =========================================
    /** 描画した人数（違うレベルの人は描画しないため） */
    let drawCnt = 0;
    let rankM: number = undefined;
    for (let i = 0; i < ranking.length; i++) {
      let p = ranking[i];
      const text = this.convertScore(p.score);
      if (text == undefined) continue;
      if (rankM == undefined) rankM = p.rank - 1;

      // 順位
      new Label({
        scene: this.scene,
        parent: this.rankingView,
        font: p.userId + "" == g.game.selfId ? this.myRankingFont : this.rankingFont,
        text: (p.rank - rankM) + "位",
        textAlign: "right",
        x: rank_x, y: height * drawCnt,
        width: rank_wid
      });
      // 名前
      let name = new Label({
        scene: this.scene,
        parent: this.rankingView,
        font: p.userId + "" == g.game.selfId ? this.myRankingFont : this.rankingFont,
        text: p.userName,
        widthAutoAdjust: true,
        lineBreak: false,
        x: name_x, y: height * drawCnt,
        width: name_wid
      });
      labelAutoReSizeW(name, name_wid);
      // レベル1  1時間23分45秒 => -3_001_23_45
      // レベル3 13時間00分01秒 => -1_013_00_01
      // 01:06:00 => -010600
      // スコア
      new Label({
        scene: this.scene,
        parent: this.rankingView,
        font: p.userId + "" == g.game.selfId ? this.myRankingFont : this.rankingFont,
        text,
        lineBreak: false,
        x: score_x, y: height * drawCnt,
        width: score_wid
      });
      drawCnt++;
    }
    if (drawCnt > 12)
      this.rankingView.height = height * drawCnt;
    else
      this.rankingView.height = this.rankPane.height;
  }

  /**
   * スコアを時間に変換する  
   * 選択レベルでなければ undefined を返す
   * 
   * レベル1  1時間23分45秒 => -3_001_23_45  
   * レベル3 13時間00分01秒 => -1_013_00_01
   */
  private convertScore(score: number): string | undefined {
    const str = score + "";
    const l = str.slice(1, 2);
    if (l != (4 - this.level) + "") return undefined
    const h = str.slice(2, 5);
    const m = str.slice(5, 7);
    const s = str.slice(7, 9);
    return `${h}:${m}:${s}`;
  }
}