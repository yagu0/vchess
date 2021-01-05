import { ChessRules } from "@/base_rules";

export class IsardamRules extends ChessRules {

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
      super.getPotentialMovesFrom([x, y]).filter(m => {
        let res = true;
        this.play(m);
        if (this.isImmobilized([m.end.x, m.end.y])) res = false;
        else {
          // Check discovered attacks
          for (let step of V.steps[V.BISHOP].concat(V.steps[V.ROOK])) {
            let allowedPieces = [V.QUEEN];
            if (step[0] == 0 || step[1] == 0) allowedPieces.push(V.ROOK);
            else allowedPieces.push(V.BISHOP);
            let [i, j] = [m.start.x + step[0], m.start.y + step[1]];
            while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
              i += step[0];
              j += step[1];
            }
            if (V.OnBoard(i, j)) {
              const meet = { c: this.getColor(i, j), p: this.getPiece(i, j) };
              if (allowedPieces.includes(meet.p)) {
                // Search in the other direction
                [i, j] = [m.start.x - step[0], m.start.y - step[1]];
                while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
                  i -= step[0];
                  j -= step[1];
                }
                if (
                  V.OnBoard(i, j) &&
                  this.getPiece(i, j) == meet.p &&
                  this.getColor(i, j) != meet.c
                ) {
                  res = false;
                  break;
                }
              }
            }
          }
        }
        this.undo(m);
        return res;
      })
    );
  }

};
