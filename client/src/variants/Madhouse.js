import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class MadhouseRules extends ChessRules {
  hoverHighlight(x, y) {
    // Testing move validity results in an infinite update loop.
    // TODO: find a way to test validity anyway.
    return (this.subTurn == 2 && this.board[x][y] == V.EMPTY);
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
    this.firstMove = [];
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 1) return super.getPotentialMovesFrom([x, y]);
    // subTurn == 2: a move is a click, not handled here
    return [];
  }

  filterValid(moves) {
    if (this.subTurn == 2) return super.filterValid(moves);
    const color = this.turn;
    return moves.filter(m => {
      this.play(m);
      let res = false;
      if (m.vanish.length == 1 || m.appear.length == 2)
        // Standard check:
        res = !this.underCheck(color);
      else {
        // Capture: find landing square not resulting in check
        const boundary = (m.vanish[1].p != V.PAWN ? [0, 7] : [1, 6]);
        const sqColor =
          m.vanish[1].p == V.BISHOP
            ? (m.vanish[1].x + m.vanish[1].y) % 2
            : null;
        outerLoop: for (let i = boundary[0]; i <= boundary[1]; i++) {
          for (let j=0; j<8; j++) {
            if (
              this.board[i][j] == V.EMPTY &&
              (!sqColor || (i + j) % 2 == sqColor)
            ) {
              const tMove = new Move({
                appear: [
                  new PiPo({
                    x: i,
                    y: j,
                    c: m.vanish[1].c,
                    p: m.vanish[1].p
                  })
                ],
                vanish: [],
                start: { x: -1, y: -1 }
              });
              this.play(tMove);
              const moveOk = !this.underCheck(color);
              this.undo(tMove);
              if (moveOk) {
                res = true;
                break outerLoop;
              }
            }
          }
        }
      }
      this.undo(m);
      return res;
    });
  }

  getAllValidMoves() {
    if (this.subTurn == 1) return super.getAllValidMoves();
    // Subturn == 2: only replacements
    let moves = [];
    const L = this.firstMove.length;
    const fm = this.firstMove[L - 1];
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const boundary = (fm.vanish[1].p != V.PAWN ? [0, 7] : [1, 6]);
    const sqColor =
      fm.vanish[1].p == V.BISHOP
        ? (fm.vanish[1].x + fm.vanish[1].y) % 2
        : null;
    for (let i = boundary[0]; i < boundary[1]; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] == V.EMPTY &&
          (!sqColor || (i + j) % 2 == sqColor)
        ) {
          const tMove = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: oppCol,
                p: fm.vanish[1].p
              })
            ],
            vanish: [],
            start: { x: -1, y: -1 }
          });
          this.play(tMove);
          const moveOk = !this.underCheck(color);
          this.undo(tMove);
          if (moveOk) moves.push(tMove);
        }
      }
    }
    return moves;
  }

  doClick(square) {
    if (isNaN(square[0])) return null;
    // If subTurn == 2 && square is empty && !underCheck, then replacement
    if (this.subTurn == 2 && this.board[square[0]][square[1]] == V.EMPTY) {
      const L = this.firstMove.length;
      const fm = this.firstMove[L - 1];
      const color = this.turn;
      const oppCol = V.GetOppCol(color);
      if (
        (fm.vanish[1].p == V.PAWN && [0, 7].includes(square[0])) ||
        (
          fm.vanish[1].p == V.BISHOP &&
          (square[0] + square[1] + fm.vanish[1].x + fm.vanish[1].y) % 2 != 0
        )
      ) {
        // Pawns cannot be replaced on first or last rank,
        // bishops must be replaced on same square color.
        return null;
      }
      const tMove = new Move({
        appear: [
          new PiPo({
            x: square[0],
            y: square[1],
            c: oppCol,
            p: fm.vanish[1].p
          })
        ],
        vanish: [],
        start: { x: -1, y: -1 }
      });
      this.play(tMove);
      const moveOk = !this.underCheck(color);
      this.undo(tMove);
      if (moveOk) return tMove;
    }
    return null;
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    if (move.vanish.length > 0) {
      this.epSquares.push(this.getEpSquare(move));
      this.firstMove.push(move);
    }
    V.PlayOnBoard(this.board, move);
    if (
      this.subTurn == 2 ||
      move.vanish.length == 1 ||
      move.appear.length == 2
    ) {
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
      this.movesCount++;
    }
    else this.subTurn = 2;
    if (move.vanish.length > 0) this.postPlay(move);
  }

  postPlay(move) {
    if (move.appear[0].p == V.KING)
      this.kingPos[move.appear[0].c] = [move.appear[0].x, move.appear[0].y];
    this.updateCastleFlags(move, move.appear[0].p, move.appear[0].c);
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    if (move.vanish.length > 0) {
      this.epSquares.pop();
      this.firstMove.pop();
    }
    V.UndoOnBoard(this.board, move);
    if (this.subTurn == 2) this.subTurn = 1;
    else {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
      this.subTurn = (move.vanish.length > 0 ? 1 : 2);
    }
    if (move.vanish.length > 0) super.postUndo(move);
  }

  getComputerMove() {
    let moves = this.getAllValidMoves();
    if (moves.length == 0) return null;
    // Custom "search" at depth 1 (for now. TODO?)
    const maxeval = V.INFINITY;
    const color = this.turn;
    const initEval = this.evalPosition();
    moves.forEach(m => {
      this.play(m);
      m.eval = (color == "w" ? -1 : 1) * maxeval;
      if (m.vanish.length == 2 && m.appear.length == 1) {
        const moves2 = this.getAllValidMoves();
        m.next = moves2[0];
        moves2.forEach(m2 => {
          this.play(m2);
          const score = this.getCurrentScore();
          let mvEval = 0;
          if (["1-0", "0-1"].includes(score))
            mvEval = (score == "1-0" ? 1 : -1) * maxeval;
          else if (score == "*")
            // Add small fluctuations to avoid dropping pieces always on the
            // first square available.
            mvEval = initEval + 0.05 - Math.random() / 10;
          if (
            (color == 'w' && mvEval > m.eval) ||
            (color == 'b' && mvEval < m.eval)
          ) {
            m.eval = mvEval;
            m.next = m2;
          }
          this.undo(m2);
        });
      }
      else {
        const score = this.getCurrentScore();
        if (score != "1/2") {
          if (score != "*") m.eval = (score == "1-0" ? 1 : -1) * maxeval;
          else m.eval = this.evalPosition();
        }
      }
      this.undo(m);
    });
    moves.sort((a, b) => {
      return (color == "w" ? 1 : -1) * (b.eval - a.eval);
    });
    let candidates = [0];
    for (let i = 1; i < moves.length && moves[i].eval == moves[0].eval; i++)
      candidates.push(i);
    const mIdx = candidates[randInt(candidates.length)];
    if (!moves[mIdx].next) return moves[mIdx];
    const move2 = moves[mIdx].next;
    delete moves[mIdx]["next"];
    return [moves[mIdx], move2];
  }

  getNotation(move) {
    if (move.vanish.length > 0) return super.getNotation(move);
    // Replacement:
    const piece =
      move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
    return piece + "@" + V.CoordsToSquare(move.end);
  }
};
