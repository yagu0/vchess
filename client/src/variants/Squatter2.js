import { ChessRules } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";

export class Squatter2Rules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: ChessRules.PawnSpecs.promotions.concat([V.KING]) }
    );
  }

  static get Lines() {
    return [
      // White goal:
      [[0, 3], [0, 5]],
      [[0, 5], [1, 5]],
      [[1, 5], [1, 3]],
      [[1, 3], [0, 3]],
      // Black goal:
      [[8, 3], [8, 5]],
      [[8, 5], [7, 5]],
      [[7, 5], [7, 3]],
      [[7, 3], [8, 3]]
    ];
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    // Just check that at least one piece of each color is there:
    let pieces = { "w": 0, "b": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowerRi = row[i].toLowerCase();
        if (V.PIECES.includes(lowerRi)) {
          pieces[row[i] == lowerRi ? "b" : "w"]++;
          sumElts++;
        }
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(pieces).some(v => v == 0)) return false;
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
    const oppCol = V.GetOppCol(this.turn);
    const goal = (oppCol == 'w' ? 0 : 7);
    if (this.board[goal].slice(3, 5).some(b => b[0] == oppCol))
      return oppCol == 'w' ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    return "1/2";
  }

  static GenRandInitFen(options) {
    return SuicideRules.GenRandInitFen(options);
  }

};
