import { PazzleAsset, PzlDifficulty } from "../models/AssetManager";
import { PieceScene } from "../PieceScene";

/**
 * 切り抜くのに必要な情報  
 * `size` は `image` のサイズの約数（割り切れる値）にすること
 */
export interface CutParam {
  scene: PieceScene;
  /** パズルのID アツマールでスコアボードに利用する */
  pazzleID: number;
  /** パズルの難易度 アツマールでスコアボードに利用する */
  level: number;
  /** 枠の配列 */
  wakus: g.ImageAsset[];
  // パズル画像
  previewSrc: g.Sprite;
  // パズル生成のための情報
  difficulty: PzlDifficulty;
}

/**
 * パズルを始めるのに必要な情報
 */
export interface CreatePazzleParam {
  /** パズルのID アツマールでスコアボードに利用する */
  pazzleID: number;
  /** パズルの難易度 アツマールでスコアボードに利用する */
  level: number;
  /** パズルのタイトル */
  title: string;
  /** プレビュー画像 */
  preview: g.Sprite;
  /** 切り抜いたピースが並んだ画像 */
  piecesSrc: g.Sprite;
  /** ピースの正解の座標 */
  answerPos: g.CommonOffset[];
  /** くっ付くピースID
   *  [Piece_N][...Piece_Nとくっ付く他のPieceID]
  */
  connectIds: number[][];
  /** ピースを切り抜くための情報 */
  cutInfo: g.CommonArea[];
}

/**
 * プレビュー画像からピース画像に切り抜く
 */
