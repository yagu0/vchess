import { ChessRules } from "@/base_rules";

export class HordeRules extends ChessRules {

  static get Options() {
    return {
      check: [
        {
          label: "Random",
          defaut: false,
          variable: "random"
        }
      ]
    };
  }

  static get HasFlags() {
    return false;
  }

  static IsGoodPosition() {
    // At least one white unit, and exactly one black king:
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let things = { "k": 0, "w": false };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (row[i] == 'k') things['k']++;
        if (V.PIECES.includes(row[i].toLowerCase())) {
          const rowCharCode = row[i].charCodeAt(0);
          if (rowCharCode >= 65 && rowCharCode <= 90) {
            // No white king:
            if (row[i] == 'K') return false;
            if (!things['w']) things['w'] = true;
          }
          sumElts++;
        } else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (things[''] != 1 || !things['w']) return false;
    return true;
  }

  static GenRandInitFen(options) {
    const fen =
      ChessRules.GenRandInitFen({ randomness: (options.random ? 1 : 0) });
    return (
      // 20 first chars are 3 rows + 3 slashes
      fen.substr(0, 20)
      // En passant available, but no castle:
      .concat("1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w 0 -")
    );
  }

  filterValid(moves) {
    if (this.turn == 'w') return moves;
    return super.filterValid(moves);
  }

  getCheckSquares() {
    if (this.turn == 'w') return [];
    return (
      this.underCheck('b')
        ? [JSON.parse(JSON.stringify(this.kingPos['b']))]
        : []
    );
  }

  getCurrentScore() {
    if (this.turn == 'w') {
      // Do I have any unit remaining? If not, I lost.
      // If yes and no available move, draw.
      let somethingRemains = false;
      outerLoop: for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == 'w') {
            somethingRemains = true;
            break outerLoop;
          }
        }
      }
      if (!somethingRemains) return "0-1";
      if (this.atLeastOneMove()) return "*";
      return "1/2";
    }
    // From black side, just run usual checks:
    return super.getCurrentScore();
  }

};
