import { ChessRules } from "@/base_rules";

export class AbsorptionRules extends ChessRules {
  getPpath(b) {
    if ([V.BN, V.RN, V.QN].includes(b[1])) return "Absorption/" + b;
    return b;
  }

  // Three new pieces: rook+knight, bishop+knight and queen+knight
  static get RN() {
    // Empress
    return 'e';
  }
  static get BN() {
    // Princess
    return 's';
  }
  static get QN() {
    // Amazon
    return 'a';
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.RN, V.BN, V.QN]);
  }

  static get MergeComposed() {
    return {
      "be": "a",
      "bs": "s",
      "er": "e",
      "rs": "a",
      "eq": "a",
      "qs": "a",
      "ee": "e",
      "es": "a",
      "ss": "s"
    };
  }

  static Fusion(p1, p2) {
    if (p1 == V.KING) return p1;
    if (p1 == V.PAWN) return p2;
    if (p2 == V.PAWN) return p1;
    if ([p1, p2].includes(V.KNIGHT)) {
      if ([p1, p2].includes(V.QUEEN)) return V.QN;
      if ([p1, p2].includes(V.ROOK)) return V.RN;
      if ([p1, p2].includes(V.BISHOP)) return V.BN;
      // p1 or p2 already have knight + other piece
      return (p1 == V.KNIGHT ? p2 : p1);
    }
    for (let p of [p1, p2]) {
      if (p == V.QN) return V.QN;
      if ([V.BN, V.RN].includes(p))
        return V.MergeComposed[[p1, p2].sort().join("")];
    }
    // bishop + rook, or queen + [bishop or rook]
    return V.QUEEN;
  }

  getPotentialMovesFrom(sq) {
    let moves = [];
    const piece = this.getPiece(sq[0], sq[1]);
    switch (piece) {
      case V.RN:
        moves =
          super.getPotentialRookMoves(sq).concat(
          super.getPotentialKnightMoves(sq));
        break;
      case V.BN:
        moves =
          super.getPotentialBishopMoves(sq).concat(
          super.getPotentialKnightMoves(sq));
        break;
      case V.QN:
        moves =
          super.getPotentialQueenMoves(sq).concat(
          super.getPotentialKnightMoves(sq));
        break;
      default:
        moves = super.getPotentialMovesFrom(sq);
    }
    moves.forEach(m => {
      if (m.vanish.length == 2) {
        // Augment pieces abilities in case of captures
        const piece2 = m.vanish[1].p;
        if (piece != piece2) m.appear[0].p = V.Fusion(piece, piece2);
      }
    });
    return moves;
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByBN(sq, color) ||
      this.isAttackedByRN(sq, color) ||
      this.isAttackedByQN(sq, color)
    );
  }

  isAttackedByBN(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.BN, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.BN, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedByRN(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.RN, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.RN, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedByQN(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.QN, V.steps[V.BISHOP].concat(V.steps[V.ROOK])) ||
      this.isAttackedBySlideNJump(
        sq, color, V.QN, V.steps[V.KNIGHT], "oneStep")
    );
  }

  static get VALUES() {
    return Object.assign(
      { a: 12, e: 7, s: 5 },
      ChessRules.VALUES
    );
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    if (move.vanish[0].p != V.PAWN && move.appear[0].p != move.vanish[0].p)
      // Fusion (not from a pawn: handled in ChessRules)
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }
};
