import { ChessRules } from "@/base_rules";

export class RemarkablerookiesRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        promotions:
          ChessRules.PawnSpecs.promotions.concat(
          [V.SHORT_ROOK, V.WOODY_ROOK, V.HALF_DUCK, V.CHANCELLOR])
      }
    );
  }

  getPpath(b) {
    if ([V.SHORT_ROOK, V.WOODY_ROOK, V.HALF_DUCK, V.CHANCELLOR].includes(b[1]))
      return "Remarkablerookies/" + b;
    return b;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "dhaskahd/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 ahah -";

    // Mapping white --> black (at least at start):
    const piecesMap = {
      'r': 'd',
      'n': 'h',
      'b': 'a',
      'q': 's',
      'k': 'k'
    };

    const baseFen = ChessRules.GenRandInitFen(randomness);
    return (
      baseFen.substr(0, 8).split('').map(p => piecesMap[p]).join('') +
      baseFen.substr(8)
    );
  }

  static get SHORT_ROOK() {
    return 'd';
  }
  static get WOODY_ROOK() {
    return 'h';
  }
  static get HALF_DUCK() {
    return 'a';
  }
  static get CHANCELLOR() {
    return 's';
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat([V.SHORT_ROOK, V.WOODY_ROOK, V.HALF_DUCK, V.CHANCELLOR])
    );
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.SHORT_ROOK: return this.getPotentialShortRookMoves([x, y]);
      case V.WOODY_ROOK: return this.getPotentialWoodyRookMoves([x, y]);
      case V.HALF_DUCK: return this.getPotentialHalfDuckMoves([x, y]);
      case V.CHANCELLOR: return this.getPotentialChancellorMoves([x, y]);
      default: return super.getPotentialMovesFrom([x, y]);
    }
    return [];
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        // "$" prefix to avoid conflict/confusion with piece abbreviations
        // Dabbabah
        '$d': [
          [-2, 0],
          [0, -2],
          [2, 0],
          [0, 2]
        ],
        // Wazir
        '$w': [
          [-1, 0],
          [0, -1],
          [1, 0],
          [0, 1]
        ],
        // Alfil
        '$a': [
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2]
        ],
        // Ferz
        '$f': [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1]
        ],
        // Threeleaper
        '$3': [
          [-3, 0],
          [0, -3],
          [3, 0],
          [0, 3]
        ],
      }
    );
  }

  getPotentialShortRookMoves(sq) {
    return this.getSlideNJumpMovesLimited(sq, V.steps[V.ROOK], 4);
  }

  getPotentialWoodyRookMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps.$d, "oneStep").concat(
      this.getSlideNJumpMoves(sq, V.steps.$w, "oneStep"),
    );
  }

  getPotentialHalfDuckMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps.$d, "oneStep").concat(
      this.getSlideNJumpMoves(sq, V.steps.$f, "oneStep"),
      this.getSlideNJumpMoves(sq, V.steps.$3, "oneStep"),
    );
  }

  getPotentialChancellorMoves(sq) {
    // Copied from Schess.js
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByShortRook(sq, color) ||
      this.isAttackedByWoodyRook(sq, color) ||
      this.isAttackedByHalfDuck(sq, color) ||
      this.isAttackedByChancellor(sq, color)
    );
  }

  isAttackedByShortRook(sq, color) {
    return this.isAttackedBySlideNJumpLimited(sq, color, V.EMPRESS, V.steps[V.ROOK], 4);
  }

  isAttackedByWoodyRook(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps.$d, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps.$w, "oneStep")
    );

  }

  isAttackedByHalfDuck(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps.$d, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps.$f, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps.$3, "oneStep")
    );

  }

  isAttackedByChancellor(sq, color) {
    // Copied from Schess.js
    return (
      this.isAttackedBySlideNJump(sq, color, V.ELEPHANT, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(
        sq,
        color,
        V.ELEPHANT,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        // These are just guesses
        d: 4,
        h: 3,
        a: 4,
        s: 8
      }
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
