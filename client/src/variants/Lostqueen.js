import { ChessRules } from "@/base_rules";

export class LostqueenRules extends ChessRules {

  // The king can move like a knight:
  getPotentialKingMoves(sq) {
    return (
      super.getPotentialKingMoves(sq).concat(
      super.getSlideNJumpMoves(sq, ChessRules.steps[V.KNIGHT], "oneStep"))
    );
  }

  // Goal is to lose the queen (or be checkmated):
  getCurrentScore() {
    // If my queen disappeared, I win
    const color = this.turn;
    let haveQueen = false;
    outerLoop: for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i,j) == color &&
          this.getPiece(i,j) == V.QUEEN
        ) {
          haveQueen = true;
          break outerLoop;
        }
      }
    }
    if (!haveQueen) return color == "w" ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    // No valid move: the side who cannot move (or is checkmated) wins
    return this.turn == "w" ? "1-0" : "0-1";
  }

};
