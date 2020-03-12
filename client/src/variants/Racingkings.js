import { ChessRules } from "@/base_rules";

export const VariantRules = class RacingkingsRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get CanFlip() {
    return false;
  }

  static GenRandInitFen() {
    return "8/8/8/8/8/8/krbnNBRK/qrbnNBRQ w 0";
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    return moves.filter(m => {
      this.play(m);
      // Giving check is forbidden as well:
      const res = !this.underCheck(color) && !this.underCheck(oppCol);
      this.undo(m);
      return res;
    });
  }

  getCurrentScore() {
    // If both kings arrived on the last rank, it's a draw
    if (this.kingPos['w'][0] == 0 && this.kingPos['b'][0] == 0) return "1/2";
    // If after my move the opponent king is on last rank, I lose.
    // This is only possible with black.
    if (this.turn == 'w' && this.kingPos['w'][0] == 0) return "1-0";
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    if (this.kingPos[color][0] == 0) {
      // The opposing edge is reached!
      // If color is white and the black king can arrive on 8th rank
      // at next move, then it should be a draw:
      if (color == "w" && this.kingPos['b'][0] == 1) {
        // Search for a move
        const oppKingMoves = this.getPotentialKingMoves(this.kingPos['b']);
        if (oppKingMoves.some(m => m.end.x == 0)) return "*";
      }
      return color == "w" ? "1-0" : "0-1";
    }
    if (this.atLeastOneMove()) return "*";
    // Stalemate (will probably never happen)
    return "1/2";
  }

  evalPosition() {
    // Count material:
    let evaluation = super.evalPosition();
    // Ponder with king position:
    return evaluation/5 + this.kingPos["b"][0] - this.kingPos["w"][0];
  }
};
