import { ChessRules } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";

export class KingletRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.KING] }
    );
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    // Just check that at least one pawn of each color is there:
    let pawns = { "w": 0, "b": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowerRi = row[i].toLowerCase();
        if (V.PIECES.includes(lowerRi)) {
          if (lowerRi == 'p') pawns[row[i] == lowerRi ? "b" : "w"]++;
          sumElts++;
        } else {
          const num = parseInt(row[i]);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(pawns).some(v => v == 0)) return false;
    return true;
  }

  scanKings() {}

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  // No variables update because no royal king + no castling
  prePlay() {}
  postPlay() {}
  preUndo() {}
  postUndo() {}

  getCurrentScore() {
    const pawnRemain = {
      'w': this.board.some(b =>
        b.some(cell => cell[0] == 'w' && cell[1] == 'p')),
      'b': this.board.some(b =>
        b.some(cell => cell[0] == 'b' && cell[1] == 'p'))
    }
    if (!pawnRemain['w']) return "0-1";
    if (!pawnRemain['b']) return "1-0";
    if (this.atLeastOneMove()) return "*";
    // Stalemate: draw
    return "1/2";
  }

  static GenRandInitFen(randomness) {
    return SuicideRules.GenRandInitFen(randomness);
  }

  static get VALUES() {
    // TODO: no clue what correct values would be
    return {
      p: 5,
      r: 4,
      n: 3,
      b: 3,
      q: 7,
      k: 4
    };
  }
};
