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

  static GenRandInitFen() {
    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces on first and last rank
    for (let c of ["w", "b"]) {
      let positions = ArrayFun.range(8);

      // Get random squares for bishops
      let randIndex = 2 * randInt(4);
      const bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * randInt(4) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for commoners
      randIndex = randInt(6);
      const commoner1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const commoner2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks and king positions are now fixed,
      // because of the ordering rook-king-rook
      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "r";
      pieces[c][commoner1Pos] = "c";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][commoner2Pos] = "c";
      pieces[c][rook2Pos] = "r";
    }
    // Add turn + flags + enpassant
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 1111 -"
    );
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
