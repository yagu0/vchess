import { ChessRules } from "@/base_rules";

export class KothRules extends ChessRules {
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
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    if (
      [3,4].includes(this.kingPos[color][0]) &&
      [3,4].includes(this.kingPos[color][1])
    ) {
      // The middle is reached!
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
    return (
      evaluation/5 +
      (
        Math.abs(this.kingPos["w"][0] - 3.5) +
        Math.abs(this.kingPos["w"][1] - 3.5)
      ) / 2 -
      (
        Math.abs(this.kingPos["b"][0] - 3.5) +
        Math.abs(this.kingPos["b"][1] - 3.5)
      ) / 2
    );
  }
};
