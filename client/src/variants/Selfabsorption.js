import { ChessRules } from "@/base_rules";
import { AbsorptionRules } from "@/variants/Absorption";

export class SelfabsorptionRules extends AbsorptionRules {

  canTake([x1, y1], [x2, y2]) {
    if (this.getColor(x1, y1) !== this.getColor(x2, y2)) return true;
    const p1 = this.getPiece(x1, y1);
    const p2 = this.getPiece(x2, y2);
    return (
      p1 != p2 &&
      [V.QUEEN, V.ROOK, V.KNIGHT, V.BISHOP].includes(p1) &&
      [V.QUEEN, V.ROOK, V.KNIGHT, V.BISHOP].includes(p2) &&
      (p1 != V.QUEEN || p2 == V.KNIGHT) &&
      (p2 != V.QUEEN || p1 == V.KNIGHT)
    );
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
      case V.PAWN:
        moves = super.getPotentialPawnMoves(sq);
        break;
      case V.ROOK:
        moves = super.getPotentialRookMoves(sq);
        break;
      case V.KNIGHT:
        moves = super.getPotentialKnightMoves(sq);
        break;
      case V.BISHOP:
        moves = super.getPotentialBishopMoves(sq);
        break;
      case V.QUEEN:
        moves = super.getPotentialQueenMoves(sq);
        break;
      case V.KING:
        moves = super.getPotentialKingMoves(sq);
        break;
    }
    moves.forEach(m => {
      if (
        m.vanish.length == 2 && m.appear.length == 1 &&
        piece != m.vanish[1].p && m.vanish[0].c == m.vanish[1].c
      ) {
        // Augment pieces abilities in case of self-captures
        m.appear[0].p = V.Fusion(piece, m.vanish[1].p);
      }
    });
    return moves;
  }

};
