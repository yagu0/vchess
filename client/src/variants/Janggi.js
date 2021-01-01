import { ChessRules, Move, PiPo } from "@/base_rules";

export class JanggiRules extends ChessRules {

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
    return lines;
  }

  // No castle, but flag: bikjang
  static get HasCastle() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get LoseOnRepetition() {
    return true;
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
    return "Jiangqi/" + b;
  }

  static get size() {
    return { x: 10, y: 9};
  }

  static IsGoodFlags(flags) {
    // bikjang status of last move + pass
    return !!flags.match(/^[0-2]{2,2}$/);
  }

  aggregateFlags() {
    return [this.bikjangFlag, this.passFlag];
  }

  disaggregateFlags(flags) {
    this.bikjangFlag = flags[0];
    this.passFlag = flags[1];
  }

  getFlagsFen() {
    return this.bikjangFlag.toString() + this.passFlag.toString()
  }

  setFlags(fenflags) {
    this.bikjangFlag = parseInt(fenflags.charAt(0), 10);
    this.passFlag = parseInt(fenflags.charAt(1), 10);
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Sub-turn is useful only at first move...
    this.subTurn = 1;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    const c = this.getColor(x, y);
    const oppCol = V.GetOppCol(c);
    if (this.kingPos[c][0] == x && this.kingPos[c][1] == y) {
      // Add pass move (might be impossible if undercheck)
      moves.push(
        new Move({
          appear: [],
          vanish: [],
          start: { x: this.kingPos[c][0], y: this.kingPos[c][1] },
          end: { x: this.kingPos[oppCol][0], y: this.kingPos[oppCol][1] }
        })
      );
    }
    // TODO: next "if" is mutually exclusive with the block above
    if (this.movesCount <= 1) {
      const firstRank = (this.movesCount == 0 ? 9 : 0);
      const [initFile, destFile] = (this.subTurn == 1 ? [1, 2] : [7, 6]);
      // Only option is knight / elephant swap:
      if (x == firstRank && y == initFile) {
        moves.push(
          new Move({
            appear: [
              new PiPo({
                x: x,
                y: destFile,
                c: c,
                p: V.KNIGHT
              }),
              new PiPo({
                x: x,
                y: y,
                c: c,
                p: V.ELEPHANT
              })
            ],
            vanish: [
              new PiPo({
                x: x,
                y: y,
                c: c,
                p: V.KNIGHT
              }),
              new PiPo({
                x: x,
                y: destFile,
                c: c,
                p: V.ELEPHANT
              })
            ],
            start: { x: x, y: y },
            end: { x: x, y: destFile }
          })
        );
      }
    }
    else {
      let normalMoves = [];
      switch (this.getPiece(x, y)) {
        case V.PAWN:
          normalMoves = this.getPotentialPawnMoves([x, y]);
          break;
        case V.ROOK:
          normalMoves = this.getPotentialRookMoves([x, y]);
          break;
        case V.KNIGHT:
          normalMoves = this.getPotentialKnightMoves([x, y]);
          break;
        case V.ELEPHANT:
          normalMoves = this.getPotentialElephantMoves([x, y]);
          break;
        case V.ADVISOR:
          normalMoves = this.getPotentialAdvisorMoves([x, y]);
          break;
        case V.KING:
          normalMoves = this.getPotentialKingMoves([x, y]);
          break;
        case V.CANNON:
          normalMoves = this.getPotentialCannonMoves([x, y]);
          break;
      }
      Array.prototype.push.apply(moves, normalMoves);
    }
    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const c = this.getColor(x, y);
    const oppCol = V.GetOppCol(c);
    const shiftX = (c == 'w' ? -1 : 1);
    const rank23 = (oppCol == 'w' ? [8, 7] : [1, 2]);
    let steps = [[shiftX, 0], [0, -1], [0, 1]];
    // Diagonal moves inside enemy palace:
    if (y == 4 && x == rank23[0])
      Array.prototype.push.apply(steps, [[shiftX, 1], [shiftX, -1]]);
    else if (x == rank23[1]) {
      if (y == 3) steps.push([shiftX, 1]);
      else if (y == 5) steps.push([shiftX, -1]);
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

  elephantStepsFromRookStep(step) {
    if (step[0] == 0) return [ [2, 3*step[1]], [-2, 3*step[1]] ];
    return [ [3*step[0], 2], [3*step[0], -2] ];
  }

  getPotentialElephantMoves([x, y]) {
    let steps = [];
    for (let rookStep of ChessRules.steps[V.ROOK]) {
      const eSteps = this.elephantStepsFromRookStep(rookStep);
      const [i, j] = [x + rookStep[0], y + rookStep[1]];
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        // Check second crossing:
        const knightSteps = this.knightStepsFromRookStep(rookStep);
        for (let k of [0, 1]) {
          const [ii, jj] = [x + knightSteps[k][0], y + knightSteps[k][1]];
          if (V.OnBoard(ii, jj) && this.board[ii][jj] == V.EMPTY)
            steps.push(eSteps[k]); //ok: same ordering
        }
      }
    }
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  palacePeopleMoves([x, y]) {
    const c = this.getColor(x, y);
    let steps = [];
    // Orthogonal steps:
    if (x < (c == 'w' ? 9 : 2)) steps.push([1, 0]);
    if (x > (c == 'w' ? 7 : 0)) steps.push([-1, 0]);
    if (y > 3) steps.push([0, -1]);
    if (y < 5) steps.push([0, 1]);
    // Diagonal steps, if in the middle or corner:
    if (
      y != 4 &&
      (
        (c == 'w' && x != 8) ||
        (c == 'b' && x != 1)
      )
    ) {
      // In a corner: maximum one diagonal step available
      let step = null;
      const direction = (c == 'w' ? -1 : 1);
      if ((c == 'w' && x == 9) || (c == 'b' && x == 0)) {
        // On first line
        if (y == 3) step = [direction, 1];
        else step = [direction, -1];
      }
      else if ((c == 'w' && x == 7) || (c == 'b' && x == 2)) {
        // On third line
        if (y == 3) step = [-direction, 1];
        else step = [-direction, -1];
      }
      steps.push(step);
    }
    else if (
      y == 4 &&
      (
        (c == 'w' && x == 8) ||
        (c == 'b' && x == 1)
      )
    ) {
      // At the middle: all directions available
      Array.prototype.push.apply(steps, ChessRules.steps[V.BISHOP]);
    }
    return super.getSlideNJumpMoves([x, y], steps, "oneStep");
  }

  getPotentialAdvisorMoves(sq) {
    return this.palacePeopleMoves(sq);
  }

  getPotentialKingMoves(sq) {
    return this.palacePeopleMoves(sq);
  }

  getPotentialRookMoves([x, y]) {
    let moves = super.getPotentialRookMoves([x, y]);
    if ([3, 5].includes(y) && [0, 2, 7, 9].includes(x)) {
      // In a corner of a palace: move along diagonal
      const step = [[0, 7].includes(x) ? 1 : -1, 4 - y];
      const oppCol = V.GetOppCol(this.getColor(x, y));
      for (let i of [1, 2]) {
        const [xx, yy] = [x + i * step[0], y + i * step[1]];
        if (this.board[xx][yy] == V.EMPTY)
          moves.push(this.getBasicMove([x, y], [xx, yy]));
        else {
          if (this.getColor(xx, yy) == oppCol)
            moves.push(this.getBasicMove([x, y], [xx, yy]));
          break;
        }
      }
    }
    else if (y == 4 && [1, 8].includes(x)) {
      // In the middle of a palace: 4 one-diagonal-step to check
      Array.prototype.push.apply(
        moves,
        super.getSlideNJumpMoves([x, y],
                                 ChessRules.steps[V.BISHOP],
                                 "oneStep")
      );
    }
    return moves;
  }

  // NOTE: (mostly) duplicated from Shako (TODO?)
  getPotentialCannonMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    // Look in every direction until an obstacle (to jump) is met
    for (const step of V.steps[V.ROOK]) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      // Then, search for an enemy (if jumped piece isn't a cannon)
      if (V.OnBoard(i, j) && this.getPiece(i, j) != V.CANNON) {
        i += step[0];
        j += step[1];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          moves.push(this.getBasicMove([x, y], [i, j]));
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) != V.CANNON
        ) {
          moves.push(this.getBasicMove([x, y], [i, j]));
        }
      }
    }
    if ([3, 5].includes(y) && [0, 2, 7, 9].includes(x)) {
      // In a corner of a palace: hop over next obstacle if possible
      const step = [[0, 7].includes(x) ? 1 : -1, 4 - y];
      const [x1, y1] = [x + step[0], y + step[1]];
      const [x2, y2] = [x + 2 * step[0], y + 2 * step[1]];
      if (
        this.board[x1][y1] != V.EMPTY &&
        this.getPiece(x1, y1) != V.CANNON &&
        (
          this.board[x2][y2] == V.EMPTY ||
          (
            this.getColor(x2, y2) == oppCol &&
            this.getPiece(x2, y2) != V.CANNON
          )
        )
      ) {
        moves.push(this.getBasicMove([x, y], [x2, y2]));
      }
    }
    return moves;
  }

  // (King) Never attacked by advisor, since it stays in the palace
  isAttacked(sq, color) {
    return (
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByKnight(sq, color) ||
      this.isAttackedByElephant(sq, color) ||
      this.isAttackedByCannon(sq, color)
    );
  }

  onPalaceDiagonal([x, y]) {
    return (
      (y == 4 && [1, 8].includes(x)) ||
      ([3, 5].includes(y) && [0, 2, 7, 9].includes(x))
    );
  }

  isAttackedByPawn([x, y], color) {
    const shiftX = (color == 'w' ? 1 : -1); //shift from king
    if (super.isAttackedBySlideNJump(
      [x, y], color, V.PAWN, [[shiftX, 0], [0, 1], [0, -1]], "oneStep")
    ) {
      return true;
    }
    if (this.onPalaceDiagonal([x, y])) {
      for (let yStep of [-1, 1]) {
        const [xx, yy] = [x + shiftX, y + yStep];
        if (
          this.onPalaceDiagonal([xx,yy]) &&
          this.board[xx][yy] != V.EMPTY &&
          this.getColor(xx, yy) == color &&
          this.getPiece(xx, yy) == V.PAWN
        ) {
          return true;
        }
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

  elephantStepsFromBishopStep(step) {
    return [ [3*step[0], 2*step[1]], [2*step[0], 3*step[1]] ];
  }

  isAttackedByElephant([x, y], color) {
    // Check bishop steps: if empty, look continuation elephant step
    let steps = [];
    for (let s of ChessRules.steps[V.BISHOP]) {
      const [i1, j1] = [x + s[0], y + s[1]];
      const [i2, j2] = [x + 2*s[0], y + 2*s[1]];
      if (
        V.OnBoard(i2, j2) && this.board[i2][j2] == V.EMPTY &&
        V.OnBoard(i1, j1) && this.board[i1][j1] == V.EMPTY
      ) {
        Array.prototype.push.apply(steps, this.elephantStepsFromBishopStep(s));
      }
    }
    return (
      super.isAttackedBySlideNJump([x, y], color, V.ELEPHANT, steps, "oneStep")
    );
  }

  isAttackedByRook([x, y], color) {
    if (super.isAttackedByRook([x, y], color)) return true;
    // Also check diagonals, if inside palace
    if (this.onPalaceDiagonal([x, y])) {
      // TODO: next scan is clearly suboptimal
      for (let s of ChessRules.steps[V.BISHOP]) {
        for (let i of [1, 2]) {
          const [xx, yy] = [x + i * s[0], y + i * s[1]];
          if (
            V.OnBoard(xx, yy) &&
            this.onPalaceDiagonal([xx, yy])
          ) {
            if (this.board[xx][yy] != V.EMPTY) {
              if (
                this.getColor(xx, yy) == color &&
                this.getPiece(xx, yy) == V.ROOK
              ) {
                return true;
              }
              break;
            }
          }
          else continue;
        }
      }
    }
    return false;
  }

  // NOTE: (mostly) duplicated from Shako (TODO?)
  isAttackedByCannon([x, y], color) {
    // Reversed process: is there an obstacle in line,
    // and a cannon next in the same line?
    for (const step of V.steps[V.ROOK]) {
      let [i, j] = [x+step[0], y+step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.getPiece(i, j) != V.CANNON) {
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

  getCurrentScore() {
    if ([this.bikjangFlag, this.passFlag].includes(2)) return "1/2";
    const color = this.turn;
    // super.atLeastOneMove() does not consider passing (OK)
    if (this.underCheck(color) && !super.atLeastOneMove())
      return (color == "w" ? "0-1" : "1-0");
    return "*";
  }

  static get VALUES() {
    return {
      p: 2,
      r: 13,
      n: 5,
      e: 3,
      a: 3,
      c: 7,
      k: 1000
    };
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static GenRandInitFen() {
    // No randomization here (but initial setup choice)
    return (
      "rnea1aenr/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RNEA1AENR w 0 00"
    );
  }

  play(move) {
    move.subTurn = this.subTurn; //much easier
    if (this.movesCount >= 2 || this.subTurn == 2 || move.vanish.length == 0) {
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
      this.movesCount++;
    }
    else this.subTurn = 2;
    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.vanish.length > 0) super.postPlay(move);
    else if (this.movesCount > 2) this.passFlag++;
    // Update bikjang flag
    if (this.kingPos['w'][1] == this.kingPos['b'][1]) {
      const y = this.kingPos['w'][1];
      let bikjang = true;
      for (let x = this.kingPos['b'][0] + 1; x < this.kingPos['w'][0]; x++) {
        if (this.board[x][y] != V.EMPTY) {
          bikjang = false;
          break;
        }
      }
      if (bikjang) this.bikjangFlag++;
      else this.bikjangFlag = 0;
    }
    else this.bikjangFlag = 0;
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    this.postUndo(move);
    if (this.movesCount >= 2 || this.subTurn == 1 || move.vanish.length == 0) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    this.subTurn = move.subTurn;
  }

  postUndo(move) {
    if (move.vanish.length > 0) super.postUndo(move);
  }

  getNotation(move) {
    if (move.vanish.length == 0) return "pass";
    if (move.appear.length == 2) return "S"; //"swap"
    let notation = super.getNotation(move);
    if (move.vanish.length == 2 && move.vanish[0].p == V.PAWN)
      notation = "P" + notation.substr(1);
    return notation;
  }

};
