import { Asset } from "../params";
import { PieceScene } from "../PieceScene";


// export interface AssetManagerParam {
//   scene: PieceScene
// }

/**
 * アセットのパズル情報を管理するクラス
 */
export class AssetManager {
  private readonly scene: PieceScene;
  public readonly assets: PazzleAsset[];
  /** 枠画像の配列 [ID][0: 凸, 1: 凹] */
  public readonly wakus: g.ImageAsset[][];

  constructor(scene: PieceScene) {
    this.scene = scene;
    const assetSettings = scene.asset.getText(Asset.ASSET_SETTING_TXT).data.split("\r\n");
    /* assetSettings: string[] のメモ
     * 0: 枠の種類の数（枠は凸・凹２つで１種類）
     * 1: アセットのパズルの種類
     * 
     * n: パズルのID
     * 4n+2: ["パズルのタイトル", "パズルの画像ファイル名"]
     * 4n+3: レベル１のパズル情報 [ピース枚数, ピースの縦幅, ピースの縦幅, 画像を切り始める左上座標X, 左上座標Y]
     * 4n+4: レベル２のパズル情報 [同上]
     * 4n+5: レベル３のパズル情報 [同上]
     */
    // 枠
    this.wakus = [];
    for (let i = 0; i < +assetSettings[0]; i++)
      this.wakus.push([
        this.scene.asset.getImage(`${Asset.WKAU_DIR}/${i}0.png`),
        this.scene.asset.getImage(`${Asset.WKAU_DIR}/${i}1.png`)
      ]);
    // パズル画像・情報
    this.assets = [];
    for (let i = 0; i < +assetSettings[1]; i++)
      this.assets.push(this.createPazzleAsset(i, assetSettings));
  }

  /**
   * @param id パズルID
   * @settings settings [["パズル名", "画像名"], "難易度情報1", "2", "3"]
   */
  private createPazzleAsset(id: number, settings: string[]): PazzleAsset {
    const num = 4 * id;
    // ["パズルのタイトル", "パズルの画像"]
    const tit_fil = settings[num + 2].split(" ");
    return {
      pazzleId: id,
      title: tit_fil[0],
      preview: new g.Sprite({
        scene: this.scene,
        src: this.scene.asset.getImage(`${Asset.ASSET_DIR}/${tit_fil[1]}.jpg`),
      }),
      difficulty: [
        CreateDif(settings[num + 3]),
        CreateDif(settings[num + 4]),
        CreateDif(settings[num + 5]),
      ]
    };
  }

  /**
   * 枠IDの画像イメージアセットを取得する
   * @returns [凸, 凹]
   */
  private createWaku(id: number): g.Sprite[] {
    return [
      new g.Sprite({
        scene: this.scene,
        src: this.scene.asset.getImage(`${Asset.WKAU_DIR}/${id}0.png`)
      }),
      new g.Sprite({
        scene: this.scene,
        src: this.scene.asset.getImage(`${Asset.WKAU_DIR}/${id}1.png`)
      })
    ]
  }
}

/**
 * アセットのパズルの情報
 */
export interface PazzleAsset {
  /** ID */
  pazzleId: number;
  /** パズル名 */
  title: string;
  /** プレビュー画像のスプライト */
  preview: g.Sprite;
  /**
   * パズルの難易度３つ  
   * 0:簡単  1:普通  2:難しい
   */
  difficulty: PzlDifficulty[];
}

/**
 * パズルの難易度
 */
export interface PzlDifficulty {
  /** ピース枚数 */
  count: number;
  /** ピースサイズ */
  size: g.CommonSize;
  /** 原点 左上座標 */
  origin: g.CommonOffset;
}

/** 1行の難易度情報文から PzlDifficulty を生成する */
function CreateDif(s: string): PzlDifficulty {
  const ss = s.split(",");
  return {
    count: +ss[0],
    size: {
      width: +ss[1],
      height: +ss[2]
    },
    origin: {
      x: +ss[3],
      y: +ss[4]
    }
  };
}
