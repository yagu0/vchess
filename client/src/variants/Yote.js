import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class YoteRules extends ChessRules {

  static get Options() {
    return null;
  }

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Monochrome() {
    return true;
  }

  static get Notoodark() {
    return true;
  }

  static get ReverseColors() {
    return true;
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

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 3) Check reserves
    if (
      !fenParsed.reserve ||
      !fenParsed.reserve.match(/^([0-9]{1,2},?){2,2}$/)
    ) {
      return false;
    }
    // 4) Check lastMove
    if (!fenParsed.lastMove) return false;
    const lmParts = fenParsed.lastMove.split(",");
    for (lp of lmParts) {
      if (lp != "-" && !lp.match(/^([a-f][1-5]){2,2}$/)) return false;
    }
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      {
        reserve: fenParts[3],
        lastMove: fenParts[4]
      }
    );
  }

  static GenRandInitFen() {
    return "6/6/6/6/6 w 0 12,12 -,-";
  }

  getFen() {
    return (
      super.getFen() + " " +
      this.getReserveFen() + " " +
      this.getLastmoveFen()
    );
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    return (
      (!this.reserve["w"] ? 0 : this.reserve["w"][V.PAWN]) + "," +
      (!this.reserve["b"] ? 0 : this.reserve["b"][V.PAWN])
    );
  }

  getLastmoveFen() {
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    return (
      (
        !lm['w']
          ? '-'
          : V.CoordsToSquare(lm['w'].start) + V.CoordsToSquare(lm['w'].end)
      )
      + "," +
      (
        !lm['b']
          ? '-'
          : V.CoordsToSquare(lm['b'].start) + V.CoordsToSquare(lm['b'].end)
      )
    );
  }

  setOtherVariables(fen) {
    const fenParsed = V.ParseFen(fen);
    const reserve = fenParsed.reserve.split(",").map(x => parseInt(x, 10));
    this.reserve = {
      w: { [V.PAWN]: reserve[0] },
      b: { [V.PAWN]: reserve[1] }
    };
    // And last moves (to avoid undoing your last move)
    const lmParts = fenParsed.lastMove.split(",");
    this.lastMove = [{ w: null, b: null }];
    ['w', 'b'].forEach((c, i) => {
      if (lmParts[i] != '-') {
        this.lastMove[0][c] = {
          start: V.SquareToCoords(lmParts[i].substr(0, 2)),
          end: V.SquareToCoords(lmParts[i].substr(2))
        };
      }
    });
    // Local stack to know if (current) last move captured something
    this.captures = [false];
  }

  static get size() {
    return { x: 5, y: 6 };
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece() {
    return V.PAWN;
  }

  getPpath(b) {
    return "Yote/" + b;
  }

  getReservePpath(index, color) {
    return "Yote/" + color + V.PAWN;
  }

  static get RESERVE_PIECES() {
    return [V.PAWN];
  }

  canIplay(side, [x, y]) {
    if (this.turn != side) return false;
    const L = this.captures.length;
    if (!this.captures[L-1]) return this.getColor(x, y) == side;
    return (x < V.size.x && this.getColor(x, y) != side);
  }

  hoverHighlight([x, y], side) {
    if (!!side && side != this.turn) return false;
    const L = this.captures.length;
    if (!this.captures[L-1]) return false;
    const oppCol = V.GetOppCol(this.turn);
    return (this.board[x][y] != V.EMPTY && this.getColor(x, y) == oppCol);
  }

  // TODO: onlyClick() doesn't fulfill exactly its role.
  // Seems that there is some lag... TOFIX
  onlyClick([x, y]) {
    const L = this.captures.length;
    return (this.captures[L-1] && this.getColor(x, y) != this.turn);
  }

  // PATCH related to above TO-DO:
  getPossibleMovesFrom([x, y]) {
    if (x < V.size.x && this.board[x][y] == V.EMPTY) return [];
    return super.getPossibleMovesFrom([x, y]);
  }

  doClick([x, y]) {
    const L = this.captures.length;
    if (!this.captures[L-1]) return null;
    const oppCol = V.GetOppCol(this.turn);
    if (this.board[x][y] == V.EMPTY || this.getColor(x, y) != oppCol)
      return null;
    return new Move({
      appear: [],
      vanish: [ new PiPo({ x: x, y: y, c: oppCol, p: V.PAWN }) ],
      end: { x: x, y: y }
    });
  }

  getReserveMoves(x) {
    const color = this.turn;
    const L = this.captures.length;
    if (
      this.captures[L-1] ||
      !this.reserve[color] ||
      this.reserve[color][V.PAWN] == 0
    ) {
      return [];
    }
    let moves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: V.PAWN
              })
            ],
            vanish: [],
            start: { x: x, y: 0 }, //a bit artificial...
            end: { x: i, y: j }
          });
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    const L = this.captures.length;
    if (this.captures[L-1]) {
      if (x >= V.size.x) return [];
      const mv = this.doClick([x, y]);
      return (!!mv ? [mv] : []);
    }
    if (x >= V.size.x) return this.getReserveMoves(x);
    return this.getPotentialPawnMoves([x, y]);
  }

  getPotentialPawnMoves([x, y]) {
    let moves = [];
    const color = this.turn;
    const L = this.lastMove.length;
    const lm = this.lastMove[L-1];
    let forbiddenStep = null;
    if (!!lm[color] && x == lm[color].end.x && y == lm[color].end.y) {
      forbiddenStep = [
        lm[color].start.x - lm[color].end.x,
        lm[color].start.y - lm[color].end.y
      ];
    }
    const oppCol = V.GetOppCol(color);
    for (let s of V.steps[V.ROOK]) {
      const [i1, j1] = [x + s[0], y + s[1]];
      if (V.OnBoard(i1, j1)) {
        if (this.board[i1][j1] == V.EMPTY) {
          if (
            !forbiddenStep ||
            s[0] != forbiddenStep[0] ||
            s[1] != forbiddenStep[1]
          ) {
            moves.push(super.getBasicMove([x, y], [i1, j1]));
          }
        }
        else if (this.getColor(i1, j1) == oppCol) {
          const [i2, j2] = [i1 + s[0], j1 + s[1]];
          if (V.OnBoard(i2, j2) && this.board[i2][j2] == V.EMPTY) {
            let mv = new Move({
              appear: [
                new PiPo({ x: i2, y: j2, c: color, p: V.PAWN })
              ],
              vanish: [
                new PiPo({ x: x, y: y, c: color, p: V.PAWN }),
                new PiPo({ x: i1, y: j1, c: oppCol, p: V.PAWN })
              ]
            });
            moves.push(mv);
          }
        }
      }
    }
    return moves;
  }

  getAllPotentialMoves() {
    const L = this.captures.length;
    const color = (this.captures[L-1] ? V.GetOppCol(this.turn) : this.turn);
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    potentialMoves = potentialMoves.concat(
      this.getReserveMoves(V.size.x + (color == "w" ? 0 : 1)));
    return potentialMoves;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  atLeastOneMove() {
    if (!super.atLeastOneMove()) {
      // Search one reserve move
      const moves =
        this.getReserveMoves(V.size.x + (this.turn == "w" ? 0 : 1));
      if (moves.length > 0) return true;
      return false;
    }
    return true;
  }

  play(move) {
    const color = this.turn;
    move.turn = color; //for undo
    const L = this.lastMove.length;
    if (color == 'w')
      this.lastMove.push({ w: null, b: this.lastMove[L-1]['b'] });
    if (move.appear.length == move.vanish.length) { //== 1
      // Normal move (non-capturing, non-dropping, non-removal)
      let lm = this.lastMove[L - (color == 'w' ? 0 : 1)];
      if (!lm[color]) lm[color] = {};
      lm[color].start = move.start;
      lm[color].end = move.end;
    }
    const oppCol = V.GetOppCol(color);
    V.PlayOnBoard(this.board, move);
    const captureNotEnding = (
      move.vanish.length == 2 &&
      this.board.some(b => b.some(cell => cell != "" && cell[0] == oppCol))
    );
    this.captures.push(captureNotEnding);
    // Change turn unless I just captured something,
    // and an opponent stone can be removed from board.
    if (!captureNotEnding) {
      this.turn = oppCol;
      this.movesCount++;
    }
    this.postPlay(move);
  }

  undo(move) {
    V.UndoOnBoard(this.board, move);
    if (this.turn == 'b') this.lastMove.pop();
    else this.lastMove['b'] = null;
    this.captures.pop();
    if (move.turn != this.turn) {
      this.turn = move.turn;
      this.movesCount--;
    }
    this.postUndo(move);
  }

  postPlay(move) {
    if (move.vanish.length == 0) {
      const color = move.appear[0].c;
      this.reserve[color][V.PAWN]--;
      if (this.reserve[color][V.PAWN] == 0) delete this.reserve[color];
    }
  }

  postUndo(move) {
    if (move.vanish.length == 0) {
      const color = move.appear[0].c;
      if (!this.reserve[color]) this.reserve[color] = { [V.PAWN]: 0 };
      this.reserve[color][V.PAWN]++;
    }
  }

  getCurrentScore() {
    if (this.movesCount <= 2) return "*";
    const color = this.turn;
    // If no stones on board, or no move available, I lose
    if (
      this.board.every(b => {
        return b.every(cell => {
          return (cell == "" || cell[0] != color);
        });
      })
      ||
      !this.atLeastOneMove()
    ) {
      return (color == 'w' ? "0-1" : "1-0");
    }
    return "*";
  }

  getComputerMove() {
    const moves = super.getAllValidMoves();
    if (moves.length == 0) return null;
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    // Capture available? If yes, play it
    const captures = moves.filter(m => m.vanish.length == 2);
    if (captures.length >= 1) {
      const m1 = captures[randInt(captures.length)];
      this.play(m1);
      const moves2 = super.getAllValidMoves();
      // Remove a stone which was about to capture one of ours, if possible
      let candidates = [];
      for (let m2 of moves2) {
        const [x, y] = [m2.start.x, m2.start.y];
        for (let s of V.steps[V.ROOK]) {
          const [i, j] = [x + 2*s[0], y + 2*s[1]];
          if (
            V.OnBoard(i, j) &&
            this.board[i][j] == V.EMPTY &&
            this.board[i - s[0], j - s[1]] != V.EMPTY &&
            this.getColor(i - s[0], j - s[1]) == color
          ) {
            candidates.push(m2);
            break;
          }
        }
      }
      this.undo(m1);
      if (candidates.length >= 1)
        return [m1, candidates[randInt(candidates.length)]];
      return [m1, moves2[randInt(moves2.length)]];
    }
    // Just play a random move, which if possible do not let a capture
    let candidates = [];
    for (let m of moves) {
      this.play(m);
      const moves2 = super.getAllValidMoves();
      if (moves2.every(m2 => m2.vanish.length <= 1))
        candidates.push(m);
      this.undo(m);
    }
    if (candidates.length >= 1) return candidates[randInt(candidates.length)];
    return moves[randInt(moves.length)];
  }

  getNotation(move) {
    if (move.vanish.length == 0)
      // Placement:
      return "@" + V.CoordsToSquare(move.end);
    if (move.appear.length == 0)
      // Removal after capture:
      return V.CoordsToSquare(move.start) + "X";
    return (
      V.CoordsToSquare(move.start) +
      (move.vanish.length == 2 ? "x" : "") +
      V.CoordsToSquare(move.end)
    );
  }

};
