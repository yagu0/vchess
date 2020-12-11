import { ChessRules, PiPo, Move } from "@/base_rules";
import { XiangqiRules } from "@/variants/Xiangqi"

export class MinixiangqiRules extends XiangqiRules {

  static get Lines() {
    let lines = [];
    // Draw all inter-squares lines, shifted:
    for (let i = 0; i < V.size.x; i++)
      lines.push([[i+0.5, 0.5], [i+0.5, V.size.y-0.5]]);
    for (let j = 0; j < V.size.y; j++)
      lines.push([[0.5, j+0.5], [V.size.x-0.5, j+0.5]]);
    // Add palaces:
    lines.push([[0.5, 2.5], [2.5, 4.5]]);
    lines.push([[0.5, 4.5], [2.5, 2.5]]);
    lines.push([[4.5, 2.5], [6.5, 4.5]]);
    lines.push([[4.5, 4.5], [6.5, 2.5]]);
    return lines;
  }

  // No elephants or advisors
  static get PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.KING, V.CANNON];
  }

  getPpath(b) {
    return "Xiangqi/" + b;
  }

  static get size() {
    return { x: 7, y: 7};
  }

  getPotentialPawnMoves([x, y]) {
    const c = this.getColor(x, y);
    const shiftX = (c == 'w' ? -1 : 1);
    const lastRank = (c == 'w' && x == 0 || c == 'b' && x == 6);
    let steps = [];
    if (!lastRank) steps.push([shiftX, 0]);
    if (y > 0) steps.push([0, -1]);
    if (y < 9) steps.push([0, 1]);
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  insidePalace(x, y, c) {
    return (
      (y >= 2 && y <= 4) &&
      (
        (c == 'w' && x >= 4) ||
        (c == 'b' && x <= 2)
      )
    );
  }

  static get VALUES() {
    return {
      p: 2,
      r: 9,
      n: 4,
      c: 4.5,
      k: 1000
    };
  }

  // Back to ChessRules method:
  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY)
          evaluation += (c == 'w' ? 1 : -1) * V.VALUES[this.getPiece(i, j)];
      }
    }
    return evaluation;
  }

  // Also no randomization here
  static GenRandInitFen() {
    return "rcnkncr/p1ppp1p/7/7/7/P1PPP1P/RCNKNCR w 0";
  }

};
