import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export class RugbyRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.PAWN] }
    );
  }

  scanKings() {}

  getPotentialMovesFrom(sq) {
    // There are only pawns:
    return this.getPotentialPawnMoves(sq);
  }

  getPotentialPawnMoves(sq) {
    const moves = super.getPotentialPawnMoves(sq);
    // Add king movements, without capturing
    const steps =
      this.turn == 'w'
        ? [ [-1,-1], [-1,1], [0,1], [0,-1], [1,-1], [1,0], [1,1] ]
        : [ [1,-1], [1,1], [0,1], [0,-1], [-1,-1], [-1,0], [-1,1] ];
    let addMoves = this.getSlideNJumpMoves(sq, steps, "oneStep");
    return moves.concat(addMoves.filter(m => m.vanish.length == 1));
  }

  static GenRandInitFen() {
    // Non-randomized variant. En-passant possible:
    return "pppppppp/8/8/8/8/8/8/PPPPPPPP w 0 -";
  }

  filterValid(moves) {
    return moves;
  }

  prePlay() {}
  postPlay() {}
  preUndo() {}
  postUndo() {}

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    const lastRank = (color == "w" ? 0 : V.size.x - 1);
    if (ArrayFun.range(8).some(i => this.getColor(lastRank, i) == color))
      // The opposing edge is reached!
      return color == "w" ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    // Stalemate (will probably never happen)
    return "1/2";
  }

};
