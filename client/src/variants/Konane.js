import { ChessRules, Move, PiPo } from "@/base_rules";

export class KonaneRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get ReverseColors() {
    return true;
  }

  static get PIECES() {
    return V.PAWN;
  }

  getPiece() {
    return V.PAWN;
  }

  getPpath(b) {
    return "Konane/" + b;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
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

  static GenRandInitFen() {
    return (
      "PpPpPpPp/pPpPpPpP/PpPpPpPp/pPpPpPpP/" +
      "PpPpPpPp/pPpPpPpP/PpPpPpPp/pPpPpPpP w 0"
    );
  }

  setOtherVariables(fen) {
    this.captures = []; //reinit for each move
  }

  hoverHighlight(x, y) {
    if (this.movesCount >= 2) return false;
    const c = this.turn;
    if (c == 'w') return (x == y && [0, 3, 4, 7].includes(x));
    // "Black": search for empty square and allow nearby
    for (let i of [0, 3, 4, 7]) {
      if (this.board[i][i] == V.EMPTY)
        return (Math.abs(x - i) + Math.abs(y - i) == 1)
    }
  }

  onlyClick([x, y]) {
    return (
      this.movesCount <= 1 ||
      // TODO: next line theoretically shouldn't be required...
      (this.movesCount == 2 && this.getColor(x, y) != this.turn)
    );
  }

  doClick([x, y]) {
    if (this.movesCount >= 2) return null;
    const color = this.turn;
    if (color == 'w') {
      if (x != y || ![0, 3, 4, 7].includes(x)) return null;
      return new Move({
        appear: [],
        vanish: [ new PiPo({ x: x, y: y, c: color, p: V.PAWN }) ],
        end: { x: x, y: y }
      });
    }
    // "Black": search for empty square and allow nearby
    for (let i of [0, 3, 4, 7]) {
      if (this.board[i][i] == V.EMPTY) {
        if (Math.abs(x - i) + Math.abs(y - i) != 1) return null;
        return new Move({
          appear: [],
          vanish: [ new PiPo({ x: x, y: y, c: color, p: V.PAWN }) ],
          end: { x: x, y: y }
        });
      }
    }
  }

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount <= 1) {
      const mv = this.doClick([x, y]);
      return (!!mv ? [mv] : []);
    }
    const L = this.captures.length;
    const c = (L > 0 ? this.captures[L-1] : null);
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let step = null;
    let moves = [];
    if (!!c) {
      if (x != c.end.x || y != c.end.y) return [];
      step = [(c.end.x - c.start.x) / 2, (c.end.y - c.start.y) / 2];
      // Add move to adjacent empty square to mark "end of capture"
      moves.push(
        new Move({
          appear: [],
          vanish: [],
          start: { x: x, y: y },
          end: { x: x - step[0], y: y - step[1] }
        })
      );
    }
    // Examine captures from here
    for (let s of (!!step ? [step] : V.steps[V.ROOK])) {
      let [i, j] = [x + 2*s[0], y + 2*s[1]];
      if (
        !!c || //avoid redundant checks if continuation
        (
          V.OnBoard(i, j) &&
          this.board[i][j] == V.EMPTY &&
          this.board[i - s[0]][j - s[1]] != V.EMPTY &&
          this.getColor(i - s[0], j - s[1]) == oppCol
        )
      ) {
        let mv = new Move({
          appear: [
            new PiPo({ x: i, y: j, c: color, p: V.PAWN })
          ],
          vanish: [
            new PiPo({ x: x, y: y, c: color, p: V.PAWN }),
            new PiPo({ x: i - s[0], y: j - s[1], c: oppCol, p: V.PAWN })
          ]
        });
        // Is there another capture possible then?
        [i, j] = [i + 2*s[0], j + 2*s[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] == V.EMPTY &&
          this.board[i - s[0]][j - s[1]] != V.EMPTY &&
          this.getColor(i - s[0], j - s[1]) == oppCol
        ) {
          mv.end.moreCapture = true;
        }
        moves.push(mv);
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

  getCurrentScore() {
    if (this.atLeastOneMove()) return "*";
    return (this.turn == "w" ? "0-1" : "1-0");
  }

  play(move) {
    V.PlayOnBoard(this.board, move);
    if (!move.end.moreCapture) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      this.captures = [];
    }
    else {
      this.captures.push(
        {
          start: move.start,
          end: { x: move.end.x, y: move.end.y }
        }
      );
    }
  }

  undo(move) {
    V.UndoOnBoard(this.board, move);
    if (!move.end.moreCapture) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    else this.captures.pop();
  }

  static get SEARCH_DEPTH() {
    return 4;
  }

  getNotation(move) {
    if (this.movesCount <= 1) return V.CoordsToSquare(move.start) + "X";
    if (move.vanish.length == 0) return "end";
    return V.CoordsToSquare(move.start) + "x" + V.CoordsToSquare(move.end);
  }

};
