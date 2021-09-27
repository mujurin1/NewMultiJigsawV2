import * as pl from "@akashic/playlog";
import { GameParams } from "../params";
import { ServerError, ServerErrorParam } from "./ErrorMessage";
import { SceneEx } from "./SceneEx";



/**
 * サーバ、クライアント間で送受信されるイベント
 */
export interface ActionData<Param> {
  type: string;
  param: Param;
}
export type Action<Param> = (e: ActionData<Param>) => void;

export interface ServerParameterObject<Scene extends SceneEx> {
  scene: Scene
}

/**
 * このクラスのインスタンスは Server に唯一存在する
 * 
 * https://github.com/akashic-games/coe/blob/master/packages/coe/src/impl/Scene.ts
 * 上の参照先ではシーンでイベントフィルターしているが、
 * シーンではなく、COEでいうControllerで行う
 */
export abstract class Server<Scene extends SceneEx> {
  public readonly scene: Scene;

  /**
   * クライアントからサーバに送られた StoCEvent を引数に実行するメソッドを入れるやつ
   */
  private readonly ReceiveEvent: { type: string, event: Action<any> }[] = [];
  /**
   * ブロードキャストするイベントデータを保持する配列
   */
  private readonly BroadcastBuffer: ActionData<any>[] = [];
  /** EventFilter.bind(this) したやつ */
  private onEventFiltered_bound: g.EventFilter;

  constructor(params: ServerParameterObject<Scene>) {
    this.scene = params.scene;
    this.onEventFiltered_bound = this.onEventFiltered.bind(this);
    g.game.addEventFilter(this.onEventFiltered_bound);

    this.scene.onUpdate.add(this.update, this);
  }

  public addReceiveMethod(params: { type: string, event: Action<any> }) {
    this.ReceiveEvent.push(params);
  }

  public removeReceiveMethod(type: string, event: Action<any>) {
    for (let i = 0; i < this.ReceiveEvent.length; i++) {
      const re = this.ReceiveEvent[i];
      if (re.type === type && re.event === event) {
        this.ReceiveEvent.splice(i, 1);
        return;
      }
    }
  }

  /** 全クライアントにイベントを送る
   * 
   * ブロードキャストイベントの結果でサーバの次の動作を決めるため、  
   * サーバ側ではブロードキャストしてすぐイベントを実行したい
   * 
   * そのため、送信してすぐにサーバのシーンのイベント受信メソッドが呼び出される
   */
  public broadcast(data: ActionData<any>) {
    try {
      this.scene.receiveEventDo(data);
    } catch (e) {
      this.sendError(`from: broadcast\nname: ${e.name}\nmessage: ${e.message}`);
    }
    this.BroadcastBuffer.push(data);
  }

  /**
   * 時間を進めるためには g.game.raiseTick() を呼ばずにこれを呼べ
   */
  public update() {
    try {
      if (this.BroadcastBuffer.length == 0) return;
      const events = this.BroadcastBuffer.map(e => new g.MessageEvent(e));
      const timestamp = new g.TimestampEvent(Math.floor(g.game.getCurrentTime()), null as any);
      g.game.raiseTick([timestamp, ...events]);
      // 実行したブロードキャストを削除しておく
      this.BroadcastBuffer.length = 0;
    } catch (e) {
      this.sendError(`from: update\nname: ${e.name}\nmessage: ${e.message}`);
    }
  }

  private onEventFiltered(pevs: pl.Event[], { processNext }: g.EventFilterController): pl.Event[] {
    const filtered: pl.Event[] = [];

    for (let i = 0; i < pevs.length; i++) {
      const pev = pevs[i];
      const type = pev[0];

      // 必要な処理かもしれないので忘れないように消さないこと
      // https://github.com/akashic-games/coe/blob/03bb49aaecd6b9a9df6aad987ed2ae6d2b818288/packages/coe/src/impl/Scene.ts#L98-L101
      // https://github.com/akashic-games/coe/blob/093828cad397e177c2eddcc07b3393a0b408cdfa/packages/coe/src/impl/COEController.ts#L49-L63
      // if (this._controller.lockingProcessingMessageEvent) {
      //   processNext(pev);
      //   continue;
      // }

      // g.game.raiseEvent のみフィルターする
      // (クライアントからサーバーに向けて送られたイベントが該当する)
      // MEMO: g.game.raiseEvent がすべてそうなのか？
      if (type === 0x20) {
        this.receiveEvent(pev[3]);
      } else {
        filtered.push(pev);
      }
    }
    return filtered;
  }

  // Bug https://github.com/akashic-games/coe/blob/093828cad397e177c2eddcc07b3393a0b408cdfa/packages/coe/src/impl/COEController.ts
  //     onCOEMessageEventReceived
  private receiveEvent(data: ActionData<any>) {
    try {
      for (let i = 0; i < this.ReceiveEvent.length; i++) {
        const receive = this.ReceiveEvent[i];
        if (receive.type == data.type) {
          receive.event(data);
        }
      }
    } catch (e) {
      this.sendError(`from: receiveEvent\nname: ${e.name}\nmessage: ${e.message}`);
    }
  }

  /** サーバーでエラーが起きた場合にエラーメッセージをクライアントに送信する */
  private sendError(message: string) {
    console.log(message);
    const timestamp = new g.TimestampEvent(Math.floor(g.game.getCurrentTime()), null as any);
    g.game.raiseTick([timestamp, new g.MessageEvent(new ServerError({ message }))]);
  }
}
