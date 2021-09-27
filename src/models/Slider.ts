
export interface SliderParams extends g.EParameterObject {
  /** 最初のつまみの位置 */
  per?: number,
  min?: number,
  max: number,
  /** 初期値 50 */
  gripWidth?: number,
  width: number,
  height: number,
  /** スライダーの上昇量曲線 */
  quadratic?: number,
}

export class Slider {
  public readonly onBarDown: g.Trigger<number> = new g.Trigger();
  public readonly onSliderMove: g.Trigger<number> = new g.Trigger();
  public readonly onSliderUp: g.Trigger<number> = new g.Trigger();
  public readonly onValueChange: g.Trigger<number> = new g.Trigger();
  public readonly display: g.E;

  private readonly grip: g.FilledRect;

  /** スライダーの上昇量曲線 */
  public quadratic: number;
  public per: number;
  public min: number;
  public max: number;

  public value: number;

  constructor(params: SliderParams) {
    const display = new g.E({
      touchable: false,
      ...params
    });
    this.display = display;
    const scene = display.scene;
    this.per = params.per ?? 0;
    this.min = params.min ?? 0;
    this.max = params.max;
    this.quadratic = params.quadratic ?? 1;

    const bar = new g.FilledRect({
      scene,
      parent: display,
      anchorY: 0.5,
      cssColor: "rgba(255,255,255,0.8)",
      y: params.height / 2,
      width: display.width,
      height: display.height / 2,
      touchable: true
    });
    display.append(bar);
    this.grip = new g.FilledRect({
      scene,
      parent: display,
      anchorX: 0.5,
      cssColor: "rgba(0,0,0,0.8)",
      x: display.width * this.per,
      width: params.gripWidth ?? 50,
      height: display.height,
      touchable: true
    });
    display.append(this.grip);

    bar.onPointDown.add(e => {
      if (e.point.x < this.grip.x) {
        this.per = this.per - 0.1;
        if (this.per < 0) this.per = 0;
      }
      else {
        this.per = this.per + 0.1;
        if (this.per > 1) this.per = 1;
      }
      this.grip.x = display.width * this.per;
      this.grip.modified();
      this.value = (this.max - this.min) * this.per + this.min;
      this.onBarDown.fire(this.value);
      this.onValueChange.fire(this.value);
    });

    this.grip.onPointMove.add(e => {
      this.gripMoveBy(e.prevDelta.x);
      this.onSliderMove.fire(this.value);
      this.onValueChange.fire(this.value);
    });
    this.grip.onPointUp.add(e => {
      this.onSliderUp.fire(this.value);
    })
  }

  private gripMoveBy(x: number) {
    this.grip.x += x;
    if (this.grip.x < 0) {
      this.grip.x = 0;
      this.per = 0;
    } else if (this.grip.x > this.display.width) {
      this.grip.x = this.display.width;
      this.per = 1;
    } else {
      this.per = this.grip.x / this.display.width;
    }
    this.grip.modified();
    this.value = (this.max - this.min) * Math.pow(this.per, this.quadratic) + this.min;
  }
}