import { ChessRules } from "@/base_rules";

export class XiangqiRules extends ChessRules {

  static get Monochrome() {
    return true;
  }

  static get Notoodark() {
    return true;
  }

  static get Lines() {
    let lines = [];
    // Draw all inter-squares lines, shifted:
    for (let i = 0; i < V.size.x; i++)
      lines.push([[i+0.5, 0.5], [i+0.5, V.size.y-0.5]]);
    for (let j = 0; j < V.size.y; j++)
      lines.push([[0.5, j+0.5], [V.size.x-0.5, j+0.5]]);
    // Add palaces:
    lines.push([[0.5, 3.5], [2.5, 5.5]]);
    lines.push([[0.5, 5.5], [2.5, 3.5]]);
    lines.push([[9.5, 3.5], [7.5, 5.5]]);
    lines.push([[9.5, 5.5], [7.5, 3.5]]);
    // Show river:
    lines.push([[4.5, 0.5], [5.5, 8.5]]);
    lines.push([[5.5, 0.5], [4.5, 8.5]]);
    return lines;
  }

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get ELEPHANT() {
    return "e";
  }

  static get CANNON() {
    return "c";
  }

  static get ADVISOR() {
    return "a";
  }

  static get PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.ELEPHANT, V.ADVISOR, V.KING, V.CANNON];
  }

  getPpath(b) {
    return "Xiangqi/" + b;
  }

  static get size() {
    return { x: 10, y: 9};
  }

  getPotentialMovesFrom(sq) {
    switch (this.getPiece(sq[0], sq[1])) {
      case V.PAWN: return this.getPotentialPawnMoves(sq);
      case V.ROOK: return super.getPotentialRookMoves(sq);
      case V.KNIGHT: return this.getPotentialKnightMoves(sq);
      case V.ELEPHANT: return this.getPotentialElephantMoves(sq);
      case V.ADVISOR: return this.getPotentialAdvisorMoves(sq);
      case V.KING: return this.getPotentialKingMoves(sq);
      case V.CANNON: return this.getPotentialCannonMoves(sq);
    }
    return []; //never reached
  }

  getPotentialPawnMoves([x, y]) {
    const c = this.getColor(x, y);
    const shiftX = (c == 'w' ? -1 : 1);
    const crossedRiver = (c == 'w' && x <= 4 || c == 'b' && x >= 5);
    const lastRank = (c == 'w' && x == 0 || c == 'b' && x == 9);
    let steps = [];
    if (!lastRank) steps.push([shiftX, 0]);
    if (crossedRiver) {
      if (y > 0) steps.push([0, -1]);
      if (y < 9) steps.push([0, 1]);
    }
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  knightStepsFromRookStep(step) {
    if (step[0] == 0) return [ [1, 2*step[1]], [-1, 2*step[1]] ];
    return [ [2*step[0], 1], [2*step[0], -1] ];
  }

  getPotentialKnightMoves([x, y]) {
    let steps = [];
    for (let rookStep of ChessRules.steps[V.ROOK]) {
      const [i, j] = [x + rookStep[0], y + rookStep[1]];
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        Array.prototype.push.apply(steps,
          // These moves might be impossible, but need to be checked:
          this.knightStepsFromRookStep(rookStep));
      }
    }
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  getPotentialElephantMoves([x, y]) {
    let steps = [];
    const c = this.getColor(x, y);
    for (let bishopStep of ChessRules.steps[V.BISHOP]) {
      const [i, j] = [x + bishopStep[0], y + bishopStep[1]];
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        const [newX, newY] = [x + 2*bishopStep[0], y + 2*bishopStep[1]];
        if ((c == 'w' && newX >= 5) || (c == 'b' && newX <= 4))
          // A priori valid (elephant don't cross the river)
          steps.push(bishopStep.map(s => 2*s));
          // "out of board" checks delayed to next method
      }
    }
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  insidePalace(x, y, c) {
    return (
      (y >= 3 && y <= 5) &&
      (
        (c == 'w' && x >= 7) ||
        (c == 'b' && x <= 2)
      )
    );
  }

  getPotentialAdvisorMoves([x, y]) {
    // Diagonal steps inside palace
    let steps = [];
    const c = this.getColor(x, y);
    for (let s of ChessRules.steps[V.BISHOP]) {
      if (this.insidePalace(x + s[0], y + s[1], c)) steps.push(s);
    }
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  getPotentialKingMoves([x, y]) {
    // Orthogonal steps inside palace
    let steps = [];
    const c = this.getColor(x, y);
    for (let s of ChessRules.steps[V.ROOK]) {
      if (this.insidePalace(x + s[0], y + s[1], c)) steps.push(s);
    }
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  // NOTE: duplicated from Shako (TODO?)
  getPotentialCannonMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    // Look in every direction until an obstacle (to jump) is met
    for (const step of V.steps[V.ROOK]) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        i += step[0];
        j += step[1];
      }
      // Then, search for an enemy
      i += step[0];
      j += step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.getColor(i, j) == oppCol)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  // (King) Never attacked by advisor, since it stays in the palace
  // Also, never attacked by elephants since they don't cross the river.
  isAttacked(sq, color) {
    return (
      this.isAttackedByPawn(sq, color) ||
      super.isAttackedByRook(sq, color) ||
      this.isAttackedByKnight(sq, color) ||
      this.isAttackedByCannon(sq, color)
    );
  }

  isAttackedByPawn([x, y], color) {
    // The pawn necessarily crossed the river (attack on king)
    const shiftX = (color == 'w' ? 1 : -1); //shift from king
    for (let s of [[shiftX, 0], [0, 1], [0, -1]]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.PAWN
      ) {
        return true;
      }
    }
    return false;
  }

  knightStepsFromBishopStep(step) {
    return [ [2*step[0], step[1]], [step[0], 2*step[1]] ];
  }

  isAttackedByKnight([x, y], color) {
    // Check bishop steps: if empty, look continuation knight step
    let steps = [];
    for (let s of ChessRules.steps[V.BISHOP]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] == V.EMPTY
      ) {
        Array.prototype.push.apply(steps, this.knightStepsFromBishopStep(s));
      }
    }
    return (
      super.isAttackedBySlideNJump([x, y], color, V.KNIGHT, steps, "oneStep")
    );
  }

  // NOTE: duplicated from Shako (TODO?)
  isAttackedByCannon([x, y], color) {
    // Reversed process: is there an obstacle in line,
    // and a cannon next in the same line?
    for (const step of V.steps[V.ROOK]) {
      let [i, j] = [x+step[0], y+step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        // Keep looking in this direction
        i += step[0];
        j += step[1];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.getPiece(i, j) == V.CANNON &&
          this.getColor(i, j) == color
        ) {
          return true;
        }
      }
    }
    return false;
  }

  static get VALUES() {
    return {
      p: 1,
      r: 9,
      n: 4,
      e: 2.5,
      a: 2,
      c: 4.5,
      k: 1000
    };
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const c = this.getColor(i, j);
          const sign = (c == 'w' ? 1 : -1);
          const piece = this.getPiece(i, j);
          let pieceEval = V.VALUES[this.getPiece(i, j)];
          if (
            piece == V.PAWN &&
            (
              (c == 'w' && i <= 4) ||
              (c == 'b' && i >= 5)
            )
          ) {
            // Pawn crossed the river: higher value
            pieceEval++;
          }
          evaluation += sign * pieceEval;
        }
      }
    }
    return evaluation;
  }

  static GenRandInitFen() {
    // No randomization here (TODO?)
    return "rneakaenr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNEAKAENR w 0";
  }

};
