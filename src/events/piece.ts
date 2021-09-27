import { Action, ActionData } from "../eoc/Server";

export interface FitPieceParam {
  pieceID: number;
  playerID: string;
}
export interface ConnectPieceParam {
  parentID: number;
  childID: number;
  playerID: string;
}

/** ピースがハマった */
export class FitPiece implements ActionData<FitPieceParam> {
  public static readonly TYPE = "FitPiece";
  public readonly type = FitPiece.TYPE;
  constructor(public param: FitPieceParam) { }
  public static receive(func: Action<FitPieceParam>): { type: string, event: Action<FitPieceParam> } {
    return { type: this.TYPE, event: func };
  }
}
/** ピースがくっついた */
export class ConnectPiece implements ActionData<ConnectPieceParam> {
  public static readonly TYPE = "ConnectPiece";
  public readonly type = ConnectPiece.TYPE;
  constructor(public param: ConnectPieceParam) { }
  public static receive(func: Action<ConnectPieceParam>): { type: string, event: Action<ConnectPieceParam> } {
    return { type: this.TYPE, event: func };
  }
}
