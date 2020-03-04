import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class KnightmateRules extends ChessRules {
  static get COMMONER() {
    return "c";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.COMMONER]);
  }

  getPpath(b) {
    return ([V.KING, V.COMMONER].includes(b[1]) ? "Knightmate/" : "") + b;
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness)
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
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  getPotentialKingMoves(sq) {
    return super.getPotentialKnightMoves(sq).concat(super.getCastleMoves(sq));
  }

  isAttacked(sq, colors) {
    return (
      this.isAttackedByCommoner(sq, colors) ||
      this.isAttackedByPawn(sq, colors) ||
      this.isAttackedByRook(sq, colors) ||
      this.isAttackedByBishop(sq, colors) ||
      this.isAttackedByQueen(sq, colors) ||
      this.isAttackedByKing(sq, colors)
    );
  }

  isAttackedByKing(sq, colors) {
    return this.isAttackedBySlideNJump(
      sq,
      colors,
      V.KING,
      V.steps[V.KNIGHT],
      "oneStep"
    );
  }

  isAttackedByCommoner(sq, colors) {
    return this.isAttackedBySlideNJump(
      sq,
      colors,
      V.COMMONER,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
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
