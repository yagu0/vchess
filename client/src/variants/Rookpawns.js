import { ChessRules } from "@/base_rules";

export class RookpawnsRules extends ChessRules {

  static get Options() {
    return null;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      // The promotion piece doesn't matter, the game is won
      { promotions: [V.QUEEN] }
    );
  }

  static get HasFlags() {
    return false;
  }

  scanKings() {}

  static GenRandInitFen() {
    return "8/ppppp3/8/8/8/8/8/7R w 0 -";
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // If all pieces of some color vanished, the opponent wins:
    for (let c of ['w', 'b']) {
      if (this.board.every(b => b.every(cell => !cell || cell[0] != c)))
        return (c == 'w' ? "0-1" : "1-0");
    }
    // Did a black pawn promote? Can the rook take it?
    const qIdx = this.board[7].findIndex(cell => cell[1] == V.QUEEN);
    if (
      qIdx >= 0 &&
      (this.turn == 'b' || !super.isAttackedByRook([7, qIdx], 'w'))
    ) {
      return "0-1";
    }
    if (!this.atLeastOneMove()) return "1/2";
    return "*";
  }

  postPlay() {}
  postUndo() {}

  static get SEARCH_DEPTH() {
    return 4;
  }

};
