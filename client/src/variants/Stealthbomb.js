import { ChessRules, Move, PiPo } from "@/base_rules";

export class StealthbombRules extends ChessRules {

  static get CanAnalyze() {
    return false;
  }

  static get SomeHiddenMoves() {
    return true;
  }

  static get BOMB_DECODE() {
    return {
      s: "p",
      t: "q",
      u: "r",
      c: "b",
      o: "n",
      l: "k"
    };
  }
  static get BOMB_CODE() {
    return {
      p: "s",
      q: "t",
      r: "u",
      b: "c",
      n: "o",
      k: "l"
    };
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(Object.keys(V.BOMB_DECODE));
  }

  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    if (
      ChessRules.PIECES.includes(piece) ||
      // 'side' is used to determine what I see: normal or "loaded" piece?
      this.getColor(i, j) == this.side
    ) {
      return piece;
    }
    // Loaded piece, but no right to view it
    return V.BOMB_DECODE[piece];
  }

  getPpath(b, color, score) {
    if (Object.keys(V.BOMB_DECODE).includes(b[1])) {
      // Supposed to be hidden.
      if (score == "*" && (!color || color != b[0]))
        return b[0] + V.BOMB_DECODE[b[1]];
      return "Stealthbomb/" + b;
    }
    return b;
  }

  hoverHighlight([x, y]) {
    const c = this.turn;
    return (
      this.movesCount <= 1 &&
      (
        (c == 'w' && x >= 6) ||
        (c == 'b' && x <= 1)
      )
    );
  }

  onlyClick([x, y]) {
    return (
      this.movesCount <= 1 ||
      // TODO: next line theoretically shouldn't be required...
      (this.movesCount == 2 && this.getColor(x, y) != this.turn)
    );
  }

  // Initiate the game by choosing a square for the bomb:
  doClick(square) {
    const c = this.turn;
    if (
      this.movesCount >= 2 ||
      (
        (c == 'w' && square[0] < 6) ||
        (c == 'b' && square[0] > 2)
      )
    ) {
      return null;
    }
    const [x, y] = square;
    const piece = super.getPiece(x, y);
    return new Move({
      appear: [ new PiPo({ x: x, y: y, c: c, p: V.BOMB_CODE[piece] }) ],
      vanish: [ new PiPo({ x: x, y: y, c: c, p: piece }) ],
      start: { x: -1, y: -1 }
    });
  }

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount <= 1) {
      const setup = this.doClick([x, y]);
      return (!setup ? [] : [setup]);
    }
    let moves = super.getPotentialMovesFrom([x, y]);
    const c = this.turn;
    // Add bomb explosion
    if (Object.keys(V.BOMB_DECODE).includes(this.board[x][y][1])) {
      let mv = new Move({
        appear: [ ],
        vanish: [ new PiPo({ x: x, y: y, c: c, p: this.board[x][y][1] }) ],
        end: { x: this.kingPos[c][0], y: this.kingPos[c][1] }
      });
      for (let s of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
        let [i, j] = [x + s[0], y + s[1]];
        if (V.OnBoard(i, j) && this.board[i][j] != V.EMPTY) {
          mv.vanish.push(
            new PiPo({
              x: i,
              y: j,
              c: this.getColor(i, j),
              p: this.board[i][j][1]
            })
          );
        }
      }
      moves.push(mv);
    }
    return moves;
  }

  // NOTE: a lot of copy-paste from Atomic from here.
  postPlay(move) {
    if (this.movesCount >= 3) {
      super.postPlay(move);
      if (move.appear.length == 0) {
        // Explosion
        const firstRank = { w: 7, b: 0 };
        for (let c of ["w", "b"]) {
          // Did we explode king of color c ?
          if (
            Math.abs(this.kingPos[c][0] - move.start.x) <= 1 &&
            Math.abs(this.kingPos[c][1] - move.start.y) <= 1
          ) {
            this.kingPos[c] = [-1, -1];
            this.castleFlags[c] = [8, 8];
          }
          else {
            // Now check if init rook(s) exploded
            if (Math.abs(move.start.x - firstRank[c]) <= 1) {
              if (Math.abs(move.start.y - this.castleFlags[c][0]) <= 1)
                this.castleFlags[c][0] = 8;
              if (Math.abs(move.start.y - this.castleFlags[c][1]) <= 1)
                this.castleFlags[c][1] = 8;
            }
          }
        }
      }
    }
  }

  postUndo(move) {
    if (this.movesCount >= 2) {
      super.postUndo(move);
      const c = this.turn;
      const oppCol = V.GetOppCol(c);
      if ([this.kingPos[c][0], this.kingPos[oppCol][0]].some(e => e < 0)) {
        // Last move exploded some king..
        for (let psq of move.vanish) {
          if (psq.p == "k")
            this.kingPos[psq.c == c ? c : oppCol] = [psq.x, psq.y];
        }
      }
    }
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    let res = undefined;
    // If our king disappeared, move is not valid
    if (this.kingPos[color][0] < 0) res = true;
    // If opponent king disappeared, move is valid
    else if (this.kingPos[oppCol][0] < 0) res = false;
    // Otherwise, if we remain under check, move is not valid
    else res = this.isAttacked(this.kingPos[color], oppCol);
    return res;
  }

  getCheckSquares() {
    const color = this.turn;
    let res = [];
    if (
      this.kingPos[color][0] >= 0 && //king might have exploded
      this.isAttacked(this.kingPos[color], V.GetOppCol(color))
    ) {
      res = [JSON.parse(JSON.stringify(this.kingPos[color]))];
    }
    return res;
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (kp[0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    if (this.atLeastOneMove()) return "*";
    if (!this.isAttacked(kp, V.GetOppCol(color))) return "1/2";
    return color == "w" ? "0-1" : "1-0"; //checkmate
  }

  getNotation(move) {
    if (this.movesCount <= 1) return "Bomb?";
    const c = this.turn;
    if (move.end.x == this.kingPos[c][0] && move.end.y == this.kingPos[c][1])
      return V.CoordsToSquare(move.start) + "~X";
    if (Object.keys(V.BOMB_DECODE).includes(move.vanish[0].p)) {
      let cpMove = JSON.parse(JSON.stringify(move));
      cpMove.vanish[0].p = V.BOMB_DECODE[move.vanish[0].p];
      if (Object.keys(V.BOMB_DECODE).includes(move.appear[0].p))
        cpMove.appear[0].p = V.BOMB_DECODE[move.appear[0].p];
      return super.getNotation(cpMove);
    }
    return super.getNotation(move);
  }

};
