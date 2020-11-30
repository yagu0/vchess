import { ChessRules } from "@/base_rules";

export class VchessRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { captureBackward: true }
    );
  }

  isAttackedByPawn(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.PAWN,
      V.steps[V.BISHOP],
      "oneStep"
    );
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    // If pawn captures backward, add an indication 'b'
    if (
      move.appear[0].p == V.PAWN &&
      (
        (move.appear[0].c == 'w' && (move.end.x - move.start.x > 0)) ||
        (move.appear[0].c == 'b' && (move.end.x - move.start.x < 0))
      )
    ) {
      notation += 'b';
    }
    return notation;
  }

};
