import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";

export class RoyalraceRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get CanFlip() {
    return false;
  }

  static get size() {
    return { x: 11, y: 11 };
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "92/92/92/92/92/92/92/92/92/qrbnp1PNBRQ/krbnp1PNBRK w 0";

    let pieces = { w: new Array(10), b: new Array(10) };
    // Shuffle pieces on first and second rank
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = JSON.parse(JSON.stringify(pieces['w'])).reverse();
        pieces['b'] =
          pieces['b'].splice(5,10).reverse().concat(
          pieces['b'].splice(0,5).reverse());
        break;
      }

      // Reserve 4 and 5 which are pawns positions
      let positions = ArrayFun.range(10).filter(i => i != 4 && i != 5);

      // Get random squares for bishops
      let randIndex = 2 * randInt(4);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(4) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Place the king at random on (remaining squares of) first row
      let maxIndex = 4;
      if (positions[maxIndex-1] >= 4)
        maxIndex--;
      if (positions[maxIndex-1] >= 4)
        maxIndex--;
      randIndex = randInt(maxIndex);
      const kingPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random squares for knights
      randIndex = randInt(5);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(4);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random squares for rooks
      randIndex = randInt(3);
      const rook1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(2);
      const rook2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Queen position is now determined,
      // because pawns are not placed at random
      const queenPos = positions[0];

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      pieces[c][4] = "p";
      pieces[c][5] = "p";
    }
    const whiteFen = pieces["w"].join("").toUpperCase();
    const blackFen = pieces["b"].join("");
    return (
      "92/92/92/92/92/92/92/92/92/" +
      blackFen.substr(5).split("").reverse().join("") +
      "1" +
      whiteFen.substr(5).split("").join("") +
      "/" +
      blackFen.substr(0,5) +
      "1" +
      whiteFen.substr(0,5).split("").reverse().join("") +
      " w 0"
    );
  }

  getPotentialPawnMoves([x, y]) {
    // Normal moves (as a rook)
    let moves =
      this.getSlideNJumpMoves([x, y], V.steps[V.ROOK]).filter(m => {
        // Remove captures. Alt: redefine canTake
        return m.vanish.length == 1;
      });

    // Captures (in both directions)
    for (let shiftX of [-1, 1]) {
      for (let shiftY of [-1, 1]) {
        if (
          V.OnBoard(x + shiftX, y + shiftY) &&
          this.board[x + shiftX][y + shiftY] != V.EMPTY &&
          this.canTake([x, y], [x + shiftX, y + shiftY])
        ) {
          moves.push(this.getBasicMove([x, y], [x + shiftX, y + shiftY]));
        }
      }
    }

    return moves;
  }

  getPotentialKnightMoves(sq) {
    // Knight becomes knightrider:
    return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT]);
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    return moves.filter(m => {
      this.play(m);
      // Giving check is forbidden as well:
      const res = !this.underCheck(color) && !this.underCheck(oppCol);
      this.undo(m);
      return res;
    });
  }

  isAttackedByPawn([x, y], color) {
    // Pawns can capture forward and backward:
    for (let pawnShift of [-1, 1]) {
      if (0 < x + pawnShift && x + pawnShift < V.size.x) {
        for (let i of [-1, 1]) {
          if (
            y + i >= 0 &&
            y + i < V.size.y &&
            this.getPiece(x + pawnShift, y + i) == V.PAWN &&
            this.getColor(x + pawnShift, y + i) == color
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isAttackedByKnight(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.KNIGHT,
      V.steps[V.KNIGHT]
    );
  }

  getCurrentScore() {
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    if (this.kingPos[color][0] == 0)
      // The opposing edge is reached!
      return color == "w" ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    // Stalemate (will probably never happen)
    return "1/2";
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return {
      p: 2,
      r: 5,
      n: 3,
      b: 3,
      q: 9,
      k: 1000
    };
  }

  evalPosition() {
    // Count material:
    let evaluation = super.evalPosition();
    // Ponder with king position:
    return evaluation/5 + this.kingPos["b"][0] - this.kingPos["w"][0];
  }

  getNotation(move) {
    // Since pawns are much more mobile, treat them as other pieces:
    return (
      move.vanish[0].p.toUpperCase() +
      (move.vanish.length > move.appear.length ? "x" : "") +
      V.CoordsToSquare(move.end)
    );
  }
};
