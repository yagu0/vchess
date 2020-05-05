import { ChessRulesi, PiPo } from "@/base_rules";

export class KoopaRules extends ChessRules {
  static get HasEnpassant() {
    return false;
  }

  // Between stun time and stun + 1 move
  static get STUNNED_1() {
    return ['s', 'u', 'o', 'c', 't', 'l'];
  }

  // Between stun + 1 move and stun + 2 moves
  static get STUNNED_2() {
    return ['v', 'x', 'a', 'd', 'w', 'm'];
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.STUNNED_1).concat(V.STUNNED_2);
  }

  getNormalizedStep(step) {
    const [deltaX, deltaY] = [Math.abs(step[0]), Math.abs(step[1])];
    if (deltaX == 0 || deltaY == 0 || deltaX == deltaY)
      return [step[0] / deltaX || 0, step[1] / deltaY || 0];
    // Knight:
    const divisor = Math.min(deltaX, deltaY)
    return [step[0] / divisor, step[1] / divisor];
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    // Complete moves: stuns & kicks
    const stun = V.STUNNED_1.concat(V.STUNNED_2);
    moves.forEach(m => {
      if (m.vanish.length == 2 && m.appear.length == 1) {
        const step =
          this.getNormalizedStep([m.end.x - m.start.x, m.end.y - m.start.y]);
        // "Capture" something: is target stunned?
        if (stun.includes(m.vanish[1].p)) {
          // Kick it: continue movement in the same direction,
          // destroying all on its path.
          let [i, j] = [m.end.x + step[0], m.end.y + step[1]];
          while (V.OnBoard(i, j)) {
            if (this.board[i][j] != V.EMPTY) {
              m.vanish.push(
                new PiPo({
                  x: i,
                  y: j,
                  c: this.getColor(i, j),
                  p: this.getPiece(i, j)
                })
              );
            }
            i += step[0];
            j += step[1];
          }
        }
        else {
          // The piece is now stunned
          m.appear.push(m.vanish.pop());
          const pIdx = ChessRules.PIECES.findIndex(p => p == m.appear[1].p);
          m.appear[1].p = V.STUNNED_1[pIdx];
          // And the capturer continue in the same direction until an empty
          // square or the edge of the board, maybe stunning other pieces.
          let [i, j] = [m.end.x + step[0], m.end.y + step[1]];
          while (V.OnBoard(i, j) && this.board[i][j] != V.EMPTY) {
            const colIJ = this.getColor(i, j);
            const pieceIJ = this.getPiece(i, j);
            m.vanish.push(
              new PiPo({
                x: i,
                y: j,
                c: colIJ,
                p: pieceIJ
              })
            );
            const pIdx = ChessRules.PIECES.findIndex(p => p == pieceIJ);
            m.appear.push(
              new PiPo({
                x: i,
                y: j,
                c: colIJ,
                p: V.STUNNED_1[pIdx]
              })
            );
            i += step[0];
            j += step[1];
          }
          if (V.OnBoard(i, j)) {
            m.appear[0].x = i;
            m.appear[0].y = j;
            // Is it a pawn on last rank?
          }
          else {
            // The piece is out
            m.appear.shift();
          }
        }
      }
    });
    return moves;
  }

  static GenRandInitFen(randomness) {
    // No en-passant:
    return ChessRules.GenRandInitFen(randomness).slice(0, -2);
  }

  filterValid(moves) {
    // Forbid kicking own king out
    const color = this.turn;
    return moves.filter(m => {
      return m.vanish.every(v => v.c != color || !(['l','m'].includes(v.p)));
    });
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    if (this.kingPos['w'][0] < 0) return "0-1";
    if (this.kingPos['b'][0] < 0) return "1-0";
    if (!this.atLeastOneMove()) return "1/2";
    return "*";
  }

  postPlay(move) {
    // TODO: toutes les pièces "stunned" by me (turn) avancent d'un niveau
    // --> alter board
    move.wasStunned = array of stunned stage 2 pieces (just back to normal then)
  }

  postUndo(move) {
    if (wasStunned
      STUNNED_2
  }
};
