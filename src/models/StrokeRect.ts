
export interface StrokeRectParameterObject extends g.FilledRectParameterObject {
  /** 枠線の太さ */
  borderWidth: number;
}

export class StrokeRect extends g.FilledRect {
  /** 枠線の太さ */
  public borderWidth: number;

  public constructor(params: StrokeRectParameterObject) {
    super(params);

    this.borderWidth = params.borderWidth;
  }


  /**
   * このエンティティ自身の描画を行う。
   * このメソッドはエンジンから暗黙に呼び出され、ゲーム開発者が呼び出す必要はない。
   */
  renderSelf(renderer: g.Renderer): boolean {
    const harf = this.borderWidth / 2;
    // 一番外側の座標
    const left = -harf;
    const top = -harf;
    const right = this.width + this.borderWidth;
    const bottom = this.height + this.borderWidth;

    // 左上から右上
    renderer.fillRect(
      left,
      top,
      right,
      this.borderWidth, this.cssColor);
    // 右上から右下
    renderer.fillRect(
      this.width-harf,
      top,
      this.borderWidth,
      bottom, this.cssColor);
    // 左下から右下
    renderer.fillRect(
      left,
      this.height-harf,
      right,
      this.borderWidth, this.cssColor);
    // 左上から左下
    renderer.fillRect(
      left,
      top,
      this.borderWidth,
      bottom, this.cssColor);
    return true;
  }
}