import { ChessRules } from "@/base_rules";

// Ideas with 2 kings:
// Stage 1 {w, b} : 2 kings on board, value 5.
// Stage 2: only one, get mated and all that, value 1000
// ...But the middle king will get captured quickly...

export class DoublearmyRules extends ChessRules {

  static get COMMONER() {
    return "c";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.COMMONER]);
  }

  getPpath(b) {
    return (b[1] == V.COMMONER ? "Doublearmy/" : "") + b;
  }

  static GenRandInitFen(randomness) {
    const fen = ChessRules.GenRandInitFen(randomness);
    const rows = fen.split(" ")[0].split("/");
    return (
      rows[0] + "/" +
      rows[1] + "/" +
      rows[0].replace('k', 'c') + "/" +
      rows[1] + "/" +
      rows[6] + "/" +
      rows[7].replace('K', 'C') + "/" +
      rows[6] + "/" +
      rows[7] + fen.slice(-11)
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

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByCommoner(sq, color)
    );
  }

  isAttackedByCommoner(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.COMMONER,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      { c: 5 }
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
