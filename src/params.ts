
export const Asset = {
  /** アセットのパス`/assets` */
  ASSET_DIR: "/assets",
  /** 全体の設定ファイルパス`/assets/setting.txt` */
  ASSET_SETTING_TXT: `/assets/!.txt`,
  /** 枠画像フォルダ名 */
  WKAU_DIR: `/assets/!`
}

export class GameParams {
  private static _isServer: boolean = false;
  private static _operation: "nicolive" | "atsumaru" | undefined;

  public static liverId: string;
  public static get isOwner() { return this.liverId == g.game.selfId; }
  public static get isServer() { return GameParams._isServer; }
  /** 実行環境  ニコ生 | アツマール  サーバーならundefined */
  public static get operation() { return this._operation; }

  private static _myFitSound: g.AudioAsset;
  public static get myFitSound() { return this._myFitSound; }
  private static _otherFitSound: g.AudioAsset;
  public static get otherFitSound() { return this._otherFitSound; }

  static init() {
    if (typeof window === "undefined")
      this._isServer = true;
    else if (typeof (<any>window).RPGAtsumaru !== "undefined") {
      this._isServer = true;    // アツマールソロの時は自分をサーバーとする
      this._operation = "atsumaru";
    } else
      this._operation = "nicolive";
  }

  static setAsset(scene: g.Scene) {
    scene.onLoad.addOnce(() => {
      this._myFitSound = scene.asset.getAudioById("fit");
      this._otherFitSound = scene.asset.getAudioById("fit2");
    });
  }
}
