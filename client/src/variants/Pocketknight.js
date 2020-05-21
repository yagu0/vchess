import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class PocketknightRules extends ChessRules {
  hoverHighlight(x, y) {
    // Testing move validity results in an infinite update loop.
    // TODO: find a way to test validity anyway.
    return (this.subTurn == 2 && this.board[x][y] == V.EMPTY);
  }

  static IsGoodFlags(flags) {
    // 4 for castle + 2 for knights
    return !!flags.match(/^[a-z]{4,4}[01]{2,2}$/);
  }

  setFlags(fenflags) {
    super.setFlags(fenflags); //castleFlags
    this.knightFlags = fenflags.substr(4).split("").map(e => e == "1");
  }

  aggregateFlags() {
    return [this.castleFlags, this.knightFlags];
  }

  disaggregateFlags(flags) {
    this.castleFlags = flags[0];
    this.knightFlags = flags[1];
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
  }

  static GenRandInitFen(randomness) {
    // Add 2 knight flags
    return ChessRules.GenRandInitFen(randomness)
      .slice(0, -2) + "11 -";
  }

  getFlagsFen() {
    return (
      super.getFlagsFen() + this.knightFlags.map(e => e ? "1" : "0").join("")
    );
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 1) {
      let moves = super.getPotentialMovesFrom([x, y]);
      // If flag allow it, add "king capture"
      if (
        this.knightFlags[this.turn == 'w' ? 0 : 1] &&
        this.getPiece(x, y) == V.KING
      ) {
        const kp = this.kingPos[V.GetOppCol(this.turn)];
        moves.push(
          new Move({
            appear: [],
            vanish: [],
            start: { x: x, y: y },
            end: { x: kp[0], y: kp[1] }
          })
        );
      }
      return moves;
    }
    // subTurn == 2: a move is a click, not handled here
    return [];
  }

  filterValid(moves) {
    if (this.subTurn == 2) return super.filterValid(moves);
    const color = this.turn;
    return moves.filter(m => {
      this.play(m);
      let res = false;
      if (m.appear.length > 0)
        // Standard check:
        res = !this.underCheck(color);
      else {
        // "Capture king": find landing square not resulting in check
        outerLoop: for (let i=0; i<8; i++) {
          for (let j=0; j<8; j++) {
            if (this.board[i][j] == V.EMPTY) {
              const tMove = new Move({
                appear: [
                  new PiPo({
                    x: i,
                    y: j,
                    c: color,
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
    // Subturn == 2: only knight landings
    let moves = [];
    const color = this.turn;
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] == V.EMPTY) {
          const tMove = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: V.KNIGHT
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
    // If subTurn == 2 && square is empty && !underCheck, then drop
    if (this.subTurn == 2 && this.board[square[0]][square[1]] == V.EMPTY) {
      const color = this.turn;
      const tMove = new Move({
        appear: [
          new PiPo({
            x: square[0],
            y: square[1],
            c: color,
            p: V.KNIGHT
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
    if (move.appear.length > 0) {
      // Usual case or knight landing
      if (move.vanish.length > 0) this.epSquares.push(this.getEpSquare(move));
      else this.subTurn = 1;
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      V.PlayOnBoard(this.board, move);
      if (move.vanish.length > 0) this.postPlay(move);
    }
    else {
      // "king capture"
      this.subTurn = 2;
      this.knightFlags[this.turn == 'w' ? 0 : 1] = false;
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    if (move.appear.length > 0) {
      if (move.vanish.length > 0) this.epSquares.pop();
      else this.subTurn = 2;
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
      V.UndoOnBoard(this.board, move);
      if (move.vanish.length > 0) this.postUndo(move);
    }
    else this.subTurn = 1;
  }

  getComputerMove() {
    let moves = this.getAllValidMoves();
    if (moves.length == 0) return null;
    const maxeval = V.INFINITY;
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const getOppEval = () => {
      let evalOpp = this.evalPosition();
      this.getAllValidMoves().forEach(m => {
        // Do not consider knight landings here
        if (m.appear.length > 0) {
          this.play(m);
          const score = this.getCurrentScore();
          let mvEval = 0;
          if (["1-0", "0-1"].includes(score))
            mvEval = (score == "1-0" ? 1 : -1) * maxeval;
          else if (score == "*") mvEval = this.evalPosition();
          if (
            (oppCol == 'w' && mvEval > evalOpp) ||
            (oppCol == 'b' && mvEval < evalOpp)
          ) {
            evalOpp = mvEval;
          }
          this.undo(m);
        }
      });
      return evalOpp;
    };
    // Custom "search" at depth 2
    moves.forEach(m => {
      this.play(m);
      m.eval = (color == "w" ? -1 : 1) * maxeval;
      if (m.appear.length == 0) {
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
            // first available square.
            mvEval = getOppEval() + 0.05 - Math.random() / 10;
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
          else m.eval = getOppEval();
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
    if (move.vanish.length > 0)
      return super.getNotation(move);
    if (move.appear.length == 0)
      // "king capture"
      return "-";
    // Knight landing:
    return "N@" + V.CoordsToSquare(move.end);
  }
};
