import { ChessRules, Move, PiPo } from "@/base_rules";

export class SittuyinRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        twoSquares: false,
        // Promotions are handled differently here
        promotions: [V.QUEEN]
      }
    );
  }

  static GenRandInitFen() {
    return "8/8/4pppp/pppp4/4PPPP/PPPP4/8/8 w 0";
  }

  re_setReserve(subTurn) {
    const mc = this.movesCount;
    const wc = (mc == 0 ? 1 : 0);
    const bc = (mc <= 1 ? 1 : 0);
    this.reserve = {
      w: {
        [V.ROOK]: wc * 2,
        [V.KNIGHT]: wc * 2,
        [V.BISHOP]: wc * 2,
        [V.QUEEN]: wc,
        [V.KING]: wc
      },
      b: {
        [V.ROOK]: bc * 2,
        [V.KNIGHT]: bc * 2,
        [V.BISHOP]: bc * 2,
        [V.QUEEN]: bc,
        [V.KING]: bc
      }
    }
    this.subTurn = subTurn || 1;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    if (this.movesCount <= 1) this.re_setReserve();
  }

  getPpath(b) {
    return "Sittuyin/" + b;
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
    return "Sittuyin/" + color + V.RESERVE_PIECES[index];
  }

  static get RESERVE_PIECES() {
    return [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.KING];
  }

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount <= 1) {
      const color = this.turn;
      const p = V.RESERVE_PIECES[y];
      if (this.reserve[color][p] == 0) return [];
      const iBound =
        p != V.ROOK
          ? (color == 'w' ? [4, 7] : [0, 3])
          : (color == 'w' ? [7, 7] : [0, 0]);
      const jBound = (i) => {
        if (color == 'w' && i == 4) return [4, 7];
        if (color == 'b' && i == 3) return [0, 3];
        return [0, 7];
      };
      let moves = [];
      for (let i = iBound[0]; i <= iBound[1]; i++) {
        const jb = jBound(i);
        for (let j = jb[0]; j <= jb[1]; j++) {
          if (this.board[i][j] == V.EMPTY) {
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
      return moves;
    }
    return super.getPotentialMovesFrom([x, y]);
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = V.PawnSpecs.directions[color];
    let moves = [];
    // NOTE: next condition is generally true (no pawn on last rank)
    if (x + shiftX >= 0 && x + shiftX < sizeX) {
      if (this.board[x + shiftX][y] == V.EMPTY) {
        // One square forward
        moves.push(this.getBasicMove([x, y], [x + shiftX, y]));
      }
      // Captures
      if (V.PawnSpecs.canCapture) {
        for (let shiftY of [-1, 1]) {
          if (
            y + shiftY >= 0 &&
            y + shiftY < sizeY
          ) {
            if (
              this.board[x + shiftX][y + shiftY] != V.EMPTY &&
              this.canTake([x, y], [x + shiftX, y + shiftY])
            ) {
              moves.push(this.getBasicMove([x, y], [x + shiftX, y + shiftY]));
            }
          }
        }
      }
    }
    let queenOnBoard = false;
    let pawnsCount = 0;
    outerLoop: for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          const p = this.getPiece(i, j);
          if (p == V.QUEEN) {
            queenOnBoard = true;
            break outerLoop;
          }
          else if (p == V.PAWN && pawnsCount <= 1) pawnsCount++;
        }
      }
    }
    if (
      !queenOnBoard &&
      (
        pawnsCount == 1 ||
        (color == 'w' && ((y <= 3 && x == y) || (y >= 4 && x == 7 - y))) ||
        (color == 'b' && ((y >= 4 && x == y) || (y <= 3 && x == 7 - y)))
      )
    ) {
      // Add potential promotions
      const addPromotion = ([xx, yy], moveTo) => {
        moves.push(
          new Move({
            appear: [
              new PiPo({
                x: !!moveTo ? xx : x,
                y: yy, //yy == y if !!moveTo
                c: color,
                p: V.QUEEN
              })
            ],
            vanish: [
              new PiPo({
                x: x,
                y: y,
                c: color,
                p: V.PAWN
              })
            ],
            start: { x: x, y: y },
            end: { x: xx, y: yy }
          })
        );
      };
      // In-place promotion always possible:
      addPromotion([x - shiftX, y]);
      for (let step of V.steps[V.BISHOP]) {
        const [i, j] = [x + step[0], y + step[1]];
        if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY)
          addPromotion([i, j], "moveTo");
      }
    }
    return moves;
  }

  getPotentialBishopMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP].concat([ [forward, 0] ]),
      "oneStep"
    );
  }

  getPotentialQueenMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP],
      "oneStep"
    );
  }

  isAttackedByBishop(sq, color) {
    const forward = (this.turn == 'w' ? 1 : -1);
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.BISHOP,
      V.steps[V.BISHOP].concat([ [forward, 0] ]),
      "oneStep"
    );
  }

  isAttackedByQueen(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.QUEEN,
      V.steps[V.BISHOP],
      "oneStep"
    );
  }

  underCheck(color) {
    if (this.movesCount <= 1) return false;
    return super.underCheck(color);
  }

  play(move) {
    const color = move.appear[0].c;
    if (this.movesCount <= 1) {
      V.PlayOnBoard(this.board, move);
      const piece = move.appear[0].p;
      this.reserve[color][piece]--;
      if (piece == V.KING) this.kingPos[color] = [move.end.x, move.end.y];
      if (this.subTurn == 8) {
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
    else super.play(move);
  }

  undo(move) {
    const color = move.appear[0].c;
    if (this.movesCount <= 2) {
      V.UndoOnBoard(this.board, move);
      const piece = move.appear[0].p;
      if (piece == V.KING) this.kingPos[color] = [-1, -1];
      if (!this.subTurn || this.subTurn == 1) {
        // All placement moves are undone (if any)
        if (!this.subTurn) this.re_setReserve(8);
        else this.subTurn = 8;
        this.movesCount--;
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

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 3,
      q: 2,
      k: 1000
    };
  }

  getNotation(move) {
    // Do not note placement moves (complete move would be too long)
    if (move.vanish.length == 0) return "";
    if (move.appear[0].p != move.vanish[0].p) {
      // Pawn promotion: indicate correct final square
      const initSquare =
        V.CoordsToSquare({ x: move.vanish[0].x, y: move.vanish[0].y })
      const destSquare =
        V.CoordsToSquare({ x: move.appear[0].x, y: move.appear[0].y })
      const prefix = (initSquare != destSquare ? initSquare : "");
      return prefix + destSquare + "=Q";
    }
    return super.getNotation(move);
  }
};
