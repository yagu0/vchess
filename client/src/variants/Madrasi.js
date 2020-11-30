import { ChessRules } from "@/base_rules";

export class MadrasiRules extends ChessRules {

  isImmobilized(sq) {
    const oppCol = V.GetOppCol(this.getColor(sq[0], sq[1]));
    const piece = this.getPiece(sq[0], sq[1]);
    let steps = [];
    switch (piece) {
      // NOTE: cannot use super.isAttackedByXXX
      // because it would call the redefined isAttackedBySlideNJump
      // => Infinite recursive calls.
      case V.PAWN: {
        const forward = (oppCol == 'w' ? 1 : -1);
        steps = [[forward, 1], [forward, -1]];
        break;
      }
      case V.ROOK:
      case V.BISHOP:
      case V.KNIGHT:
        steps = V.steps[piece];
        break;
      case V.KING:
      case V.QUEEN:
        steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
        break;
    }
    return super.isAttackedBySlideNJump(
      sq, oppCol, piece, steps, [V.KING, V.PAWN, V.KNIGHT].includes(piece))
  }

  getPotentialMovesFrom([x, y]) {
    return (
      !this.isImmobilized([x, y])
        ? super.getPotentialMovesFrom([x, y])
        : []
    );
  }

  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color &&
        // If enemy is immobilized, it doesn't attack:
        !this.isImmobilized([rx, ry])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByKing() {
    // Connected kings paralyze each other
    return false;
  }

};
