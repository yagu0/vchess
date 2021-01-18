import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class FanoronaRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Monochrome() {
    return true;
  }

  static get Lines() {
    let lines = [];
    // Draw all inter-squares lines, shifted:
    for (let i = 0; i < V.size.x; i++)
      lines.push([[i+0.5, 0.5], [i+0.5, V.size.y-0.5]]);
    for (let j = 0; j < V.size.y; j++)
      lines.push([[0.5, j+0.5], [V.size.x-0.5, j+0.5]]);
    const columnDiags = [
      [[0.5, 0.5], [2.5, 2.5]],
      [[0.5, 2.5], [2.5, 0.5]],
      [[2.5, 0.5], [4.5, 2.5]],
      [[4.5, 0.5], [2.5, 2.5]]
    ];
    for (let j of [0, 2, 4, 6]) {
      lines = lines.concat(
        columnDiags.map(L => [[L[0][0], L[0][1] + j], [L[1][0], L[1][1] + j]])
      );
    }
    return lines;
  }

  static get Notoodark() {
    return true;
  }

  static GenRandInitFen() {
    return "ppppppppp/ppppppppp/pPpP1pPpP/PPPPPPPPP/PPPPPPPPP w 0";
  }

  setOtherVariables(fen) {
    // Local stack of captures during a turn (squares + directions)
    this.captures = [ [] ];
  }

  static get size() {
    return { x: 5, y: 9 };
  }

  getPiece() {
    return V.PAWN;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (row[i].toLowerCase() == V.PAWN) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    return true;
  }

  getPpath(b) {
    return "Fanorona/" + b;
  }

  getPPpath(m) {
    // m.vanish.length >= 2, first capture gives direction
    const ref = (Math.abs(m.vanish[1].x - m.start.x) == 1 ? m.start : m.end);
    const step = [m.vanish[1].x - ref.x, m.vanish[1].y - ref.y];
    const normalizedStep = [
      step[0] / Math.abs(step[0]),
      step[1] / Math.abs(step[1])
    ];
    return (
      "Fanorona/arrow_" +
      (normalizedStep[0] || 0) + "_" + (normalizedStep[1] || 0)
    );
  }

  // After moving, add stones captured in "step" direction from new location
  // [x, y] to mv.vanish (if any captured stone!)
  addCapture([x, y], step, move) {
    let [i, j] = [x + step[0], y + step[1]];
    const oppCol = V.GetOppCol(move.vanish[0].c);
    while (
      V.OnBoard(i, j) &&
      this.board[i][j] != V.EMPTY &&
      this.getColor(i, j) == oppCol
    ) {
      move.vanish.push(new PiPo({ x: i, y: j, c: oppCol, p: V.PAWN }));
      i += step[0];
      j += step[1];
    }
    return (move.vanish.length >= 2);
  }

  getPotentialMovesFrom([x, y]) {
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    const L = captures.length;
    if (L > 0) {
      var c = captures[L-1];
      if (x != c.square.x + c.step[0] || y != c.square.y + c.step[1])
        return [];
    }
    const oppCol = V.GetOppCol(this.turn);
    let steps = V.steps[V.ROOK];
    if ((x + y) % 2 == 0) steps = steps.concat(V.steps[V.BISHOP]);
    let moves = [];
    for (let s of steps) {
      if (L > 0 && c.step[0] == s[0] && c.step[1] == s[1]) {
        // Add a move to say "I'm done capturing"
        moves.push(
          new Move({
            appear: [],
            vanish: [],
            start: { x: x, y: y },
            end: { x: x - s[0], y: y - s[1] }
          })
        );
        continue;
      }
      let [i, j] = [x + s[0], y + s[1]];
      if (captures.some(c => c.square.x == i && c.square.y == j)) continue;
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        // The move is potentially allowed. Might lead to 2 different captures
        let mv = super.getBasicMove([x, y], [i, j]);
        const capt = this.addCapture([i, j], s, mv);
        if (capt) {
          moves.push(mv);
          mv = super.getBasicMove([x, y], [i, j]);
        }
        const capt_bw = this.addCapture([x, y], [-s[0], -s[1]], mv);
        if (capt_bw) moves.push(mv);
        // Captures take priority (if available)
        if (!capt && !capt_bw && L == 0) moves.push(mv);
      }
    }
    return moves;
  }

  atLeastOneCapture() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    const L = captures.length;
    if (L > 0) {
      // If some adjacent enemy stone, with free space to capture it,
      // toward a square not already visited, through a different step
      // from last one: then yes.
      const c = captures[L-1];
      const [x, y] = [c.square.x + c.step[0], c.square.y + c.step[1]];
      let steps = V.steps[V.ROOK];
      if ((x + y) % 2 == 0) steps = steps.concat(V.steps[V.BISHOP]);
      // TODO: half of the steps explored are redundant
      for (let s of steps) {
        if (s[0] == c.step[0] && s[1] == c.step[1]) continue;
        const [i, j] = [x + s[0], y + s[1]];
        if (
          !V.OnBoard(i, j) ||
          this.board[i][j] != V.EMPTY ||
          captures.some(c => c.square.x == i && c.square.y == j)
        ) {
          continue;
        }
        if (
          V.OnBoard(i + s[0], j + s[1]) &&
          this.board[i + s[0]][j + s[1]] != V.EMPTY &&
          this.getColor(i + s[0], j + s[1]) == oppCol
        ) {
          return true;
        }
        if (
          V.OnBoard(x - s[0], y - s[1]) &&
          this.board[x - s[0]][y - s[1]] != V.EMPTY &&
          this.getColor(x - s[0], y - s[1]) == oppCol
        ) {
          return true;
        }
      }
      return false;
    }
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          // TODO: this could be more efficient
          this.getPotentialMovesFrom([i, j]).some(m => m.vanish.length >= 2)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  static KeepCaptures(moves) {
    return moves.filter(m => m.vanish.length >= 2);
  }

  getPossibleMovesFrom(sq) {
    let moves = this.getPotentialMovesFrom(sq);
    const L0 = this.captures.length;
    const captures = this.captures[L0 - 1];
    if (captures.length > 0) return this.getPotentialMovesFrom(sq);
    const captureMoves = V.KeepCaptures(moves);
    if (captureMoves.length > 0) return captureMoves;
    if (this.atLeastOneCapture()) return [];
    return moves;
  }

  getAllValidMoves() {
    const moves = super.getAllValidMoves();
    if (moves.some(m => m.vanish.length >= 2)) return V.KeepCaptures(moves);
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  play(move) {
    const color = this.turn;
    move.turn = color; //for undo
    V.PlayOnBoard(this.board, move);
    const L0 = this.captures.length;
    let captures = this.captures[L0 - 1];
    if (move.vanish.length >= 2) {
      captures.push({
        square: move.start,
        step: [move.end.x - move.start.x, move.end.y - move.start.y]
      });
      if (this.atLeastOneCapture())
        // There could be other captures (optional)
        // This field is mostly useful for computer play.
        move.notTheEnd = true;
      else captures.pop(); //useless now
    }
    if (!move.notTheEnd) {
      this.turn = V.GetOppCol(color);
      this.movesCount++;
      this.captures.push([]);
    }
  }

  undo(move) {
    V.UndoOnBoard(this.board, move);
    if (move.turn != this.turn) {
      this.turn = move.turn;
      this.movesCount--;
      this.captures.pop();
    }
    else {
      const L0 = this.captures.length;
      let captures = this.captures[L0 - 1];
      captures.pop();
    }
  }

  getCurrentScore() {
    const color = this.turn;
    // If no stones on board, I lose
    if (
      this.board.every(b => {
        return b.every(cell => {
          return (cell == "" || cell[0] != color);
        });
      })
    ) {
      return (color == 'w' ? "0-1" : "1-0");
    }
    return "*";
  }

  getComputerMove() {
    const moves = this.getAllValidMoves();
    if (moves.length == 0) return null;
    const color = this.turn;
    // Capture available? If yes, play it
    let captures = moves.filter(m => m.vanish.length >= 2);
    let mvArray = [];
    while (captures.length >= 1) {
      // Then just pick random captures (trying to maximize)
      let candidates = captures.filter(c => !!c.notTheEnd);
      let mv = null;
      if (candidates.length >= 1) mv = candidates[randInt(candidates.length)];
      else mv = captures[randInt(captures.length)];
      this.play(mv);
      mvArray.push(mv);
      captures = (this.turn == color ? this.getAllValidMoves() : []);
    }
    if (mvArray.length >= 1) {
      for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
      return mvArray;
    }
    // Just play a random move, which if possible does not let a capture
    let candidates = [];
    for (let m of moves) {
      this.play(m);
      if (!this.atLeastOneCapture()) candidates.push(m);
      this.undo(m);
    }
    if (candidates.length >= 1) return candidates[randInt(candidates.length)];
    return moves[randInt(moves.length)];
  }

  getNotation(move) {
    if (move.appear.length == 0) return "stop";
    return (
      V.CoordsToSquare(move.start) +
      V.CoordsToSquare(move.end) +
      (move.vanish.length >= 2 ? "X" : "")
    );
  }

};
