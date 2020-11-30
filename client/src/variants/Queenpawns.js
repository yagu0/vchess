import { ChessRules } from "@/base_rules";

export class QueenpawnsRules extends ChessRules {

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
    return "3q4/8/8/8/8/8/PPPPPPPP/8 w 0 -";
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
    // Did a white pawn promote? Can the queen (in turn) take it?
    const qIdx = this.board[0].findIndex(cell => cell == "wq");
    if (
      qIdx >= 0 &&
      (this.turn == 'w' || !super.isAttackedByQueen([0, qIdx], 'b'))
    ) {
      return "1-0";
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
