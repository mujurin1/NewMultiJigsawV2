import { Label, LabelParameterObject } from "@akashic-extension/akashic-label";
import { ShareImageParam } from "../events/userPazzle";
import { Image as JpgImage } from "./jpeg/image";

/**
 * `Label` のサイズを横幅に合わせる
 * `label` の `widthAutoAdjust` が `true` でないといけない\
 * `label` の `lineBreak` が `false` でないといけない
 * @param label ラベル
 * @param width 合わせる横幅
 */
export function labelAutoReSizeW(label: Label, width: number) {
  label.scale(1);
  label.invalidate();

  let sx = width / label.width;
  if (sx < 1) {
    label.scale(sx);
    label.modified();
    label.invalidate();
  }
}


/**
 * `g.Sprite` 画像をエリアの最大かつ中心になるよう調整する
 * @param wid 調整する基準の幅
 * @param hei 調整する基準の高さ
 */
export function spriteSet(spr: g.E, wid: number, hei: number) {
  spr.x = 0;
  spr.y = 0;
  const widPer = wid / spr.width;
  const heiPer = hei / spr.height;
  // 比率が `widPer == heiPer == 1.0` の場合無駄な処理になるけどまず無いしいいや
  if (widPer > heiPer) {         // プレビューエリアに対してパズルが横長
    // より小さい方に合わせて伸縮させる
    spr.scale(heiPer);
    // 小さい方は下が余ってるので真ん中に動かす
    spr.x = (wid - spr.width * spr.scaleX) / 2;
  } else {                      // プレビューエリアに対してパズルが縦長
    spr.scale(widPer);
    spr.y = (hei - spr.height * spr.scaleY) / 2;
  }
  spr.modified();
}

/**
 * `Label` のサイズを縦幅に合わせる
 * `label` の `widthAutoAdjust` が `false` でないといけない\
 * `label` の `lineBreak` が `true` でないといけない
 * @param label ラベル
 * @param width 合わせる縦幅
 * @param height 合わせる縦幅
 */
export function labelAutoReSizeH(label: Label, width: number, height: number) {
  label.invalidate();

  label.width = width;
  label.modified();
  label.invalidate()
  while (height < label.height) {
    label.width *= 2;
    height *= 2;
    label.scale(label.scaleX / 2);
    label.modified();
    label.invalidate()
  }
}

export function newFont(fontFamily: string, size: number, fontColor?: string): g.DynamicFont {
  fontColor = fontColor == undefined ? "brack" : fontColor;
  return new g.DynamicFont({
    game: g.game,
    fontFamily,
    size,
    fontColor,
  });
}


let dropEvent: (e: DragEvent) => any | undefined = undefined;

/** ドラッグアンドドロップを受け付ける */
export function addDragDrop(func: (e: DragEvent) => any) {
  if (dropEvent != undefined) return;
  dropEvent = func;

  const cnvs = document.getElementsByTagName("canvas");
  const cnv = cnvs[0];
  cnv.addEventListener("dragover", dragover);
  cnv.addEventListener("drop", dropEvent);
}

/** ドラッグアンドドロップ受け付けを解除する */
export function removeDropFile() {
  if (dropEvent == undefined) return;

  const cnvs = document.getElementsByTagName("canvas");
  const cnv = cnvs[0];
  cnv.removeEventListener("dragover", dragover);
  cnv.removeEventListener("drop", dropEvent);
  dropEvent = undefined;
}

function dragover(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = "copy";
}

// export function ConvertBase64(arrayB: ArrayBuffer): Promise<ShareImageParam> {
//   const blob = new Blob([arrayB], {
//     type: "image/png"
//   });
//   return new Promise((resolve, reject) => {
//     createImageBitmap(blob).then(bmp => {
//       const cnv: HTMLCanvasElement = document.createElement("canvas");
//       cnv.width = bmp.width;
//       cnv.height = bmp.height;
//       const ctx = cnv.getContext("2d");
//       ctx.drawImage(bmp, 0, 0);
//       const base64 = cnv.toDataURL("image/jpeg");
//       resolve({
//         base64,
//         width: bmp.width,
//         height: bmp.height
//       });
//     });
//   });
// }

export function ConvertJpgImage(arrayB: ArrayBuffer): Promise<JpgImage> {
  const blob = new Blob([arrayB], {
    type: "image/png"
  });
  return new Promise((resolve, reject) => {
    createImageBitmap(blob).then(bmp => {
      const cnv: HTMLCanvasElement = document.createElement("canvas");
      cnv.width = bmp.width;
      cnv.height = bmp.height;
      const ctx = cnv.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      resolve(new JpgImage(ctx.getImageData(0, 0, cnv.width, cnv.height)));
      // const base64 = cnv.toDataURL("image/jpeg");
      // resolve({
      //   base64,
      //   width: bmp.width,
      //   height: bmp.height
      // });
    });
  });
}

export function base64ToArrayBuffer(base64: string) {
  base64 = base64.split(",")[1];

  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export function createFillLabel(frParam: g.FilledRectParameterObject, lbParam: LabelParameterObject): g.FilledRect {
  const back = new g.FilledRect(frParam);
  new Label({ ...lbParam, parent: back, width: back.width - (lbParam.x ?? 0) });
  return back;
}

/** 上下にスクロールできるラベル入りPaneを作成 */
export function createScrollLabel(frParam: g.FilledRectParameterObject, lbParam: LabelParameterObject): g.Pane {
  const pane = new g.Pane(frParam);
  const board = new g.FilledRect({ ...frParam, parent: pane, x: 0, y: 0, touchable: true });
  const text = new Label({ ...lbParam, parent: pane, width: pane.width - (lbParam.x ?? 0) });

  board.onPointMove.add(e => {
    text.y += e.prevDelta.y;
    if (text.y < pane.height - text.height)
      text.y = pane.height - text.height;
    if (text.y > 0)
      text.y = 0;
    text.modified();
  });

  return pane;
}

// export function numAryToString(ary: number[]): string {

// }

// function numToC(n: number): string {

// }