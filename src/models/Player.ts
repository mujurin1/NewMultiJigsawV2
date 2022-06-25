import { Piece } from "./Piece";

export interface PlayerParam {
  // userID: string,
  playerID: string,
  name: string
}

export class Player {
  /** ニコニコアカウントID */
  // public readonly userID: string;
  // /**g.PlayerID とは違うオリジナルな値\
  //  * ニコニコアカウントIDではない
  //  */
  public readonly playerID: string;
  public name: string;

  public score: number = 0;
  public rank: number;

  constructor(params: PlayerParam, rank?: number) {
    // this.userID = params.userID;
    this.playerID = params.playerID;
    this.name = params.name;
    this.rank = rank ?? 1;
  }

  public FitPiece() {
    this.score++;
  }

  // public SameUserID(player: Player | undefined): boolean {
  //   return !!player && this.userID == player.userID;
  // }

  public SamePlayerID(player: Player): boolean {
    return !!player && this.playerID == player.playerID;
  }
}