export function pieceCut(params: CutParam): CreatePazzleParam {
  const scene = params.scene;
  // const asset = params.asset;
  // const pzlDif = asset.difficulty[params.difficulty];
  const previewSrc = params.previewSrc;
  const pzlDif = params.difficulty;

  // 計算に一時的に利用するだけの値：
  //   プレビュー画像のパズルにし始める座標(origin)から画像右下までのサイズ
  const originToLast: g.CommonSize = {
    width: previewSrc.width - pzlDif.origin.x,
    height: previewSrc.height - pzlDif.origin.y
  }
  /**origin からピースをはみ出ないように最大数並べた領域のサイズ  
   * つまり、パズルにするプレビューのサイズ
  */
  const previewSize: g.CommonSize = {
    width: originToLast.width - (originToLast.width % pzlDif.size.width),
    height: originToLast.height - (originToLast.height % pzlDif.size.height),
  }

  // パズルのピースの行列数
  const piece_W_Cnt = previewSize.width / pzlDif.size.width;
  const piece_H_Cnt = previewSize.height / pzlDif.size.height;

  // ================================ その他情報 ================================
  const overlapW = pzlDif.size.width / 4;
  const overlapH = pzlDif.size.height / 4;
  // 上左右下があるかどうか
  const isT = (id: number): boolean => id >= piece_W_Cnt;
  const isL = (id: number): boolean => id % piece_W_Cnt != 0;
  const isR = (id: number): boolean => id % piece_W_Cnt != piece_W_Cnt - 1;
  const isB = (id: number): boolean => id < piece_W_Cnt * (piece_H_Cnt - 1);
  // ピースの数
  const count = piece_H_Cnt * piece_W_Cnt;



  // 返すやつ
  const answerPos: g.CommonOffset[] = new Array(count);
  const connectIds: number[][] = new Array(count);
  const cutInfo: g.CommonArea[] = new Array(count);
  for (let i = 0; i < count; i++)
    connectIds[i] = new Array();

  // ================================= プレビューを作成 =================================
  const preview = new g.Sprite({
    scene,
    src: previewSrc.src,
    srcX: pzlDif.origin.x,
    srcY: pzlDif.origin.y,
    width: previewSize.width,
    height: previewSize.height,
  });

  // ================================= 全体図を作成 =================================
  const view = new g.E({
    scene,
  });
  const img = new g.Sprite({
    scene,
    src: previewSrc.src,
  });

  const newView = (putP: g.CommonOffset, getP: g.CommonOffset, s: g.CommonSize) => {
    const e = new g.Pane({
      scene,
      width: Math.ceil(s.width),
      height: Math.ceil(s.height),
      x: putP.x,
      y: putP.y,
    });
    img.x = -getP.x - pzlDif.origin.x;
    img.y = -getP.y - pzlDif.origin.y;
    img.modified();
    e.append(img);
    view.append(g.SpriteFactory.createSpriteFromE(scene, e));
  }
  let size: g.CommonSize;
  const putP: g.CommonOffset = { x: 0, y: 0 };
  for (let r = 0; r < piece_H_Cnt; r++) {
    putP.x = 0;
    for (let c = 0; c < piece_W_Cnt; c++) {
      const id = r * piece_W_Cnt + c;
      const getP: g.CommonOffset = {
        x: c * pzlDif.size.width,
        y: r * pzlDif.size.height,
      };
      // ここで値のコピーを取りたいため作り直す = pzlDif だと参照コピーなのでダメ
      size = { width: pzlDif.size.width, height: pzlDif.size.height };

      if (isT(id)) {
        getP.y -= overlapH;
        size.height += overlapH;
        connectIds[id].push(id - piece_W_Cnt);
      }
      if (isL(id)) {
        getP.x -= overlapW;
        size.width += overlapW;
        connectIds[id].push(id - 1);
      }
      if (isR(id)) {
        size.width += overlapW;
        connectIds[id].push(id + 1);
      }
      if (isB(id)) {
        size.height += overlapH;
        connectIds[id].push(id + piece_W_Cnt);
      }
      newView(putP, getP, size);
      putP.x += size.width;
    }
    putP.y += size.height;
  }
  // ここまででプレビュー画像を切って配置が出来た

  // ============================== 切り抜くピース情報を作成 ==============================
  /* 
   * 切り抜く枠 `wakuAry`
   * 値%2             : 0: 凸  1: 凹
   * Math.floor(値/2) : 枠の種類
   */
  const WAKU_TYPES = params.wakus.length / 2;

  // 切り抜く枠の種類
  const wakuAry: number[] = new Array(piece_W_Cnt * 2 * piece_H_Cnt);
  for (let i = 0; i < wakuAry.length; i++) {
    wakuAry[i] = Math.floor(g.game.random.generate() * WAKU_TYPES * 2);
  }

  // 枠の拡大率
  const scaleX = (pzlDif.size.width + overlapW * 2) / params.wakus[0].width;
  const scaleY = (pzlDif.size.height + overlapH * 2) / params.wakus[0].height;

  // ================================ 枠を重ねる ================================
  const put = (p: g.CommonOffset, wakuId: number, angle: number): void => {
    // 拡大率と枠のサイズ回転角で変わる
    let sx: number, sy: number, wW: number, wH: number;
    if (angle == 0 || angle == 180) {
      sx = scaleX;
      sy = scaleY;
    } else {
      sx = scaleY;
      sy = scaleX;
    }
    wW = params.wakus[wakuId].width * sx;
    wH = params.wakus[wakuId].height * sy;
    // 前は下２行はなかった
    // wW = Math.ceil(wW);
    // wH = Math.ceil(wH);

    const a = new g.Sprite({
      scene,
      src: params.wakus[wakuId],
      scaleX: sx,
      scaleY: sy,
      angle: angle,
      compositeOperation: "destination-out",
    });

    if (angle == 0) {              // 無回転
      a.x = p.x;
      a.y = p.y;
    } else if (angle == 180) {     // 上下反対回転
      a.x = p.x + wW;
      a.y = p.y + wH;
    } else if (angle == 90) {      // 右に一回転
      a.x = p.x + wH;
      a.y = p.y;
    } else if (angle == -90) {     // 左に一回展
      a.x = p.x;
      a.y = p.y + wW;
    }
    // 前は下１行はなかった
    // a.x = Math.floor(a.x);
    // 前は下２行があった
    a.x = Math.ceil(a.x);
    a.y = Math.ceil(a.y);

    a.modified();

    view.append(a);
  }

  putP.y = -overlapH;
  for (let r = 0; r < piece_H_Cnt; r++) {
    putP.x = -overlapW;
    for (let c = 0; c < piece_W_Cnt; c++) {
      const pos: g.CommonOffset = {
        x: c * (pzlDif.size.width + overlapW * 2),
        y: r * (pzlDif.size.height + overlapH * 2)
      };
      // ここで値のコピーを取りたいため作り直す = pzlDif だと参照コピーなのでダメ
      const size: g.CommonSize = {
        width: pzlDif.size.width,
        height: pzlDif.size.height
      };

      const id = r * piece_W_Cnt + c;
      // 自分の右側の枠の位置
      const migi = piece_W_Cnt * 2 * Math.floor(id / piece_W_Cnt) + id % piece_W_Cnt;
      if (isT(id)) {
        const wId = wakuAry[migi - piece_W_Cnt];
        put(putP, wId, 0);
        if (wId % 2 == 0) {
          pos.y -= overlapH;
          size.height += overlapH;
        }
      }
      if (isL(id)) {
        const wId = wakuAry[migi - 1];
        put(putP, wId, -90);
        if (wId % 2 == 0) {
          pos.x -= overlapW;
          size.width += overlapW;
        }
      }
      if (isR(id)) {
        const wId = (wakuAry[migi] + 1) % 2;
        put(putP, wId, 90);
        if (wId % 2 == 0) size.width += overlapW;
      }
      if (isB(id)) {
        const wId = (wakuAry[migi + piece_W_Cnt] + 1) % 2;
        put(putP, wId, 180);
        if (wId % 2 == 0) size.height += overlapH;
      }
      answerPos[id] = {
        x: pos.x - overlapW * 2 * c,
        y: pos.y - overlapH * 2 * r,
      };
      cutInfo[id] = {
        x: pos.x,
        y: pos.y,
        // 各ピースの右と下が１ピクセル切れるのを直したかった （今はしてない、ここじゃないし コメントアウトがそれね）
        width: size.width + 1,
        height: size.height + 1
      };
      putP.x += pzlDif.size.width + overlapW * 2;
    }
    putP.y += pzlDif.size.height + overlapH * 2;
  }

  const pane = new g.Pane({
    scene,
    width: (piece_W_Cnt - 1) * (pzlDif.size.width + overlapW * 2) + pzlDif.size.width,
    height: (piece_H_Cnt - 1) * (pzlDif.size.height + overlapH * 2) + pzlDif.size.height,
  });
  pane.append(view);

  const piecesSrc = g.SpriteFactory.createSpriteFromE(scene, pane);

  return {
    pazzleID: params.pazzleID,
    level: params.level,
    title: "",
    preview,
    piecesSrc,
    answerPos,
    connectIds,
    cutInfo
  };
}