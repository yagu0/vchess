import { ChessRules, PiPo } from "@/base_rules";

export class MagneticRules extends ChessRules {
  static get HasEnpassant() {
    return false;
  }

  getPotentialMovesFrom([x, y]) {
    let standardMoves = super.getPotentialMovesFrom([x, y]);
    let moves = [];
    standardMoves.forEach(m => {
      let newMove_s = this.applyMagneticLaws(m);
      if (newMove_s.length == 1) moves.push(newMove_s[0]);
      //promotion
      else moves = moves.concat(newMove_s);
    });
    return moves;
  }

  // Complete a move with magnetic actions
  // TODO: job is done multiple times for (normal) promotions.
  applyMagneticLaws(move) {
    // Exception: kings are not charged
    if (move.appear[0].p == V.KING && move.appear.length == 1) return [move];
    // If castling, rook is charged:
    const aIdx = move.appear[0].p != V.KING ? 0 : 1;
    const [x, y] = [move.appear[aIdx].x, move.appear[aIdx].y];
    const color = this.turn;
    const lastRank = color == "w" ? 0 : 7;
    const standardMove = JSON.parse(JSON.stringify(move));
    this.play(standardMove);
    for (let step of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j)) {
        if (this.board[i][j] != V.EMPTY) {
          // Found something. Same color or not?
          if (this.getColor(i, j) != color) {
            // Attraction
            if (
              (Math.abs(i - x) >= 2 || Math.abs(j - y) >= 2) &&
              this.getPiece(i, j) != V.KING
            ) {
              move.vanish.push(
                new PiPo({
                  p: this.getPiece(i, j),
                  c: this.getColor(i, j),
                  x: i,
                  y: j
                })
              );
              move.appear.push(
                new PiPo({
                  p: this.getPiece(i, j),
                  c: this.getColor(i, j),
                  x: x + step[0],
                  y: y + step[1]
                })
              );
            }
          } else {
            // Repulsion
            if (this.getPiece(i, j) != V.KING) {
              // Push it until we meet an obstacle or edge of the board
              let [ii, jj] = [i + step[0], j + step[1]];
              while (V.OnBoard(ii, jj)) {
                if (this.board[ii][jj] != V.EMPTY) break;
                ii += step[0];
                jj += step[1];
              }
              ii -= step[0];
              jj -= step[1];
              if (Math.abs(ii - i) >= 1 || Math.abs(jj - j) >= 1) {
                move.vanish.push(
                  new PiPo({
                    p: this.getPiece(i, j),
                    c: this.getColor(i, j),
                    x: i,
                    y: j
                  })
                );
                move.appear.push(
                  new PiPo({
                    p: this.getPiece(i, j),
                    c: this.getColor(i, j),
                    x: ii,
                    y: jj
                  })
                );
              }
            }
          }
          break;
        }
        i += step[0];
        j += step[1];
      }
    }
    this.undo(standardMove);
    let moves = [];
    // Scan move for pawn (max 1) on 8th rank
    for (let i = 1; i < move.appear.length; i++) {
      if (
        move.appear[i].p == V.PAWN &&
        move.appear[i].c == color &&
        move.appear[i].x == lastRank
      ) {
        move.appear[i].p = V.ROOK;
        moves.push(move);
        for (let piece of [V.KNIGHT, V.BISHOP, V.QUEEN]) {
          let cmove = JSON.parse(JSON.stringify(move));
          cmove.appear[i].p = piece;
          moves.push(cmove);
        }
        // Swap appear[i] and appear[0] for moves presentation
        // (TODO: this is awkward)
        moves.forEach(m => {
          let tmp = m.appear[0];
          m.appear[0] = m.appear[i];
          m.appear[i] = tmp;
        });
        break;
      }
    }
    if (moves.length == 0)
      //no pawn on 8th rank
      moves.push(move);
    return moves;
  }

  atLeastOneMove() {
    if (this.kingPos[this.turn][0] < 0) return false;
    return true; //TODO: is it right?
  }

  filterValid(moves) {
    // There are no checks
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  postPlay(move) {
    super.postPlay(move);
    const c = move.vanish[0].c;
    if (move.vanish.length >= 2 && move.vanish[1].p == V.KING) {
      // We took opponent king !
      const oppCol = V.GetOppCol(c);
      this.kingPos[oppCol] = [-1, -1];
      this.castleFlags[oppCol] = [8, 8];
    }
    // Did we magnetically move our (init) rooks or opponents' ones ?
    const firstRank = c == "w" ? 7 : 0;
    const oppFirstRank = 7 - firstRank;
    const oppCol = V.GetOppCol(c);
    move.vanish.forEach(psq => {
      if (
        psq.x == firstRank &&
        this.castleFlags[c].includes(psq.y)
      ) {
        this.castleFlags[c][psq.y == this.castleFlags[c][0] ? 0 : 1] = 8;
      }
      else if (
        psq.x == oppFirstRank &&
        this.castleFlags[oppCol].includes(psq.y)
      ) {
        const flagIdx = (psq.y == this.castleFlags[oppCol][0] ? 0 : 1);
        this.castleFlags[oppCol][flagIdx] = 8;
      }
    });
  }

  postUndo(move) {
    super.postUndo(move);
    const c = move.vanish[0].c;
    const oppCol = V.GetOppCol(c);
    if (this.kingPos[oppCol][0] < 0) {
      // Last move took opponent's king
      for (let psq of move.vanish) {
        if (psq.p == "k") {
          this.kingPos[oppCol] = [psq.x, psq.y];
          break;
        }
      }
    }
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (kp[0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    if (this.atLeastOneMove())
      // Game not over
      return "*";
    return "1/2"; //no moves but kings still there
  }

  static get THRESHOLD_MATE() {
    return 500; //checkmates evals may be slightly below 1000
  }

  static get SEARCH_DEPTH() {
    return 2;
  }
};
