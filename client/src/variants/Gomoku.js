import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class GomokuRules extends ChessRules {

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

  static get size() {
    return { x: 19, y: 19 };
  }

  static GenRandInitFen() {
    return [...Array(19)].map(e => "991").join('/') + " w 0";
  }

  setOtherVariables() {}

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

  doClick([x, y]) {
    return (
      new Move({
        appear: [
          new PiPo({ x: x, y: y, c: this.turn, p: V.PAWN })
        ],
        vanish: [],
        start: { x: -1, y: -1 },
      })
    );
  }

  getPotentialMovesFrom([x, y]) {
    return [this.doClick([x, y])];
  }

  getAllPotentialMoves() {
    let moves = [];
    for (let i = 0; i < 19; i++) {
      for (let j=0; j < 19; j++) {
        if (this.board[i][j] == V.EMPTY) moves.push(this.doClick([i, j]));
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

  postPlay() {}
  postUndo() {}

  countAlignedStones([x, y], color) {
    let maxInLine = 0;
    for (let s of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
      // Skip half of steps, since we explore both directions
      if (s[0] == -1 || (s[0] == 0 && s[1] == -1)) continue;
      let countInLine = 1;
      for (let dir of [-1, 1]) {
        let [i, j] = [x + dir * s[0], y + dir * s[1]];
        while (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color
        ) {
          countInLine++;
          i += dir * s[0];
          j += dir * s[1];
        }
      }
      if (countInLine > maxInLine) maxInLine = countInLine;
    }
    return maxInLine;
  }

  getCurrentScore() {
    let fiveAlign = { w: false, b: false, wNextTurn: false };
    for (let i=0; i<19; i++) {
      for (let j=0; j<19; j++) {
        if (this.board[i][j] == V.EMPTY) {
          if (
            !fiveAlign.wNextTurn &&
            this.countAlignedStones([i, j], 'b') >= 5
          ) {
            fiveAlign.wNextTurn = true;
          }
        }
        else {
          const c = this.getColor(i, j);
          if (!fiveAlign[c] && this.countAlignedStones([i, j], c) >= 5)
            fiveAlign[c] = true;
        }
      }
    }
    if (fiveAlign['w']) {
      if (fiveAlign['b']) return "1/2";
      if (this.turn == 'b' && fiveAlign.wNextTurn) return "*";
      return "1-0";
    }
    if (fiveAlign['b']) return "0-1";
    return "*";
  }

  getComputerMove() {
    const color = this.turn;
    let candidates = [];
    let curMax = 0;
    for (let i=0; i<19; i++) {
      for (let j=0; j<19; j++) {
        if (this.board[i][j] == V.EMPTY) {
          const nbAligned = this.countAlignedStones([i, j], color);
          if (nbAligned >= curMax) {
            const move = new Move({
              appear: [
                new PiPo({ x: i, y: j, c: color, p: V.PAWN })
              ],
              vanish: [],
              start: { x: -1, y: -1 }
            });
            if (nbAligned > curMax) {
              curMax = nbAligned;
              candidates = [move];
            }
            else candidates.push(move);
          }
        }
      }
    }
    // Among a priori equivalent moves, select the most central ones.
    // Of course this is not good, but can help this ultra-basic bot.
    let bestCentrality = 0;
    candidates.forEach(c => {
      const deltaX = Math.min(c.end.x, 18 - c.end.x);
      const deltaY = Math.min(c.end.y, 18 - c.end.y);
      c.centrality = deltaX * deltaX + deltaY * deltaY;
      if (c.centrality > bestCentrality) bestCentrality = c.centrality;
    });
    const threshold = Math.min(32, bestCentrality);
    const finalCandidates = candidates.filter(c => c.centrality >= threshold);
    return finalCandidates[randInt(finalCandidates.length)];
  }

  getNotation(move) {
    return V.CoordsToSquare(move.end);
  }

};
