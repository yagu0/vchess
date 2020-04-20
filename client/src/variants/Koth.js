import { ChessRules } from "@/base_rules";

export class KothRules extends ChessRules {
  static get Lines() {
    return [
      [[3, 3], [3, 5]],
      [[3, 3], [5, 3]],
      [[3, 5], [5, 5]],
      [[5, 3], [5, 5]]
    ];
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
    return super.getCurrentScore();
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
