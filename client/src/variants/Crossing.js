import { ChessRules } from "@/base_rules";

export class CrossingRules extends ChessRules {

  static get Lines() {
    return [ [[4, 0], [4, 8]] ];
  }

  getCurrentScore() {
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    const secondHalf = (color == 'w' ? [0, 1, 2, 3] : [4, 5, 6, 7]);
    if (secondHalf.includes(this.kingPos[color][0]))
      // Half-board is crossed
      return color == "w" ? "1-0" : "0-1";
    return super.getCurrentScore();
  }

  evalPosition() {
    // Count material:
    let evaluation = super.evalPosition();
    // Ponder with king position:
    return (
      evaluation/5 +
      Math.abs(this.kingPos["w"][0] - 3.5) -
      Math.abs(this.kingPos["b"][0] - 3.5)
    );
  }

};
