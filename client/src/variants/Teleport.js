import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class TeleportRules extends ChessRules {
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

  canTake([x1, y1], [x2, y2]) {
    return this.subTurn == 1;
  }

  getPPpath(m) {
    if (
      m.vanish.length == 2 &&
      m.appear.length == 1 &&
      m.vanish[0].c == m.vanish[1].c &&
      m.appear[0].p == V.KING
    ) {
      // Rook teleportation with the king
      return this.getPpath(m.vanish[1].c + m.vanish[1].p);
    }
    return this.getPpath(m.appear[0].c + m.appear[0].p);
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
      if (
        m.vanish.length == 1 ||
        m.appear.length == 2 ||
        m.vanish[0].c != m.vanish[1].c
      ) {
        // Standard check:
        res = !this.underCheck(color);
      }
      else {
        // Self-capture: find landing square not resulting in check
        outerLoop: for (let i=0; i<8; i++) {
          for (let j=0; j<8; j++) {
            if (
              this.board[i][j] == V.EMPTY &&
              (
                m.vanish[1].p != V.PAWN ||
                i != (color == 'w' ? 0 : 7)
              )
            ) {
              const tMove = new Move({
                appear: [
                  new PiPo({
                    x: i,
                    y: j,
                    c: color,
                    // The dropped piece nature has no importance:
                    p: V.KNIGHT
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
    // Subturn == 2: only teleportations
    let moves = [];
    const L = this.firstMove.length;
    const color = this.turn;
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] == V.EMPTY &&
          (
            this.firstMove[L-1].vanish[1].p != V.PAWN ||
            i != (color == 'w' ? 0 : 7)
          )
        ) {
          const tMove = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: this.firstMove[L-1].vanish[1].p
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

  underCheck(color) {
    if (this.kingPos[color][0] < 0)
      // King is being moved:
      return false;
    return super.underCheck(color);
  }

  getCurrentScore() {
    if (this.subTurn == 2)
      // Move not over
      return "*";
    return super.getCurrentScore();
  }

  doClick(square) {
    if (isNaN(square[0])) return null;
    // If subTurn == 2 && square is empty && !underCheck, then teleport
    if (this.subTurn == 2 && this.board[square[0]][square[1]] == V.EMPTY) {
      const L = this.firstMove.length;
      const color = this.turn;
      if (
        this.firstMove[L-1].vanish[1].p == V.PAWN &&
        square[0] == (color == 'w' ? 0 : 7)
      ) {
        // Pawns cannot be teleported on last rank
        return null;
      }
      const tMove = new Move({
        appear: [
          new PiPo({
            x: square[0],
            y: square[1],
            c: color,
            p: this.firstMove[L-1].vanish[1].p
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
      move.appear.length == 2 ||
      move.vanish[0].c != move.vanish[1].c
    ) {
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
      this.movesCount++;
    }
    else this.subTurn = 2;
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      // A king is moved: temporarily off board
      this.kingPos[move.vanish[1].c] = [-1, -1];
    else if (move.appear[0].p == V.KING)
      this.kingPos[move.appear[0].c] = [move.appear[0].x, move.appear[0].y];
    this.updateCastleFlags(move);
  }

  // NOTE: no need to update if castleFlags already off
  updateCastleFlags(move) {
    if (move.vanish.length == 0) return;
    const c = move.vanish[0].c;
    if (
      move.vanish.length == 2 &&
      move.appear.length == 1 &&
      move.vanish[0].c == move.vanish[1].c
    ) {
      // Self-capture: of the king or a rook?
      if (move.vanish[1].p == V.KING)
        this.castleFlags[c] = [V.size.y, V.size.y];
      else if (move.vanish[1].p == V.ROOK) {
        const firstRank = (c == "w" ? V.size.x - 1 : 0);
        if (
          move.end.x == firstRank &&
          this.castleFlags[c].includes(move.end.y)
        ) {
          const flagIdx = (move.end.y == this.castleFlags[c][0] ? 0 : 1);
          this.castleFlags[c][flagIdx] = V.size.y;
        }
      }
    }
    else {
      // Normal move
      const firstRank = (c == "w" ? V.size.x - 1 : 0);
      const oppCol = V.GetOppCol(c);
      const oppFirstRank = V.size.x - 1 - firstRank;
      if (move.vanish[0].p == V.KING && move.appear.length > 0)
        this.castleFlags[c] = [V.size.y, V.size.y];
      else if (
        move.start.x == firstRank &&
        this.castleFlags[c].includes(move.start.y)
      ) {
        const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
        this.castleFlags[c][flagIdx] = V.size.y;
      }
      if (
        move.end.x == oppFirstRank &&
        this.castleFlags[oppCol].includes(move.end.y)
      ) {
        const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
        this.castleFlags[oppCol][flagIdx] = V.size.y;
      }
    }
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
    this.postUndo(move);
  }

  postUndo(move) {
    if (move.vanish.length == 0) {
      if (move.appear[0].p == V.KING)
        // A king was teleported
        this.kingPos[move.appear[0].c] = [-1, -1];
    }
    else if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      // A king was (self-)taken
      this.kingPos[move.vanish[1].c] = [move.end.x, move.end.y];
    else super.postUndo(move);
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
      if (
        m.vanish.length == 2 &&
        m.appear.length == 1 &&
        m.vanish[0].c == m.vanish[1].c
      ) {
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
    // Teleportation:
    const piece =
      move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
    return piece + "@" + V.CoordsToSquare(move.end);
  }
};
