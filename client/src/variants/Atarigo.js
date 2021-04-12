import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";
import { ArrayFun } from "@/utils/array";

export class AtarigoRules extends ChessRules {

  static get Options() {
    return null;
  }

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
    return lines;
  }

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
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
    // 3) Check capture "flag"
    if (!fenParsed.capture || !fenParsed.capture.match(/^[01]$/))
      return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      // Capture field allows to compute the score cleanly.
      { capture: fenParts[3] }
    );
  }

  static get size() {
    return { x: 12, y: 12 };
  }

  static GenRandInitFen() {
    return "93/93/93/93/93/5Pp5/5pP5/93/93/93/93/93 w 0 0";
  }

  getFen() {
    return super.getFen() + " " + (this.capture ? 1 : 0);
  }

  setOtherVariables(fen) {
    this.capture = parseInt(V.ParseFen(fen).capture, 10);
  }

  getPiece() {
    return V.PAWN;
  }

  getPpath(b) {
    return "Gomoku/" + b;
  }

  onlyClick() {
    return true;
  }

  canIplay(side, [x, y]) {
    return (side == this.turn && this.board[x][y] == V.EMPTY);
  }

  hoverHighlight([x, y], side) {
    if (!!side && side != this.turn) return false;
    return (this.board[x][y] == V.EMPTY);
  }

  searchForEmptySpace([x, y], color, explored) {
    if (explored[x][y]) return false; //didn't find empty space
    explored[x][y] = true;
    let res = false;
    for (let s of V.steps[V.ROOK]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j)) {
        if (this.board[i][j] == V.EMPTY) res = true;
        else if (this.getColor(i, j) == color)
          res = this.searchForEmptySpace([i, j], color, explored) || res;
      }
    }
    return res;
  }

  doClick([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let move = new Move({
      appear: [
        new PiPo({ x: x, y: y, c: color, p: V.PAWN })
      ],
      vanish: [],
      start: { x: -1, y: -1 }
    });
    V.PlayOnBoard(this.board, move); //put the stone
    let noSuicide = false;
    let captures = [];
    for (let s of V.steps[V.ROOK]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j)) {
        if (this.board[i][j] == V.EMPTY) noSuicide = true; //clearly
        else if (this.getColor(i, j) == color) {
          // Free space for us = not a suicide
          if (!noSuicide) {
            let explored = ArrayFun.init(V.size.x, V.size.y, false);
            noSuicide = this.searchForEmptySpace([i, j], color, explored);
          }
        }
        else {
          // Free space for opponent = not a capture
          let explored = ArrayFun.init(V.size.x, V.size.y, false);
          const captureSomething =
            !this.searchForEmptySpace([i, j], oppCol, explored);
          if (captureSomething) {
            for (let ii = 0; ii < V.size.x; ii++) {
              for (let jj = 0; jj < V.size.y; jj++) {
                if (explored[ii][jj]) {
                  captures.push(
                    new PiPo({ x: ii, y: jj, c: oppCol, p: V.PAWN })
                  );
                }
              }
            }
          }
        }
      }
    }
    V.UndoOnBoard(this.board, move); //remove the stone
    if (!noSuicide && captures.length == 0) return null;
    Array.prototype.push.apply(move.vanish, captures);
    return move;
  }

  getPotentialMovesFrom([x, y]) {
    const move = this.doClick([x, y]);
    return (!move ? [] : [move]);
  }

  getAllPotentialMoves() {
    let moves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j=0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          const mv = this.doClick([i, j]);
          if (!!mv) moves.push(mv);
        }
      }
    }
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  postPlay(move) {
    if (move.vanish.length >= 1) this.capture = true;
  }

  postUndo() {
    this.capture = false;
  }

  getCurrentScore() {
    if (this.capture) return (this.turn == 'w' ? "0-1" : "1-0");
    return "*";
  }

  // Modified version to count liberties + find locations
  countEmptySpaces([x, y], color, explored) {
    if (explored[x][y]) return [];
    explored[x][y] = true;
    let res = [];
    for (let s of V.steps[V.ROOK]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (V.OnBoard(i, j)) {
        if (!explored[i][j] && this.board[i][j] == V.EMPTY) {
          res.push([i, j]);
          explored[i][j] = true; //not counting liberties twice!
        }
        else if (this.getColor(i, j) == color)
          res = res.concat(this.countEmptySpaces([i, j], color, explored));
      }
    }
    return res;
  }

  getComputerMove() {
    const moves = super.getAllValidMoves();
    if (moves.length == 0) return null;
    // Any capture?
    const captures = moves.filter(m => m.vanish.length >= 1);
    if (captures.length > 0) return captures[randInt(captures.length)];
    // Any group in immediate danger?
    const color = this.turn;
    let explored = ArrayFun.init(V.size.x, V.size.y, false);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          !explored[i][j]
        ) {
          // Before this search, reset liberties,
          // because two groups might share them.
          for (let ii = 0; ii < V.size.x; ii++) {
            for (let jj = 0; jj < V.size.y; jj++) {
              if (explored[ii][jj] && this.board[ii][jj] == V.EMPTY)
                explored[ii][jj] = false;
            }
          }
          const liberties = this.countEmptySpaces([i, j], color, explored);
          if (liberties.length == 1) {
            const L = liberties[0];
            const toPlay = moves.find(m => m.end.x == L[0] && m.end.y == L[1]);
            if (!!toPlay) return toPlay;
          }
        }
      }
    }
    // At this point, pick a random move not far from current stones (TODO)
    const candidates = moves.filter(m => {
      const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
      return (
        steps.some(s => {
          const [i, j] = [m.end.x + s[0], m.end.y + s[1]];
          return (
            V.OnBoard(i, j) &&
            this.board[i][j] != V.EMPTY &&
            this.getColor(i, j) == color
          );
        })
      );
    });
    if (candidates.length > 0) return candidates[randInt(candidates.length)];
    return moves[randInt(moves.length)];
  }

  getNotation(move) {
    return V.CoordsToSquare(move.end);
  }

};
