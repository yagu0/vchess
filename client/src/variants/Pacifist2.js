import { Pacifist1Rules } from "@/variants/Pacifist1";

export class Pacifist2Rules extends Pacifist1Rules {

  // Sum values of white pieces attacking a square,
  // and remove (sum of) black pieces values.
  sumAttacks([x, y]) {
    const getSign = (color) => {
      return (color == 'w' ? 1 : -1);
    };
    let res = 0;
    // Knights:
    V.steps[V.KNIGHT].forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j) && this.getPiece(i, j) == V.KNIGHT)
        res += getSign(this.getColor(i, j)) * V.VALUES[V.KNIGHT];
    });
    // Kings:
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j) && this.getPiece(i, j) == V.KING)
        res += getSign(this.getColor(i, j)) * V.VALUES[V.KING];
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
          res += sign * V.VALUES[V.PAWN];
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
          const pieceIJ = this.getPiece(i, j);
          if (!(compatible.includes(pieceIJ))) break;
          const colIJ = this.getColor(i, j);
          if (!firstCol) firstCol = colIJ;
          if (colIJ == firstCol) res += getSign(colIJ) * V.VALUES[pieceIJ];
          else break;
        }
        i += s[0];
        j += s[1];
      }
    });
    return res;
  }

};
