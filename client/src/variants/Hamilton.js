import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class HamiltonRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  get showFirstTurn() {
    return true;
  }

  static get HOLE() {
    return "xx";
  }

  hoverHighlight(x, y) {
    return this.movesCount == 0;
  }

  static board2fen(b) {
    if (b[0] == 'x') return 'x';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'x') return V.HOLE;
    return ChessRules.fen2board(f);
  }

  getPpath(b) {
    if (b[0] == 'x') return "Hamilton/hole";
    return b;
  }

  static get PIECES() {
    return [ChessRules.KNIGHT];
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
    return "8/8/8/8/8/8/8/8 w 0";
  }

  canIplay(side, [x, y]) {
    return side == this.turn;
  }

  // Initiate the game by choosing a square for the knight:
  doClick(square) {
    if (this.movesCount > 0) return null;
    return new Move({
      appear: [
        new PiPo({ x: square[0], y: square[1], c: 'w', p: V.KNIGHT })
      ],
      vanish: [],
      start: { x: -1, y: -1 }
    });
  }

  getAllPotentialMoves() {
    if (this.movesCount == 0) {
      return [...Array(64).keys()].map(k => {
        const i = k % 8;
        const j = (k - i) / 8;
        return new Move({
          appear: [
            new PiPo({ x: i, y: j, c: 'w', p: V.KNIGHT })
          ],
          vanish: [],
          start: { x: -1, y: -1 }
        });
      });
    }
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (!([V.EMPTY, V.HOLE].includes(this.board[i][j])))
          return this.getPotentialKnightMoves([i, j]);
      }
    }
    return [];
  }

  getPotentialKnightMoves([x, y]) {
    return (
      V.steps[V.KNIGHT].filter(
        s => {
          const [i, j] = [x + s[0], y + s[1]];
          return (V.OnBoard(i, j) && this.board[i][j] != V.HOLE);
        }
      ).map(s => {
        return this.getBasicMove([x, y], [x + s[0], y + s[1]]);
      })
    );
  }

  atLeastOneMove() {
    if (this.movesCount == 0) return true;
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (!([V.EMPTY, V.HOLE].includes(this.board[i][j])))
          return this.getPotentialKnightMoves([i, j]).length > 0;
      }
    }
    return false;
  }

  filterValid(moves) {
    return moves;
  }

  static PlayOnBoard(board, move) {
    if (move.vanish.length > 0)
      board[move.vanish[0].x][move.vanish[0].y] = V.HOLE;
    for (let psq of move.appear) board[psq.x][psq.y] = psq.c + psq.p;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    if (this.atLeastOneMove()) return "*";
    // No valid move: I lose
    return this.turn == "w" ? "0-1" : "1-0";
  }

  getComputerMove() {
    const moves = this.getAllValidMoves();
    // Just a random mover for now...
    return moves[randInt(moves.length)];
  }

  getNotation(move) {
    if (move.vanish.length > 0) return super.getNotation(move);
    // First game move:
    return "N@" + V.CoordsToSquare(move.end);
  }

};
