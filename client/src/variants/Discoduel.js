import { ChessRules } from "@/base_rules";

export class DiscoduelRules extends ChessRules {

  static get Options() {
    return null;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.PAWN] }
    );
  }

  static get HasFlags() {
    return false;
  }

  scanKings() {}

  static GenRandInitFen() {
    return "1n4n1/8/8/8/8/8/PPPPPPPP/8 w 0 -";
  }

  getPotentialMovesFrom(sq) {
    const moves = super.getPotentialMovesFrom(sq);
    if (this.turn == 'b')
      // Prevent pawn captures on last rank:
      return moves.filter(m => m.vanish.length == 1 || m.vanish[1].x != 0);
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // No real winning condition (promotions count...)
    if (!this.atLeastOneMove()) return "1/2";
    return "*";
  }

  postPlay() {}
  postUndo() {}

  static get SEARCH_DEPTH() {
    return 4;
  }

};
