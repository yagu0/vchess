import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class Avalam2Rules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Monochrome() {
    return true;
  }

  get showFirstTurn() {
    return true;
  }

  getPpath(b) {
    return "Avalam/" + b;
  }

  static get PIECES() {
    // Towers of 1, 2, 3, 4 and 5
    return ['b', 'c', 'd', 'e', 'f'];
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['x'].concat(V.PIECES).includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    return true;
  }

  static GenRandInitFen() {
    return (
      "BbBbBbBb/bBbBbBbB/BbBbBbBb/bBbBbBbB/" +
      "BbBbBbBb/bBbBbBbB/BbBbBbBb/bBbBbBbB w 0"
    );
  }

  canIplay(side) {
    return this.turn == side;
  }

  getColor() {
    return this.turn; //:-)
  }

  getBasicMove([x1, y1], [x2, y2]) {
    const cp1 = this.board[x1][y1],
          cp2 = this.board[x2][y2];
    const newPiece =
      String.fromCharCode(cp1.charCodeAt(1) + cp2.charCodeAt(1) - 97);
    return (
      new Move({
        vanish: [
          new PiPo({ x: x1, y: y1, c: cp1[0], p: cp1[1] }),
          new PiPo({ x: x2, y: y2, c: cp2[0], p: cp2[1] })
        ],
        appear: [
          new PiPo({ x: x2, y: y2, c: cp1[0], p: newPiece })
        ]
      })
    );
  }

  getPotentialMovesFrom([x, y]) {
    const height = this.board[x][y].charCodeAt(1) - 97;
    if (height == 5) return [];
    let moves = [];
    for (let s of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        (height + this.board[i][j].charCodeAt(1) - 97 <= 5)
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
      }
    }
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    let towersCount = { w: 0, b: 0 };
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          if (this.getPotentialMovesFrom([i, j]).length > 0) return '*';
          towersCount[ this.board[i][j][0] ]++;
        }
      }
    }
    if (towersCount['w'] > towersCount['b']) return "1-0";
    if (towersCount['b'] > towersCount['w']) return "0-1";
    return "1/2";
  }

  getComputerMove() {
    // Random mover (TODO)
    const moves = super.getAllValidMoves();
    if (moves.length == 0) return null;
    return moves[randInt(moves.length)];
  }

};
