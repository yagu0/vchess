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
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  getPotentialEmpressMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  getPotentialPrincessMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
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
      this.isAttackedBySlideNJump(
        sq,
        color,
        V.AMAZON,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  isAttackedByEmpress(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(
        sq,
        color,
        V.EMPRESS,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  isAttackedByPrincess(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.PRINCESS, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq,
        color,
        V.PRINCESS,
        V.steps[V.KNIGHT],
        "oneStep"
      )
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

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "esqakbnr/pppppppp/8/8/8/8/PPPPPPPP/ESQAKBNR w 0 ahah -";

    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    let whiteBishopPos = -1;
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(8);

      // Get random squares for bishop: if black, pick a different color
      // than where the white one stands.
      let randIndex =
        c == 'w'
          ? randInt(8)
          : 2 * randInt(4) + (1 - whiteBishopPos % 2);
      if (c == 'w') whiteBishopPos = randIndex;
      const bishopPos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(7);
      const knightPos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(6);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(5);
      const amazonPos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(4);
      const princessPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rook, empress and king positions are now almost fixed,
      // only the ordering rook->empress or empress->rook must be decided.
      let rookPos = positions[0];
      let empressPos = positions[2];
      const kingPos = positions[1];
      flags += V.CoordToColumn(rookPos) + V.CoordToColumn(empressPos);
      if (Math.random() < 0.5) [rookPos, empressPos] = [empressPos, rookPos];

      pieces[c][rookPos] = "r";
      pieces[c][knightPos] = "n";
      pieces[c][bishopPos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][amazonPos] = "a";
      pieces[c][princessPos] = "s";
      pieces[c][empressPos] = "e";
    }
    // Add turn + flags + enpassant
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " -"
    );
  }

};
