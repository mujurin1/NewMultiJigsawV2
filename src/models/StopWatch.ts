import { PieceScene } from "../PieceScene";
import { Piece } from "./Piece";

/**
 * 経過時間を測る  
 * タイマースタート時間からの経過時間で計算する
 */
export class StopWatch {
  private readonly scene: g.Scene;

  /** 開始時の時刻 */
  private startTime: number;
  /** 停止した時の時刻 */
  private stopTime: number | undefined = undefined;

  /** 経過秒数 */
  public get ElapsedTime() {
    return Math.floor(((this.stopTime ?? g.game.getCurrentTime()) - this.startTime) / 1000);
  }

  public get ElapsedTime_HMS() {
    const time = this.ElapsedTime;
    return {
      h: Math.floor(time / 3600),
      m: Math.floor(time / 60) % 60,
      s: time % 60
    };
  }

  constructor(scene: g.Scene) {
    this.scene = scene;
  }

  start() {
    this.startTime = g.game.getCurrentTime();
    this.stopTime = undefined;
  }

  stop() {
    this.stopTime = g.game.getCurrentTime();
  }
}