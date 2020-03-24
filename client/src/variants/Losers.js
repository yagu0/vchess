import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class LosersRules extends ChessRules {
  // Trim all non-capturing moves
  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length == 2 && m.appear.length == 1);
  }

	// Stop at the first capture found (if any)
  atLeastOneCapture() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) != oppCol &&
          this.getPotentialMovesFrom([i, j]).some(m =>
            // Warning: discard castle moves
            m.vanish.length == 2 && m.appear.length == 1)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getPossibleMovesFrom(sq) {
    let moves = this.filterValid(this.getPotentialMovesFrom(sq));
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  getAllValidMoves() {
    const moves = super.getAllValidMoves();
    if (moves.some(m => m.vanish.length == 2 && m.appear.length == 1))
      return V.KeepCaptures(moves);
    return moves;
  }

  getCurrentScore() {
    // If only my king remains, I win
    const color = this.turn;
    let onlyKing = true;
    outerLoop: for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i,j) == color &&
          this.getPiece(i,j) != V.KING
        ) {
          onlyKing = false;
          break outerLoop;
        }
      }
    }
    if (onlyKing) return color == "w" ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    // No valid move: the side who cannot move (or is checkmated) wins
    return this.turn == "w" ? "1-0" : "0-1";
  }

  evalPosition() {
    // Less material is better (more subtle in fact but...)
    return -super.evalPosition();
  }
};
