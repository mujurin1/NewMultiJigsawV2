import { Action, ActionData } from "../eoc/Server";

export interface ChangePazzleParam {
  isRight: boolean
}
export interface ChangeDefficultyParam {
  dif: number
}

/** パズルアセットを変更する */
export class ChangePazzle implements ActionData<ChangePazzleParam> {
  public static readonly TYPE = "ChangePreview";
  public readonly type = ChangePazzle.TYPE;
  constructor(public param: ChangePazzleParam) { }
  public static receive(func: Action<ChangePazzleParam>): { type: string, event: Action<ChangePazzleParam> } {
    return { type: this.TYPE, event: func };
  }
}
/** 難易度を変更する */
export class ChangeDefficulty implements ActionData<ChangeDefficultyParam> {
  public static readonly TYPE = "ChangeDefficulty";
  public readonly type = ChangeDefficulty.TYPE;
  constructor(public param: ChangeDefficultyParam) { }
  public static receive(func: Action<ChangeDefficultyParam>): { type: string, event: Action<ChangeDefficultyParam> } {
    return { type: this.TYPE, event: func };
  }
}
/** ユーザー画像パズルページに遷移 */
export class UserPuzzle implements ActionData<undefined> {
  public static readonly TYPE = "UserPuzzle";
  public readonly type = UserPuzzle.TYPE;
  constructor(public param: undefined) { }
  public static receive(func: Action<undefined>): { type: string, event: Action<undefined> } {
    return { type: this.TYPE, event: func };
  }
}
/** パズルを開始する パズルのくっつく許容値 */
export class StartPazzle implements ActionData<number> {
  public static readonly TYPE = "StartPazzle";
  public readonly type = StartPazzle.TYPE;
  constructor(public param: number) { }
  public static receive(func: Action<number>): { type: string, event: Action<number> } {
    return { type: this.TYPE, event: func };
  }
}
/** パズルが完成した */
export class PazzleComplete implements ActionData<string> {
  public static readonly TYPE = "ClearPazzle";
  public readonly type = PazzleComplete.TYPE;
  constructor(public param: string) { }
  public static receive(func: Action<string>): { type: string, event: Action<string> } {
    return { type: this.TYPE, event: func };
  }
}
