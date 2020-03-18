import { ChessRules } from "@/base_rules";

export class CannibalRules extends ChessRules {
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
          this.filterValid(this.getPotentialMovesFrom([i, j])).some(m =>
            // Warning: discard castle moves
            m.vanish.length == 2 && m.appear.length == 1)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    // Transform capturers, except for the king
    moves.forEach(m => {
      if (
        m.appear[0].p != V.KING &&
        m.vanish.length == 2 &&
        m.appear.length == 1 &&
        m.vanish[0].p != m.vanish[1].p
      ) {
        m.appear[0].p = m.vanish[1].p;
      }
    });
    return moves;
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
    if (moves.some(m => m.vanish.length == 2)) return V.KeepCaptures(moves);
    return moves;
  }

  static get SEARCH_DEPTH() {
    return 4;
  }
};
