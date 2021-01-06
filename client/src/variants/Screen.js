import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";
import { ArrayFun } from "@/utils/array";

export class ScreenRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  get showFirstTurn() {
    return true;
  }

  get canAnalyze() {
    return this.movesCount >= 2;
  }

  get someHiddenMoves() {
    return this.movesCount <= 1;
  }

  static GenRandInitFen() {
    // Empty board
    return "8/8/8/8/8/8/8/8 w 0";
  }

  re_setReserve(subTurn) {
    const mc = this.movesCount;
    const wc = (mc == 0 ? 1 : 0);
    const bc = (mc <= 1 ? 1 : 0);
    this.reserve = {
      w: {
        [V.PAWN]: wc * 8,
        [V.ROOK]: wc * 2,
        [V.KNIGHT]: wc * 2,
        [V.BISHOP]: wc * 2,
        [V.QUEEN]: wc,
        [V.KING]: wc
      },
      b: {
        [V.PAWN]: bc * 8,
        [V.ROOK]: bc * 2,
        [V.KNIGHT]: bc * 2,
        [V.BISHOP]: bc * 2,
        [V.QUEEN]: bc,
        [V.KING]: bc
      }
    }
    this.subTurn = subTurn || 1;
  }

  re_setEnlightened(onOff) {
    if (!onOff) delete this["enlightened"];
    else {
      // Turn on:
      this.enlightened = {
        'w': ArrayFun.init(8, 8, false),
        'b': ArrayFun.init(8, 8, false)
      };
      for (let i=0; i<4; i++) {
        for (let j=0; j<8; j++) this.enlightened['b'][i][j] = true;
      }
      for (let i=5; i<8; i++) {
        for (let j=0; j<8; j++) this.enlightened['w'][i][j] = true;
      }
    }
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    if (this.movesCount <= 1) {
      this.re_setReserve();
      this.re_setEnlightened(true);
    }
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  getReservePpath(index, color) {
    return color + V.RESERVE_PIECES[index];
  }

  static get RESERVE_PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.KING];
  }

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount >= 2) return super.getPotentialMovesFrom([x, y]);
    // Only reserve moves are allowed for now:
    if (V.OnBoard(x, y)) return [];
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    const shift = (p == V.PAWN ? 1 : 0);
    let iBound = (color == 'w' ? [4, 7 - shift] : [shift, 3]);
    let moves = [];

    // Pawns cannot stack on files, one bishop per color
    let forbiddenFiles = [];
    if (p == V.PAWN) {
      const colorShift = (color == 'w' ? 4 : 1);
      forbiddenFiles =
        ArrayFun.range(8).filter(jj => {
          return ArrayFun.range(3).some(ii => {
            return (
              this.board[colorShift + ii][jj] != V.EMPTY &&
              this.getPiece(colorShift + ii, jj) == V.PAWN
            );
          })
        });
    }
    let forbiddenColor = -1;
    if (p == V.BISHOP) {
      const colorShift = (color == 'w' ? 4 : 0);
      outerLoop: for (let ii = colorShift; ii < colorShift + 4; ii++) {
        for (let jj = 0; jj < 8; jj++) {
          if (
            this.board[ii][jj] != V.EMPTY &&
            this.getPiece(ii, jj) == V.BISHOP
          ) {
            forbiddenColor = (ii + jj) % 2;
            break outerLoop;
          }
        }
      }
    }

    for (let i = iBound[0]; i <= iBound[1]; i++) {
      for (let j = 0; j < 8; j++) {
        if (
          this.board[i][j] == V.EMPTY &&
          (p != V.PAWN || !forbiddenFiles.includes(j)) &&
          (p != V.BISHOP || (i + j) % 2 != forbiddenColor)
        ) {
          // Ok, move is valid:
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: p
              })
            ],
            vanish: [],
            start: { x: x, y: y },
            end: { x: i, y: j }
          });
          moves.push(mv);
        }
      }
    }
    moves.forEach(m => { m.end.noHighlight = true; });
    return moves;
  }

  underCheck(color) {
    if (this.movesCount <= 1) return false;
    return super.underCheck(color);
  }

  getAllValidMoves() {
    if (this.movesCount >= 2) return super.getAllValidMoves();
    const color = this.turn;
    let moves = [];
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      moves = moves.concat(
        this.getPotentialMovesFrom([V.size.x + (color == "w" ? 0 : 1), i])
      );
    }
    return this.filterValid(moves);
  }

  play(move) {
    const color = move.appear[0].c;
    if (this.movesCount <= 1) {
      V.PlayOnBoard(this.board, move);
      const piece = move.appear[0].p;
      this.reserve[color][piece]--;
      if (piece == V.KING) this.kingPos[color] = [move.end.x, move.end.y];
      if (this.subTurn == 16) {
        // All placement moves are done
        this.movesCount++;
        this.turn = V.GetOppCol(color);
        if (this.movesCount == 1) this.subTurn = 1;
        else {
          // Initial placement is over
          delete this["reserve"];
          delete this["subTurn"];
        }
      }
      else this.subTurn++;
    }
    else {
      if (this.movesCount == 2) this.re_setEnlightened(false);
      super.play(move);
    }
  }

  undo(move) {
    const color = move.appear[0].c;
    if (this.movesCount <= 2) {
      V.UndoOnBoard(this.board, move);
      const piece = move.appear[0].p;
      if (piece == V.KING) this.kingPos[color] = [-1, -1];
      if (!this.subTurn || this.subTurn == 1) {
        // All placement moves are undone (if any)
        if (!this.subTurn) this.re_setReserve(16);
        else this.subTurn = 16;
        this.movesCount--;
        if (this.movesCount == 1) this.re_setEnlightened(true);
        this.turn = color;
      }
      else this.subTurn--;
      this.reserve[color][piece]++;
    }
    else super.undo(move);
  }

  getCheckSquares() {
    if (this.movesCount <= 1) return [];
    return super.getCheckSquares();
  }

  getCurrentScore() {
    if (this.movesCount <= 1) return "*";
    return super.getCurrentScore();
  }

  getComputerMove() {
    if (this.movesCount >= 2) return super.getComputerMove();
    // Play a random "initialization move"
    let res = [];
    for (let i=0; i<16; i++) {
      const moves = this.getAllValidMoves();
      const moveIdx = randInt(moves.length);
      this.play(moves[moveIdx]);
      res.push(moves[moveIdx]);
    }
    for (let i=15; i>=0; i--) this.undo(res[i]);
    return res;
  }

  getNotation(move) {
    // Do not note placement moves (complete move would be too long)
    if (move.vanish.length == 0) return "";
    return super.getNotation(move);
  }

};
