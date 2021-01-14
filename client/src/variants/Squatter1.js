import { ChessRules } from "@/base_rules";

export class Squatter1Rules extends ChessRules {

  static get Lines() {
    return [
      [[1, 0], [1, 8]],
      [[7, 0], [7, 8]]
    ];
  }

  // Find possible captures by opponent on [x, y]
  findCaptures([x, y]) {
    const color = this.getColor(x, y);
    const forward = (color == 'w' ? -1 : 1);
    let moves = [];
    const steps = {
      // Rook and bishop: included in queen case
      p: { s: [[forward, -1], [forward, 1]], one: true },
      n: { s: V.steps[V.KNIGHT], one: true },
      q: { s: V.steps[V.ROOK].concat(V.steps[V.BISHOP]) },
      k: { s: V.steps[V.ROOK].concat(V.steps[V.BISHOP]), one: true }
    };
    const oppCol = V.GetOppCol(color);
    Object.keys(steps).forEach(piece => {
      outerLoop: for (let loop = 0; loop < steps[piece].s.length; loop++) {
        const step = steps[piece].s[loop];
        let i = x + step[0];
        let j = y + step[1];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          if (steps[piece].one) continue outerLoop;
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol
        ) {
          const oppPiece = this.getPiece(i, j);
          if (
            oppPiece == piece ||
            (
              piece == V.QUEEN &&
              (
                (oppPiece == V.ROOK && step.some(e => e == 0)) ||
                (oppPiece == V.BISHOP && step.every(e => e != 0))
              )
            )
          )
          // Possible capture (do not care about promotions):
          moves.push(this.getBasicMove([i, j], [x, y]));
        }
      }
    });
    return moves;
  }

  someValid(moves, color) {
    // Stop at first valid move found:
    for (let m of moves) {
      this.play(m);
      const res = !this.underCheck(color);
      this.undo(m);
      if (res) return true;
    }
    return false;
  }

  getCurrentScore() {
    // Try both colors (to detect potential suicides)
    for (let c of ['w', 'b']) {
      const oppCol = V.GetOppCol(c);
      const goal = (c == 'w' ? 0 : 7);
      if (
        this.board[goal].some(
          (b,j) => {
            return (
              b[0] == c &&
              (
                !this.isAttacked([goal, j], oppCol) ||
                !this.someValid(this.findCaptures([goal, j]), oppCol)
              )
            );
          }
        )
      ) {
        return c == 'w' ? "1-0" : "0-1";
      }
    }
    return super.getCurrentScore();
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
