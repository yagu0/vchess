import { ChessRules } from "@/base_rules";

export class RampageRules extends ChessRules {
  // Sum white pieces attacking a square, and remove black pieces count.
  sumAttacks([x, y]) {
    const getSign = (color) => {
      return (color == 'w' ? 1 : -1);
    };
    let res = 0;
    // Knights:
    V.steps[V.KNIGHT].forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j) && this.getPiece(i, j) == V.KNIGHT)
        res += getSign(this.getColor(i, j));
    });
    // Kings:
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j) && this.getPiece(i, j) == V.KING)
        res += getSign(this.getColor(i, j));
    });
    // Pawns:
    for (let c of ['w', 'b']) {
      for (let shift of [-1, 1]) {
        const sign = getSign(c);
        const [i, j] = [x + sign, y + shift];
        if (
          V.OnBoard(i, j) &&
          this.getPiece(i, j) == V.PAWN &&
          this.getColor(i, j) == c
        ) {
          res += sign;
        }
      }
    }
    // Other pieces (sliders):
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(s => {
      let [i, j] = [x + s[0], y + s[1]];
      let compatible = [V.QUEEN];
      compatible.push(s[0] == 0 || s[1] == 0 ? V.ROOK : V.BISHOP);
      let firstCol = undefined;
      while (V.OnBoard(i, j)) {
        if (this.board[i][j] != V.EMPTY) {
          if (!(compatible.includes(this.getPiece(i, j)))) break;
          const colIJ = this.getColor(i, j);
          if (!firstCol) firstCol = colIJ;
          if (colIJ == firstCol) res += getSign(colIJ);
          else break;
        }
        i += s[0];
        j += s[1];
      }
    });
    return res;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    const color = this.turn;
    if (this.getPiece(x, y) == V.KING && this.underCheck(color))
      // The king under check can only move as usual
      return moves;
    // Remember current final squares to not add moves twice:
    const destinations = {};
    const lastRank = (color == 'w' ? 0 : 7);
    const piece = this.getPiece(x, y);
    moves.forEach(m => destinations[m.end.x + "_" + m.end.y] = true);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] == V.EMPTY && !destinations[i + "_" + j]) {
          const sa = this.sumAttacks([i, j]);
          if (
            ((color == 'w' && sa > 0) || (color == 'b' && sa < 0)) &&
            (piece != V.PAWN || i != lastRank)
          ) {
            moves.push(this.getBasicMove([x, y], [i, j]));
          }
        }
      }
    }
    return moves;
  }

  static get SEARCH_DEPTH() {
    return 1;
  }
};
