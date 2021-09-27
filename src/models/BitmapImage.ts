import { GameParams } from "../params";

export interface BitmapImageParameterObject extends g.EParameterObject {
  colorBuffer: g.ImageData;
}

export class BitmapImage extends g.E {
  backSurface: g.Surface;
  imageData: g.ImageData;
  colorBuffer: g.ImageData; // RGBA

  constructor(param: BitmapImageParameterObject) {
    super(param);

    this.backSurface = g.game.resourceFactory.createSurface(this.width, this.height);
    this.imageData = this.backSurface.renderer()._getImageData(0, 0, this.width, this.height);

    this.colorBuffer = param.colorBuffer;
  }

  renderSelf(renderer: g.Renderer, camera?: g.Camera): boolean {
    // // サーバーの場合 this.imageData が null でこの後エラー出るしどうせ画面無いしで何もしない
    // if (GameParams.isServer) return;

    // colorBuffer2ImageData(this.imageData);
    const data = this.imageData.data;
    for (let i = 0; i < data.length; i++) {
      data[i] = this.colorBuffer.data[i];
    }
    this.backSurface.renderer()._putImageData(this.imageData, 0, 0);

    renderer.save();
    renderer.drawImage(this.backSurface, 0, 0, this.backSurface.width, this.backSurface.height, 0, 0);
    renderer.restore();

    return true;
  }
}

