import { Action, ActionData } from "./Server";


export interface ServerErrorParam {
  message: string;
}

/** パズルアセットを変更する */
export class ServerError implements ActionData<ServerErrorParam> {
  public static readonly TYPE = "ServerError";
  public readonly type = ServerError.TYPE;
  constructor(public param: ServerErrorParam) { }
  public static receive(func: Action<ServerErrorParam>): { type: string, event: Action<ServerErrorParam> } {
    return { type: this.TYPE, event: func };
  }
}