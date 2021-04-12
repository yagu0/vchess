import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class KonaneRules extends ChessRules {

  static get Options() {
    return null;
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

  static GenRandInitFen() {
    return (
      "PpPpPpPp/pPpPpPpP/PpPpPpPp/pPpPpPpP/" +
      "PpPpPpPp/pPpPpPpP/PpPpPpPp/pPpPpPpP w 0"
    );
  }

  hoverHighlight([x, y], side) {
    const c = this.turn;
    if (this.movesCount >= 2 || (!!side && side != c)) return false;
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
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let moves = [];
    for (let s of V.steps[V.ROOK]) {
      let curmv = new Move({
        appear: [ new PiPo({ x: -1, y: -1, c: color, p: V.PAWN }) ],
        vanish: [ new PiPo({ x: x, y: y, c: color, p: V.PAWN }) ]
      });
      for (let mult = 2; ; mult += 2) {
        let [i, j] = [x + mult * s[0], y + mult * s[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] == V.EMPTY &&
          this.board[i - s[0]][j - s[1]] != V.EMPTY &&
          this.getColor(i - s[0], j - s[1]) == oppCol
        ) {
          curmv.vanish.push(
            new PiPo({ x: i - s[0], y: j - s[1], c: oppCol, p: V.PAWN }));
          let mv = JSON.parse(JSON.stringify(curmv));
          mv.appear[0].x = i;
          mv.appear[0].y = j;
          mv.end = { x: i, y: j };
          moves.push(mv);
        }
        else break;
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

  static get SEARCH_DEPTH() {
    return 4;
  }

  getNotation(move) {
    if (this.movesCount <= 1) return V.CoordsToSquare(move.start) + "X";
    if (move.vanish.length == 0) return "end";
    return V.CoordsToSquare(move.start) + V.CoordsToSquare(move.end);
  }

};
