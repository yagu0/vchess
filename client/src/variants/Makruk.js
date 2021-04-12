import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";

export class MakrukRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Monochrome() {
    return true;
  }

  static get Notoodark() {
    return true;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.QUEEN] }
    );
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.PROMOTED);
  }

  static get PROMOTED() {
    return 'f';
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "rnbqkbnr/8/pppppppp/8/8/PPPPPPPP/8/RNBKQBNR w 0";

    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Get random squares for every piece, totally freely (no castling)
      let positions = shuffle(ArrayFun.range(8));
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      pieces["b"].join("") +
      "/8/pppppppp/8/8/PPPPPPPP/8/" +
      pieces["w"].join("").toUpperCase() +
      " w 0"
    );
  }

  getPpath(b) {
    return "Makruk/" + b;
  }

  getPotentialMovesFrom([x, y]) {
    if (this.getPiece(x, y) == V.PROMOTED)
      return this.getPotentialQueenMoves([x, y]);
    return super.getPotentialMovesFrom([x, y]);
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    const shiftX = V.PawnSpecs.directions[color];
    const sixthRank = (color == 'w' ? 2 : 5);
    const tr = (x + shiftX == sixthRank ? { p: V.PROMOTED, c: color } : null);
    let moves = [];
    if (this.board[x + shiftX][y] == V.EMPTY)
      // One square forward
      moves.push(this.getBasicMove([x, y], [x + shiftX, y], tr));
    // Captures
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 && y + shiftY < 8 &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        this.canTake([x, y], [x + shiftX, y + shiftY])
      ) {
        moves.push(this.getBasicMove([x, y], [x + shiftX, y + shiftY], tr));
      }
    }
    return moves;
  }

  getPotentialBishopMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return this.getSlideNJumpMoves(
      sq, V.steps[V.BISHOP].concat([ [forward, 0] ]), 1);
  }

  getPotentialQueenMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], 1);
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) || this.isAttackedByPromoted(sq, color)
    );
  }

  isAttackedByBishop(sq, color) {
    const forward = (color == 'w' ? 1 : -1);
    return this.isAttackedBySlideNJump(
      sq, color, V.BISHOP, V.steps[V.BISHOP].concat([ [forward, 0] ]), 1);
  }

  isAttackedByQueen(sq, color) {
    return this.isAttackedBySlideNJump(
      sq, color, V.QUEEN, V.steps[V.BISHOP], 1);
  }

  isAttackedByPromoted(sq, color) {
    return super.isAttackedBySlideNJump(
      sq, color, V.PROMOTED, V.steps[V.BISHOP], 1);
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 2,
      f: 2,
      k: 1000
    };
  }

};
