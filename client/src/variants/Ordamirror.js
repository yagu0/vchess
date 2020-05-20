import { ChessRules } from "@/base_rules";
import { OrdaRules } from "@/variants/Orda";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class OrdamirrorRules extends OrdaRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.LANCER, V.ARCHER, V.KHESHIG, V.FALCON] }
    );
  }

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  getPpath(b) {
    return "Orda/" + b;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "lhafkahl/8/pppppppp/8/8/PPPPPPPP/8/LHAFKAHL w 0 ah -";

    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces on first (and last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(8);

      let randIndex = 2 * randInt(4);
      const bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * randInt(4) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      pieces[c][rook1Pos] = "l";
      pieces[c][knight1Pos] = "h";
      pieces[c][bishop1Pos] = "a";
      pieces[c][queenPos] = "f";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "a";
      pieces[c][knight2Pos] = "h";
      pieces[c][rook2Pos] = "l";
    }
    return (
      pieces["b"].join("") +
      "/8/pppppppp/8/8/PPPPPPPP/8/" +
      pieces["w"].join("").toUpperCase() +
      " w 0"
    );
  }

  static get FALCON() {
    return 'f';
  }

  static get PIECES() {
    return [V.LANCER, V.ARCHER, V.KHESHIG, V.FALCON, V.KING];
  }

  getPotentialMovesFrom(sq) {
    switch (this.getPiece(sq[0], sq[1])) {
      case V.PAWN:
        return super.getPotentialPawnMoves(sq);
      case V.LANCER:
        return super.getPotentialLancerMoves(sq);
      case V.ARCHER:
        return super.getPotentialArcherMoves(sq);
      case V.KHESHIG:
        return super.getPotentialKheshigMoves(sq);
      case V.FALCON:
        return this.getPotentialFalconMoves(sq);
      case V.KING:
        return super.getPotentialKingMoves(sq)
    }
    return []; //never reached
  }

  getPotentialFalconMoves(sq) {
    const onlyMoves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      null,
      { onlyMove: true }
    );
    const onlyTakes = this.getSlideNJumpMoves(
      sq,
      V.steps[V.KNIGHT],
      "oneStep",
      { onlyTake: true }
    );
    return onlyMoves.concat(onlyTakes);
  }

  isAttacked(sq, color) {
    return (
      super.isAttackedByPawn(sq, color) ||
      super.isAttackedByLancer(sq, color) ||
      super.isAttackedByKheshig(sq, color) ||
      super.isAttackedByArcher(sq, color) ||
      this.isAttackedByFalcon(sq, color) ||
      super.isAttackedByKing(sq, color)
    );
  }

  isAttackedByFalcon(sq, color) {
    return this.isAttackedBySlideNJump(
      sq, color, V.FALCON, V.steps[V.KNIGHT], "oneStep");
  }

  static get VALUES() {
    return {
      p: 1,
      f: 7,
      a: 4,
      h: 7,
      l: 4,
      k: 1000
    };
  }
};
