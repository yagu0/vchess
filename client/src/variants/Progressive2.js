import { Progressive1Rules } from "@/variants/Progressive1";
import { SuicideRules } from "@/variants/Suicide";
import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class Progressive2Rules extends Progressive1Rules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { twoSquares: false }
    );
  }

  static get HasFlags() {
    return false;
  }

  postPlay(move) {
    const c = move.turn[0];
    const piece = move.vanish[0].p;
    if (piece == V.KING && move.appear.length > 0) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
    }
  }

  undo(move) {
    V.UndoOnBoard(this.board, move);
    if (this.turn != move.turn[0]) this.movesCount--;
    this.turn = move.turn[0];
    this.subTurn = move.turn[1];
    super.postUndo(move);
  }

  static GenRandInitFen(randomness) {
    return SuicideRules.GenRandInitFen(randomness);
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 7, //slightly less than in orthodox game
      k: 1000
    };
  }

};
