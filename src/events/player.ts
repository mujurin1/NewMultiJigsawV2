import { Action, ActionData } from "../eoc/Server";
import { PlayerParam } from "../models/Player";

export class JoinPlayer implements ActionData<PlayerParam> {
  public static readonly TYPE = "JoinPlayer";
  public readonly type = JoinPlayer.TYPE;
  constructor(public param: PlayerParam) { }
  public static receive(func: Action<PlayerParam>): { type: string, event: Action<PlayerParam> } {
    return { type: this.TYPE, event: func };
  }
}

export interface JoinRequestParam {
  playerID: string,
  name: string
}
export class JoinRequest implements ActionData<JoinRequestParam> {
  public static readonly TYPE = "JoinRequest";
  public readonly type = JoinRequest.TYPE;
  constructor(public param: JoinRequestParam) { }
  public static receive(func: Action<JoinRequestParam>): { type: string, event: Action<JoinRequestParam> } {
    return { type: this.TYPE, event: func };
  }
}

export interface PickParam {
  pieceID: number,
  playerID: string
}
export interface MoveParam {
  pieceID: number,
  playerID: string,
  pos: g.CommonOffset
}
export interface PutParam {
  pieceID: number,
  playerID: string,
  pos: g.CommonOffset
}
export class PickPiece implements ActionData<PickParam> {
  public static readonly TYPE = "PickPiece";
  public readonly type = PickPiece.TYPE;
  constructor(public param: PickParam) { }
  public static receive(func: Action<PickParam>): { type: string, event: Action<PickParam> } {
    return { type: this.TYPE, event: func };
  }
}
export class MovePiece implements ActionData<MoveParam> {
  public static readonly TYPE = "MovePiece";
  public readonly type = MovePiece.TYPE;
  constructor(public param: MoveParam) { }
  public static receive(func: Action<MoveParam>): { type: string, event: Action<MoveParam> } {
    return { type: this.TYPE, event: func };
  }
}
export class PutPiece implements ActionData<PutParam> {
  public static readonly TYPE = "PutPiece";
  public readonly type = PutPiece.TYPE;
  constructor(public param: PutParam) { }
  public static receive(func: Action<PutParam>): { type: string, event: Action<PutParam> } {
    return { type: this.TYPE, event: func };
  }
}