import { ChessRules } from "@/base_rules";

export class PawnsRules extends ChessRules {

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
    return "8/pppppppp/8/8/8/8/PPPPPPPP/8 w 0 -";
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const oppCol = V.GetOppCol(this.turn);
    if (this.board.some(b =>
      b.some(cell => cell[0] == oppCol && cell[1] != V.PAWN))
    ) {
      return (oppCol == 'w' ? "1-0" : "0-1");
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
