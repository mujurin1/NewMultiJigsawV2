import { spriteSet } from "./lib/funcs";
import { Slider } from "./models/Slider";

export class Preview {
  public readonly display: g.E;

  constructor(scene: g.Scene, preview: g.Sprite) {
    this.display = new g.E({
      scene,
      width: g.game.width,
      height: g.game.height,
      hidden: true
    });

    // プレビュー画像の後ろに入れる黒いやつ
    const back = new g.FilledRect({
      scene,
      parent: this.display,
      cssColor: "rgba(0,0,0,0.5)",
      width: 860,
      height: 540,
      x: 55, y: 37,
      local: true,
      touchable: true
    });
    // 範囲外を表示しないようにするペイン
    const view = new g.Pane({
      scene,
      parent: back,
      width: back.width,
      height: back.height
    });
    // プレビュー画像を追加全体が見えるようにスケールチェンジ
    view.append(preview);
    spriteSet(preview, back.width, back.height);
    /** 最小の拡大率 */
    const minScale = preview.scaleX;
    /** 最小の拡大率の時の画像サイズ */
    const minSize: g.CommonSize = {
      width: preview.width * minScale,
      height: preview.height * minScale
    };
    /** 最小の拡大率の時の余白 */
    const minMargin: g.CommonOffset = {
      x: (back.width - minSize.width) / 2,
      y: (back.height - minSize.height) / 2
    };


    const prvLimitCheck = () => {
      if (preview.x > minMargin.x) {
        preview.x = minMargin.x;
      } else {
        const relativeScale = preview.scaleX / minScale;
        const leftLimit = minMargin.x + minSize.width - (minSize.width * relativeScale);
        // 上に動かした時の限界値
        if (preview.x < leftLimit)
          preview.x = leftLimit;
      }
      if (preview.y > minMargin.y) {
        preview.y = minMargin.y;
      } else {
        const relativeScale = preview.scaleX / minScale;
        const upLimit = minMargin.y + minSize.height - (minSize.height * relativeScale);
        // 上に動かした時の限界値
        if (preview.y < upLimit)
          preview.y = upLimit;
      }
    };

    back.onPointMove.add(e => {
      preview.moveBy(e.prevDelta.x, e.prevDelta.y);
      prvLimitCheck();
      preview.modified();
    });

    const slider = new Slider({
      scene,
      parent: this.display,
      width: 300, height: 100,
      x: 330, y: 600,
      min: minScale,
      max: 10,
      quadratic: 2
    });
    slider.onValueChange.add(n => {
      // 見えているエリアの中心に向かって拡大するようにする
      const sa = preview.scaleX - n;
      // 最小の拡大率を１とした時の現在の拡大率
      const relativeScale = preview.scaleX / minScale;
      preview.x += ((-preview.x + minMargin.x) / preview.scaleX + preview.width / relativeScale / 2) * sa;
      preview.y += ((-preview.y + minMargin.y) / preview.scaleX + preview.height / relativeScale / 2) * sa;

      preview.scale(n);
      prvLimitCheck();
      preview.modified();
    });
  }
}