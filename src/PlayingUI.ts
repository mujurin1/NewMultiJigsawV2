import { Label } from "@akashic-extension/akashic-label";
import { newFont } from "./lib/funcs";
import { Asset, GameParams } from "./params";
import { PieceScene } from "./PieceScene"
import { PlayingInfo } from "./PlayingInfo";
import { Preview } from "./Preview";
import { Result } from "./Result";
import { ScoreBoard } from "./ScoreBoard";


export class PlayingUI {
  private readonly scene: PieceScene;

  public readonly display: g.E;
  public readonly result: Result;
  public readonly info: PlayingInfo;

  public zoomIn: () => void;
  public zoomOut: () => void;
  public colorChange: (color: string) => void;
  public hideDisplay: () => void;

  /** アツマール用スコアボード表示 */
  public showScoreBoard: () => void;

  public readonly colors: string[] = [
    "#0087CC", "#A900CC", "#CC4300", "#22CC00",
    "#3D738E", "#813D8E", "#8E583D", "#4A8E3D"];//, "rgba(100,100,100,0)"];
  private selectColor = 0;

  constructor(scene: PieceScene, title: string, prvSprite: g.Sprite) {
    this.scene = scene;

    this.display = new g.E({
      scene: scene,
      width: g.game.width,
      height: g.game.height,
      anchorX: null
    });

    const info = new PlayingInfo(scene, title);
    this.info = info;
    this.display.append(info.display);
    const preview = new Preview(scene, prvSprite);
    this.display.append(preview.display);

    this.result = new Result(scene);
    this.display.append(this.result.display);


    // 前は w: 100 だった
    let x = 1180, y = 440;
    const mx = 90, my = 90;
    // 上段
    const settingBtn = this.createUI({ w: 70, h: 70, x, y, src: "setting", a: 0.7 });
    x -= mx;
    const visibleBtn = this.createUI({ w: 70, h: 70, x, y, src: "visibleBtn", a: true });
    x -= mx;
    const resultBtn = this.createUI({ w: 70, h: 70, x, y, src: "resultBtn", a: true });
    // 中段
    x = 1180; y += my;
    const infoBtn = this.createUI({ w: 70, h: 70, x, y, src: "infoBtn", a: true });
    x -= mx;
    const prvBtn = this.createUI({ w: 70, h: 70, x, y, src: "previewBtn", a: true });
    x -= mx;
    const colorBtn = this.createUI({ w: 70, h: 70, x, y, src: 1, a: true });
    // 下段
    x = 1180; y += my;
    const zoomInBtn = this.createUI({ w: 70, h: 70, x, y, src: "zoomIn" });
    x -= mx;
    const zoomOutBtn = this.createUI({ w: 70, h: 70, x, y, src: "zoomOut" });

    settingBtn.onPointDown.add(() => {
      settingBtn.opacity = settingBtn.opacity == 1 ? 0.7 : 1;
      settingBtn.modified();
      infoBtn.visible() ? infoBtn.hide() : infoBtn.show();
      // if (infoBtn.visible()) infoBtn.hide(); else infoBtn.show();
      resultBtn.visible() ? resultBtn.hide() : resultBtn.show();
      visibleBtn.visible() ? visibleBtn.hide() : visibleBtn.show();
      prvBtn.visible() ? prvBtn.hide() : prvBtn.show();
      colorBtn.visible() ? colorBtn.hide() : colorBtn.show();
    });

    infoBtn.onPointDown.add(() => {
      info.display.visible() ? info.display.hide() : info.display.show();
    });
    resultBtn.onPointDown.add(() => {
      if (GameParams.operation == "nicolive")
        this.result.display.visible() ? this.result.hide() : this.result.show();
      else
        this.showScoreBoard();
    });
    visibleBtn.onPointDown.add(e => {
      if (e.pointerId == 1)
        this.hideDisplay();
    });
    prvBtn.onPointDown.add(() => {
      preview.display.visible() ? preview.display.hide() : preview.display.show();
    });
    colorBtn.onPointDown.add(() => {
      this.selectColor++;
      if (this.selectColor == this.colors.length)
        this.selectColor = 0;
      (<g.FilledRect>colorBtn.children[0]).cssColor = this.colors[(this.selectColor + 1) % this.colors.length];
      colorBtn.children[0].modified();
      this.colorChange(this.colors[this.selectColor]);
    });
    zoomInBtn.onPointDown.add(() => this.zoomIn());
    zoomOutBtn.onPointDown.add(() => this.zoomOut());


    /* 操作説明等、最初の一定時間だけ表示する
     * setting: 各種ボタンの表示・非表示
     * infoBtn: パズル情報の表示・非表示
     * resultBtn: ランキングの表示・非表示
     * visibleBtn: パズルの非表示（非表示後、右下に再表示ボタンがある）
     * previewBtn: 完成画像の表示・非表示（下に拡大率変更スライダーがある）
     * 四角いの: 背景色変更（８色）
     * zoomIn: 画面の拡大
     * zoomOut: 画面の縮小
     */
    const tips = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "rgba(255,255,255,0.5)",
      width: 300,
      height: 410,
      x: 10,
      y: 10,
      touchable: true,
    });
    let clickCnt = 3;
    x = 5; y = 5;
    this.createTipInfo(tips, "setting", x, y, "各種ボタンの表示・非表示", x + 43, y + 7);
    y += 50;
    this.createTipInfo(tips, "visibleBtn", x, y, "パズルの非表示\n右下に再表示ボタンがある", x + 43, y);
    y += 50;
    this.createTipInfo(tips, "resultBtn", x, y, "ランキングの表示・非表示", x + 43, y + 7);
    y += 50;
    this.createTipInfo(tips, "infoBtn", x, y, "パズル情報の表示・非表示", x + 43, y + 7);
    y += 50;
    this.createTipInfo(tips, "previewBtn", x, y, "完成画像の表示・非表示\n下に拡大率変更スライダー", x + 43, y);
    y += 50;
    this.createTipInfo(tips, undefined, x, y, "背景色変更（８色）", x + 43, y + 7);
    y += 50;
    this.createTipInfo(tips, "zoomIn", x, y, "画面の拡大", x + 43, y + 7);
    y += 50;
    this.createTipInfo(tips, "zoomOut", x, y, "画面の縮小", x + 43, y + 7);
    y += 50;
    const remLbl = new Label({
      scene,
      parent: tips,
      font: newFont("sans-serif", 28, "green"),
      text: `${clickCnt} クリック\nで消えます`,
      textAlign: "right",
      x: 155, y: 340,
      width: 140,
    });
    tips.onPointDown.add(() => {
      if (--clickCnt == 0) {
        tips.destroy();
      } else {
        remLbl.text = `${clickCnt} クリック\nで消えます`;
        remLbl.invalidate();
      }
    })
  }

  private createTipInfo(tips: g.E, src: string | undefined, ix: number, iy: number, text: string, tx: number, ty: number) {
    const font = newFont("sans-serif", 20);
    if (src != undefined) {
      new g.Sprite({
        scene: this.scene,
        parent: tips,
        src: this.scene.asset.getImageById(src),
        x: ix, y: iy,
        scaleX: 0.4, scaleY: 0.4
      });
    } else {
      new g.FilledRect({
        scene: this.scene,
        parent: tips,
        cssColor: this.colors[1],
        x: ix, y: iy,
        width: 38.4, height: 38.4
      })
    }
    new Label({
      scene: this.scene,
      parent: tips,
      font,
      text: text,
      x: tx, y: ty,
      width: 250
    });
  }

  private createUI(p: { w: number, h: number, x: number, y: number, src: string | number, a?: number | boolean }): g.FilledRect {
    const rct = new g.FilledRect({
      scene: this.scene,
      parent: this.display,
      cssColor: "rgba(255,255,255,0.3)",
      width: p.w,
      height: p.h,
      x: p.x, y: p.y,
      touchable: true,
      opacity: typeof p.a == "number" ? p.a : 1,
      hidden: typeof p.a == "boolean"
    });
    if (typeof p.src == "string") {
      new g.Sprite({
        scene: this.scene,
        parent: rct,
        src: this.scene.asset.getImageById(p.src),
        anchorX: 0.5, anchorY: 0.5,
        x: p.w / 2, y: p.h / 2,
        scaleX: 0.7,
        scaleY: 0.7
      });
    } else {
      new g.FilledRect({
        scene: this.scene,
        parent: rct,
        cssColor: this.colors[p.src],
        anchorX: 0.5, anchorY: 0.5,
        x: p.w / 2, y: p.h / 2,
        width: 70, height: 70
      });
    }

    return rct;
  }

}