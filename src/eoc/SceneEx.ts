import { GameParams } from "../params";
import { ActionData, Action } from "./Server";



/**
 * 各クライアントに１つだけ存在する  
 * サーバーからのイベントを受け取る  
 * サーバーへイベントを送る
 */
export abstract class SceneEx extends g.Scene {
  private readonly ReceiveEvent: { owner?: any, type: string, event: Action<any> }[] = [];

  constructor(params: g.SceneParameterObject) {
    super({
      local: "interpolate-local",
      tickGenerationMode: "manual",
      ...params
    });

    // サーバーは、ブロードキャストで送られたグローバルイベントは実行しない
    if (!GameParams.isServer)
      this.onMessage.add(this.receiveEvent, this);
  }

  public send(data: ActionData<any>) {
    g.game.raiseEvent(new g.MessageEvent(data));
  }

  public addReceiveMethod(param: { type: string, event: Action<any> }, owner?: any) {
    this.ReceiveEvent.push({owner, ...param});
  }

  public removeReceiveMethod(param: { type: string, event: Action<any> }, owner?: any) {
    for (let i = 0; i < this.ReceiveEvent.length; i++) {
      const re = this.ReceiveEvent[i];
      if (re.type === param.type && re.event === param.event && re.owner == owner) {
        this.ReceiveEvent.splice(i, 1);
        return;
      }
    }
  }

  /**
   * サーバーからブロードキャストされたイベントを受け取った時に呼ばれる
   */
  private receiveEvent(e: g.MessageEvent) {
    if (e.data == null) return;
    this.receiveEventDo(e.data);
  }

  /**
   * サーバーからブロードキャストされたイベントを受け取った時に呼ばれる
   * 
   * サーバーがブロードキャストするタイミングにも、このメソッドを呼ぶ
   */
  public receiveEventDo(data: any) {
    for (let i = 0; i < this.ReceiveEvent.length; i++) {
      const receive = this.ReceiveEvent[i];
      if (receive.type == data.type)
        receive.event.call(receive.owner, data);
    }
  }
}