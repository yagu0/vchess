import { ChessRules } from "@/base_rules";
import { randInt, shuffle } from "@/utils/alea";
import { ArrayFun } from "@/utils/array";

export class FootballRules extends ChessRules {

  static get HasEnpassant() {
    return false;
  }

  static get HasFlags() {
    return false;
  }

  static get size() {
    return { x: 9, y: 9 };
  }

  static get Lines() {
    return [
      // White goal:
      [[0, 4], [0, 5]],
      [[0, 5], [1, 5]],
      [[1, 4], [0, 4]],
      // Black goal:
      [[9, 4], [9, 5]],
      [[9, 5], [8, 5]],
      [[8, 4], [9, 4]]
    ];
  }

  static get BALL() {
    // 'b' is already taken:
    return "aa";
  }

  // Check that exactly one ball is on the board
  // + at least one piece per color.
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let pieces = { "w": 0, "b": 0 };
    let ballCount = 0;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        const lowerRi = row[i].toLowerCase();
        if (!!lowerRi.match(/^[a-z]$/)) {
          if (V.PIECES.includes(lowerRi))
            pieces[row[i] == lowerRi ? "b" : "w"]++;
          else if (lowerRi == 'a') ballCount++;
          else return false;
          sumElts++;
        }
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (ballCount != 1 || Object.values(pieces).some(v => v == 0))
      return false;
    return true;
  }

  static board2fen(b) {
    if (b == V.BALL) return 'a';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'a') return V.BALL;
    return ChessRules.fen2board(f);
  }

  getPpath(b) {
    if (b == V.BALL) return "Football/ball";
    return b;
  }

  canIplay(side, [x, y]) {
    return (
      side == this.turn &&
      (this.board[x][y] == V.BALL || this.getColor(x, y) == side)
    );
  }

  // No checks or king tracking etc. But, track ball
  setOtherVariables() {
    // Stack of "kicked by" coordinates, to avoid infinite loops
    this.kickedBy = [ {} ];
    this.subTurn = 1;
    this.ballPos = [-1, -1];
    for (let i=0; i < V.size.x; i++) {
      for (let j=0; j< V.size.y; j++) {
        if (this.board[i][j] == V.BALL) {
          this.ballPos = [i, j];
          return;
        }
      }
    }
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "rnbq1knbr/9/9/9/4a4/9/9/9/RNBQ1KNBR w 0";

    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Get random squares for every piece, totally freely
      let positions = shuffle(ArrayFun.range(8));
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
      // Fix bishops (on different colors)
      const realOddity =
        (pos) => { return (pos <= 3 ? pos % 2 : (pos + 1) % 2); };
      const rem2 = realOddity(positions[0]);
      if (rem2 == realOddity(positions[1])) {
        for (let i=2; i<8; i++) {
          if (realOddity(positions[i]) != rem2) {
            [positions[1], positions[i]] = [positions[i], positions[1]];
            break;
          }
        }
      }
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    const piecesB = pieces["b"].join("") ;
    const piecesW = pieces["w"].join("").toUpperCase();
    return (
      piecesB.substr(0, 4) + "1" + piecesB.substr(4) +
      "/9/9/9/4a4/9/9/9/" +
      piecesW.substr(0, 4) + "1" + piecesW.substr(4) +
      " w 0"
    );
  }

  tryKickFrom([x, y]) {
    const bp = this.ballPos;
    const emptySquare = (i, j) => {
      return V.OnBoard(i, j) && this.board[i][j] == V.EMPTY;
    };
    // Kick the (adjacent) ball from x, y with current turn:
    const step = [bp[0] - x, bp[1] - y];
    const piece = this.getPiece(x, y);
    let moves = [];
    if (piece == V.KNIGHT) {
      // The knight case is particular
      V.steps[V.KNIGHT].forEach(s => {
        const [i, j] = [bp[0] + s[0], bp[1] + s[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] == V.EMPTY &&
          (
            // In a corner? The, allow all ball moves
            ([0, 8].includes(bp[0]) && [0, 8].includes(bp[1])) ||
            // Do not end near the knight
            (Math.abs(i - x) >= 2 || Math.abs(j - y) >= 2)
          )
        ) {
          moves.push(super.getBasicMove(bp, [i, j]));
        }
      });
    }
    else {
      let compatible = false,
          oneStep = false;
      switch (piece) {
        case V.ROOK:
          compatible = (step[0] == 0 || step[1] == 0);
          break;
        case V.BISHOP:
          compatible = (step[0] != 0 && step[1] != 0);
          break;
        case V.QUEEN:
          compatible = true;
          break;
        case V.KING:
          compatible = true;
          oneStep = true;
          break;
      }
      if (!compatible) return [];
      let [i, j] = [bp[0] + step[0], bp[1] + step[1]];
      const horizontalStepOnGoalRow =
        ([0, 8].includes(bp[0]) && step.some(s => s == 0));
      if (
        emptySquare(i, j) &&
        (this.movesCount >= 2 || j != 4 || ![0, 8].includes(i)) &&
        (!horizontalStepOnGoalRow || j != 4)
      ) {
        moves.push(super.getBasicMove(bp, [i, j]));
        if (!oneStep) {
          do {
            i += step[0];
            j += step[1];
            if (!emptySquare(i, j)) break;
            if (
              (this.movesCount >= 2 || j != 4 || ![0, 8].includes(i)) &&
              (!horizontalStepOnGoalRow || j != 4)
            ) {
              moves.push(super.getBasicMove(bp, [i, j]));
            }
          } while (true);
        }
      }
      // Try the other direction (TODO: experimental)
      [i, j] = [bp[0] - 2*step[0], bp[1] - 2*step[1]];
      if (
        emptySquare(i, j) &&
        (this.movesCount >= 2 || j != 4 || ![0, 8].includes(i)) &&
        (!horizontalStepOnGoalRow || j != 4)
      ) {
        moves.push(super.getBasicMove(bp, [i, j]));
        if (!oneStep) {
          do {
            i -= step[0];
            j -= step[1];
            if (!emptySquare(i, j)) break;
            if (
              (this.movesCount >= 2 || j != 4 || ![0, 8].includes(i)) &&
              (!horizontalStepOnGoalRow || j != 4)
            ) {
              moves.push(super.getBasicMove(bp, [i, j]));
            }
          } while (true);
        }
      }
    }
    const kickedFrom = x + "-" + y;
    moves.forEach(m => m.start.by = kickedFrom)
    return moves;
  }

  getPotentialMovesFrom([x, y], computer) {
    const piece = this.getPiece(x, y);
    if (V.PIECES.includes(piece)) {
      if (this.subTurn > 1) return [];
      const moves = super.getPotentialMovesFrom([x, y])
                    .filter(m => m.end.y != 4 || ![0, 8].includes(m.end.x));
      // If bishop stuck in a corner: allow to jump over the next obstacle
      if (moves.length == 0 && piece == V.BISHOP) {
        if (
          x == 0 && y == 0 &&
          this.board[1][1] != V.EMPTY &&
          this.board[2][2] == V.EMPTY
        ) {
          return [super.getBasicMove([x, y], [2, 2])];
        }
        if (
          x == 0 && y == 8 &&
          this.board[1][7] != V.EMPTY &&
          this.board[2][6] == V.EMPTY
        ) {
          return [super.getBasicMove([x, y], [2, 6])];
        }
        if (
          x == 8 && y == 0 &&
          this.board[7][1] != V.EMPTY &&
          this.board[6][2] == V.EMPTY
        ) {
          return [super.getBasicMove([x, y], [6, 2])];
        }
        if (
          x == 8 && y == 8 &&
          this.board[7][7] != V.EMPTY &&
          this.board[6][6] == V.EMPTY
        ) {
          return [super.getBasicMove([x, y], [6, 6])];
        }
      }
      return moves;
    }
    // Kicking the ball: look for adjacent pieces.
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    const c = this.turn;
    let moves = [];
    let kicks = {};
    for (let s of steps) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == c
      ) {
        const kmoves = this.tryKickFrom([i, j]);
        kmoves.forEach(km => {
          const key = V.CoordsToSquare(km.start) + V.CoordsToSquare(km.end);
          if (!kicks[km]) {
            moves.push(km);
            kicks[km] = true;
          }
        });
      }
    }
    if (Object.keys(kicks).length > 0) {
      // And, always add the "end" move. For computer, keep only one
      outerLoop: for (let i=0; i < V.size.x; i++) {
        for (let j=0; j < V.size.y; j++) {
          if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == c) {
            moves.push(super.getBasicMove([x, y], [i, j]));
            if (!!computer) break outerLoop;
          }
        }
      }
    }
    return moves;
  }

  canTake() {
    return false;
  }

  // Extra arg "computer" to avoid trimming all redundant pass moves:
  getAllPotentialMoves(computer) {
    const color = this.turn;
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j], computer)
          );
        }
      }
    }
    return potentialMoves;
  }

  getAllValidMoves() {
    return this.filterValid(this.getAllPotentialMoves("computer"));
  }

  filterValid(moves) {
    const L = this.kickedBy.length;
    const kb = this.kickedBy[L-1];
    return moves.filter(m => !m.start.by || !kb[m.start.by]);
  }

  getCheckSquares() {
    return [];
  }

  allowAnotherPass(color) {
    // Two cases: a piece moved, or the ball moved.
    // In both cases, check our pieces and ball proximity,
    // so the move played doesn't matter (if ball position updated)
    const bp = this.ballPos;
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let s of steps) {
      const [i, j] = [this.ballPos[0] + s[0], this.ballPos[1] + s[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color
      ) {
        return true; //potentially...
      }
    }
    return false;
  }

  prePlay(move) {
    if (move.appear[0].p == 'a')
      this.ballPos = [move.appear[0].x, move.appear[0].y];
  }

  play(move) {
    // Special message saying "passes are over"
    const passesOver = (move.vanish.length == 2);
    if (!passesOver) {
      this.prePlay(move);
      V.PlayOnBoard(this.board, move);
    }
    move.turn = [this.turn, this.subTurn]; //easier undo
    if (passesOver || !this.allowAnotherPass(this.turn)) {
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
      this.movesCount++;
      this.kickedBy.push( {} );
    }
    else {
      this.subTurn++;
      if (!!move.start.by) {
        const L = this.kickedBy.length;
        this.kickedBy[L-1][move.start.by] = true;
      }
    }
  }

  undo(move) {
    const passesOver = (move.vanish.length == 2);
    if (move.turn[0] != this.turn) {
      [this.turn, this.subTurn] = move.turn;
      this.movesCount--;
      this.kickedBy.pop();
    }
    else {
      this.subTurn--;
      if (!!move.start.by) {
        const L = this.kickedBy.length;
        delete this.kickedBy[L-1][move.start.by];
      }
    }
    if (!passesOver) {
      V.UndoOnBoard(this.board, move);
      this.postUndo(move);
    }
  }

  postUndo(move) {
    if (move.vanish[0].p == 'a')
      this.ballPos = [move.vanish[0].x, move.vanish[0].y];
  }

  getCurrentScore() {
    if (this.board[0][4] == V.BALL) return "1-0";
    if (this.board[8][4] == V.BALL) return "0-1";
    return "*";
  }

  getComputerMove() {
    let initMoves = this.getAllValidMoves();
    if (initMoves.length == 0) return null;
    let moves = JSON.parse(JSON.stringify(initMoves));
    let mvArray = [];
    let mv = null;
    // Just play random moves (for now at least. TODO?)
    const c = this.turn;
    while (moves.length > 0) {
      mv = moves[randInt(moves.length)];
      mvArray.push(mv);
      this.play(mv);
      if (mv.vanish.length == 1 && this.allowAnotherPass(c))
        // Potential kick
        moves = this.getPotentialMovesFrom(this.ballPos);
      else break;
    }
    for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
    return (mvArray.length > 1 ? mvArray : mvArray[0]);
  }

  // NOTE: evalPosition() is wrong, but unused since bot plays at random

  getNotation(move) {
    if (move.vanish.length == 2) return "pass";
    if (move.vanish[0].p != 'a') return super.getNotation(move);
    // Kick: simple notation (TODO?)
    return V.CoordsToSquare(move.end);
  }

};
