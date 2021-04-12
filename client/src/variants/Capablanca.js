import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class CapablancaRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        promotions:
          ChessRules.PawnSpecs.promotions
          .concat([V.EMPRESS, V.PRINCESS])
      }
    );
  }

  getPpath(b) {
    return ([V.EMPRESS, V.PRINCESS].includes(b[1]) ? "Capablanca/" : "") + b;
  }

  static get size() {
    return { x: 8, y: 10 };
  }

  // Rook + knight:
  static get EMPRESS() {
    return "e";
  }

  // Bishop + knight
  static get PRINCESS() {
    return "s";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.EMPRESS, V.PRINCESS]);
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.EMPRESS:
        return this.getPotentialEmpressMoves([x, y]);
      case V.PRINCESS:
        return this.getPotentialPrincessMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialEmpressMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], 1)
    );
  }

  getPotentialPrincessMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], 1)
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByEmpress(sq, color) ||
      this.isAttackedByPrincess(sq, color)
    );
  }

  isAttackedByEmpress(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps[V.KNIGHT], 1)
    );
  }

  isAttackedByPrincess(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.PRINCESS, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(sq, color, V.PRINCESS, V.steps[V.KNIGHT], 1)
    );
  }

  static get VALUES() {
    return Object.assign(
      { s: 5, e: 7 },
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0) {
      return (
        "rnsbqkbenr/pppppppppp/91/91/91/91/PPPPPPPPPP/RNSBQKBENR w 0 ajaj -"
      );
    }

    let pieces = { w: new Array(10), b: new Array(10) };
    let flags = "";
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(10);

      // Get random squares for bishops
      let randIndex = 2 * randInt(5);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(5) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random square for empress
      randIndex = randInt(8);
      const empressPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for princess
      randIndex = randInt(7);
      const princessPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random squares for knights
      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Now rooks + king positions are fixed:
      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][empressPos] = "e";
      pieces[c][princessPos] = "s";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(rook2Pos);
    }
    return (
      pieces["b"].join("") + "/pppppppppp/91/91/91/91/PPPPPPPPPP/" +
      pieces["w"].join("").toUpperCase() + " w 0 " + flags + " - -"
    );
  }

};
