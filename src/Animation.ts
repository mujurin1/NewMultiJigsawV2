import { Confetti, Fin } from "kamihubuki-js";

/**
 * クリア後の紙吹雪等の演出用。
 */
export class Animation {
  private static windX = 0;
  private static windY = 0;
  private static colors = [
    "blue", "navy", "teal", "green",
    "lime", "aqua", "yellow", "red",
    "fuchsia", "olive", "purple", "maroon"
  ];
  private static colorIndex = 0;

  private scene: g.Scene;

  /** 演出を表示するレイヤー。 */
  display: g.E;

  // ======================================= 紙吹雪用のプロパティ =======================================
  /** 紙吹雪アニメーションを間引くための値。 */
  private _confettiMabiku: number = 0;
  /** 生成した紙吹雪のエンティティ。 */
  private _confittis: g.E[];

  /** アニメーションをしているか。 */
  private animationg: boolean;

  constructor(scene: g.Scene) {
    this.scene = scene;
    this.display = new g.E({ scene });
    this.animationg = false;
    this._confittis = new Array();
  }

  /**
   * アニメーションを開始する。
   */
  public start() {
    this.animationg = true;
    this.scene.onUpdate.add(this.confettiAnimation, this);
  }

  /**
   * アニメーションを停止する。
   */
   public  stop() {
    this.animationg = false;
    this.scene.onUpdate.remove(this.confettiAnimation, this);
    for(let c of this._confittis) {
      if(c.destroyed()) continue;
      c.destroy();
    }
    this._confittis = new Array();
  }

  /**
   * 紙吹雪のアニメーション。
   */
  private confettiAnimation(): void {
    if(g.game.isSkipping) return;
    if(!this.animationg) return;

    this._confettiMabiku = ++this._confettiMabiku % 3;
    if(this._confettiMabiku != 0) return;

    const co = this.createConfetti(random(0, g.game.width), -5);
    const coE = this.createConfettiEntity(co, true);
    this.display.append(coE);
  }

  /**
   * `紙吹雪の実体` を生成する。
   */
  private createConfetti(x: number, y: number): Confetti {
    const vx = 0;
    const vy = 200;
    const angle = random(0, 100) / 100 * Math.PI;

    const fins: Fin[] = [
      {
        angle: random(-100, 100) / 100 * (Math.PI / 2),
        size: 30,
        armAngle: 0,
        armLength: 1
      },
      {
        angle: random(-100, 100) / 100 * (Math.PI / 2),
        size: 30,
        armAngle: random(50, 100) / 100 * Math.PI,
        armLength: 1
      }
    ];
    const co = new Confetti({
      x: x, y: y,
      vx: vx, vy: vy,
      angle: angle,
      fins: fins,
      av: 0,
      M: 0.5,
      K: 0.02,
      I: 3,
      RD: 0.99,
    });
    return co;
  }

  /**
   * `紙吹雪のエンティティ` を生成する。
   */
  private createConfettiEntity(co: Confetti, noCollision: boolean): g.E {
    const w = 20;
    const h = 10;
    const w2 = w / 2;
    const h2 = h / 2;

    const rect = new g.FilledRect({
      scene: this.scene,
      width: w,
      height: h,
      x: co.x - w2,
      y: co.y - h2,
      local: true,
      cssColor: Animation.colors[Animation.colorIndex]
    });
    this._confittis.push(rect);

    Animation.colorIndex = (Animation.colorIndex + 1) % Animation.colors.length;

    rect.onUpdate.add(() => {
      co.update(1 / g.game.fps, Animation.windX, Animation.windY, 0, 200);

      if (noCollision) {
        if (co.x < 0 || co.x > g.game.width || co.y > g.game.height) {
          rect.destroy();
        }
      } else {
        const k = 0.5;
        if (co.x < 0) {
          co.x = 0;
          co.vx = Math.abs(co.vx) * k;
        } else if (co.x > g.game.width) {
          co.x = g.game.width;
          co.vx = -Math.abs(co.vx) * k;
        }
        if (co.y < -g.game.height) {
          co.y = -g.game.height;
          co.vy = 0;
        } else if (co.y > g.game.height) {
          co.y = g.game.height;
          co.vy = -Math.abs(co.vy) * k;
        }
      }

      rect.x = co.x - w2;
      rect.y = co.y - h2;
      rect.angle = -co.angle / Math.PI * 180;
      rect.modified();
    });

    return rect;
  }

}

/**
 * `min` 以上 `max` 以下の乱数を返す。  
 * 乱数は環境によって変わるので、グローバルでは使うな。
 * @param min 最低値
 * @param max 最高値
 */
function random(min: number, max: number): number {
  let range = max - min + 1;
  let r = Math.floor(Math.random() * range);
  return r + min;
}
