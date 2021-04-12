import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class PerfectRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        promotions:
          ChessRules.PawnSpecs.promotions
          .concat([V.AMAZON, V.EMPRESS, V.PRINCESS])
      }
    );
  }

  getPpath(b) {
    return (
      [V.AMAZON, V.EMPRESS, V.PRINCESS].includes(b[1])
        ? "Perfect/"
        : ""
    ) + b;
  }

  // Queen + knight
  static get AMAZON() {
    return "a";
  }

  // Rook + knight
  static get EMPRESS() {
    return "e";
  }

  // Bishop + knight
  static get PRINCESS() {
    return "s";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.AMAZON, V.EMPRESS, V.PRINCESS]);
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.AMAZON:
        return this.getPotentialAmazonMoves([x, y]);
      case V.EMPRESS:
        return this.getPotentialEmpressMoves([x, y]);
      case V.PRINCESS:
        return this.getPotentialPrincessMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialAmazonMoves(sq) {
    return super.getPotentialQueenMoves(sq).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], 1)
    );
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
      this.isAttackedByAmazon(sq, color) ||
      this.isAttackedByEmpress(sq, color) ||
      this.isAttackedByPrincess(sq, color)
    );
  }

  isAttackedByAmazon(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.AMAZON, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(sq, color, V.AMAZON, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(sq, color, V.AMAZON, V.steps[V.KNIGHT], 1)
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
      { a: 12, e: 7, s: 5 }, //experimental
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "esqakbnr/pppppppp/8/8/8/8/PPPPPPPP/ESQAKBNR w 0 ahah -";

    const baseFen = ChessRules.GenRandInitFen(options);
    const fenParts = baseFen.split(' ');
    const posParts = fenParts[0].split('/');

    // Replace a random rook per side by an empress,
    // a random knight by a princess, and a bishop by an amazon
    // (Constraint: the two remaining bishops on different colors).

    let newPos = { 0: "", 7: "" };
    let amazonOddity = -1;
    for (let rank of [0, 7]) {
      let replaced = { 'b': -2, 'n': -2, 'r': -2 };
      for (let i = 0; i < 8; i++) {
        const curChar = posParts[rank].charAt(i).toLowerCase();
        if (['b', 'n', 'r'].includes(curChar)) {
          if (
            replaced[curChar] == -1 ||
            (curChar == 'b' && rank == 7 && i % 2 == amazonOddity) ||
            (
              (curChar != 'b' || rank == 0) &&
              replaced[curChar] == -2 &&
              randInt(2) == 0
            )
          ) {
            replaced[curChar] = i;
            if (curChar == 'b') {
              if (amazonOddity < 0) amazonOddity = i % 2;
              newPos[rank] += 'a';
            }
            else if (curChar == 'r') newPos[rank] += 'e';
            else newPos[rank] += 's';
          }
          else {
            if (replaced[curChar] == -2) replaced[curChar]++;
            newPos[rank] += curChar;
          }
        }
        else newPos[rank] += curChar;
      }
    }

    return (
      newPos[0] + "/" + posParts.slice(1, 7).join('/') + "/" +
      newPos[7].toUpperCase() + " " + fenParts.slice(1, 5).join(' ') + " -"
    );
  }

};
