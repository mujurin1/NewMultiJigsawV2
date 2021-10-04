import { Action, ActionData } from "../eoc/Server";

export interface ChangePageParam {
  /** T:タイトル  S:パズル開始 */
  page: "T" | "S";
}
export class ChangePage implements ActionData<ChangePageParam> {
  public static readonly TYPE = "ChangePage";
  public readonly type = ChangePage.TYPE;
  constructor(public param: ChangePageParam) { }
  public static receive(func: Action<ChangePageParam>): { type: string, event: Action<ChangePageParam> } {
    return { type: this.TYPE, event: func };
  }
}

export interface ShareImageParam {
  jpgByteChars: string;
  width: number;
  height: number;
}
export class ShareImage implements ActionData<ShareImageParam> {
  public static readonly TYPE = "ShareImage";
  public readonly type = ShareImage.TYPE;
  constructor(public param: ShareImageParam) { }
  public static receive(func: Action<ShareImageParam>): { type: string, event: Action<ShareImageParam> } {
    return { type: this.TYPE, event: func };
  }
}

export interface EditParam {
  type: "Size" | "Origin";
  data: number[];
}
export class Edit implements ActionData<EditParam> {
  public static readonly TYPE = "Edit";
  public readonly type = Edit.TYPE;
  constructor(public param: EditParam) { }
  public static receive(func: Action<EditParam>): { type: string, event: Action<EditParam> } {
    return { type: this.TYPE, event: func };
  }
}