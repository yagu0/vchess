import { ChessRules } from "@/base_rules";

export class Knightmate1Rules extends ChessRules {

  static get COMMONER() {
    return "c";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.COMMONER]);
  }

  getPpath(b) {
    return ([V.KING, V.COMMONER].includes(b[1]) ? "Knightmate/" : "") + b;
  }

  static GenRandInitFen(options) {
    return ChessRules.GenRandInitFen(options)
      .replace(/n/g, 'c').replace(/N/g, 'C');
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.COMMONER:
        return this.getPotentialCommonerMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialCommonerMoves(sq) {
    return this.getSlideNJumpMoves(
      sq, V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
  }

  getPotentialKingMoves(sq) {
    return super.getPotentialKnightMoves(sq).concat(super.getCastleMoves(sq));
  }

  isAttacked(sq, color) {
    return (
      this.isAttackedByCommoner(sq, color) ||
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByQueen(sq, color) ||
      this.isAttackedByKing(sq, color)
    );
  }

  isAttackedByKing(sq, color) {
    return this.isAttackedBySlideNJump(
      sq, color, V.KING, V.steps[V.KNIGHT], 1);
  }

  isAttackedByCommoner(sq, color) {
    return this.isAttackedBySlideNJump(
      sq, color, V.COMMONER, V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      c: 5, //the commoner is valuable
      b: 3,
      q: 9,
      k: 1000
    };
  }

};
