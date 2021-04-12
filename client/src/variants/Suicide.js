import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class SuicideRules extends ChessRules {

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

  // Trim all non-capturing moves (not the most efficient, but easy)
  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length == 2);
  }

  // Stop at the first capture found (if any)
  atLeastOneCapture() {
    const color = this.turn;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          this.getPotentialMovesFrom([i, j]).some(m => m.vanish.length == 2)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getPossibleMovesFrom(sq) {
    let moves = this.getPotentialMovesFrom(sq);
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getAllValidMoves() {
    const moves = super.getAllValidMoves();
    if (moves.some(m => m.vanish.length == 2)) return V.KeepCaptures(moves);
    return moves;
  }

  atLeastOneMove() {
    const color = this.turn;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.getColor(i, j) == color &&
          this.getPotentialMovesFrom([i, j]).length > 0
        ) {
          return true;
        }
      }
    }
    return false;
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
    if (this.atLeastOneMove()) return "*";
    // No valid move: the side who cannot move wins
    return this.turn == "w" ? "1-0" : "0-1";
  }

  static get VALUES() {
    return {
      p: 1,
      r: 7,
      n: 3,
      b: 3,
      q: 5,
      k: 5
    };
  }

  static get SEARCH_DEPTH() {
    return 4;
  }

  evalPosition() {
    // Less material is better:
    return -super.evalPosition();
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 -";

    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Get random squares for every piece, totally freely
      let positions = shuffle(ArrayFun.range(8));
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
      const rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix bishops (on different colors)
        for (let i=2; i<8; i++) {
          if (positions[i] % 2 != rem2) {
            [positions[1], positions[i]] = [positions[i], positions[1]];
            break;
          }
        }
      }
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      // En-passant allowed, but no flags
      " w 0 -"
    );
  }

};
