import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class AmbiguousRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    if (this.movesCount == 0) this.subTurn = 2;
    else this.subTurn = 1;
  }

  // Subturn 1: play a move for the opponent on the designated square.
  // Subturn 2: play a move for me (which just indicate a square).
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    if (this.subTurn == 2) {
      // Just play a normal move (which in fact only indicate a square)
      let movesHash = {};
      return (
        super.getPotentialMovesFrom([x, y])
        .filter(m => {
          // Filter promotions: keep only one, since no choice now.
          if (m.appear[0].p != m.vanish[0].p) {
            const hash = V.CoordsToSquare(m.start) + V.CoordsToSquare(m.end);
            if (!movesHash[hash]) {
              movesHash[hash] = true;
              return true;
            }
            return false;
          }
          return true;
        })
        .map(m => {
          if (m.vanish.length == 1) m.appear[0].p = V.GOAL;
          else m.appear[0].p = V.TARGET_CODE[m.vanish[1].p];
          m.appear[0].c = oppCol;
          m.vanish.shift();
          return m;
        })
      );
    }
    // At subTurn == 1, play a targeted move for opponent
    // Search for target (we could also have it in a stack...)
    let target = { x: -1, y: -1 };
    outerLoop: for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const piece = this.board[i][j][1];
          if (
            piece == V.GOAL ||
            Object.keys(V.TARGET_DECODE).includes(piece)
          ) {
            target = { x: i, y: j};
            break outerLoop;
          }
        }
      }
    }
    // TODO: could be more efficient than generating all moves.
    this.turn = oppCol;
    const emptyTarget = (this.board[target.x][target.y][1] == V.GOAL);
    if (emptyTarget) this.board[target.x][target.y] = V.EMPTY;
    let moves = super.getPotentialMovesFrom([x, y]);
    if (emptyTarget) {
      this.board[target.x][target.y] = color + V.GOAL;
      moves.forEach(m => {
        m.vanish.push({
          x: target.x,
          y: target.y,
          c: color,
          p: V.GOAL
        });
      });
    }
    this.turn = color;
    return moves.filter(m => m.end.x == target.x && m.end.y == target.y);
  }

  canIplay(side, [x, y]) {
    const color = this.getColor(x, y);
    return (
      (this.subTurn == 1 && color != side) ||
      (this.subTurn == 2 && color == side)
    );
  }

  getPpath(b) {
    if (b[1] == V.GOAL || Object.keys(V.TARGET_DECODE).includes(b[1]))
      return "Ambiguous/" + b;
    return b;
  }

  // Code for empty square target
  static get GOAL() {
    return 'g';
  }

  static get TARGET_DECODE() {
    return {
      's': 'p',
      't': 'q',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      'l': 'k'
    };
  }

  static get TARGET_CODE() {
    return {
      'p': 's',
      'q': 't',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'k': 'l'
    };
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat(Object.keys(V.TARGET_DECODE)).concat([V.GOAL])
    );
  }

  getAllPotentialMoves() {
    const color = this.turn;
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        const colIJ = this.getColor(i, j);
        if (
          this.board[i][j] != V.EMPTY &&
          (
            (this.subTurn == 2 && colIJ == color) ||
            (
              this.subTurn == 1 && colIJ != color &&
              this.board[i][j][1] != V.GOAL &&
              !(Object.keys(V.TARGET_DECODE).includes(this.board[i][j][1]))
            )
          )
        ) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    return potentialMoves;
  }

  atLeastOneMove() {
    // Since there are no checks this seems true (same as for Magnetic...)
    return true;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // This function is only called at subTurn 1
    const color = V.GetOppCol(this.turn);
    if (this.kingPos[color][0] < 0) return (color == 'w' ? "0-1" : "1-0");
    return "*";
  }

  prePlay(move) {
    const c = V.GetOppCol(this.turn);
    const piece = move.vanish[0].p;
    if (piece == V.KING) {
      // (Opp) king moves:
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
    }
    if (move.vanish.length == 2 && [V.KING, 'l'].includes(move.vanish[1].p))
      // (My) king is captured:
      this.kingPos[this.turn] = [-1, -1];
  }

  play(move) {
    let kingCaptured = false;
    if (this.subTurn == 1) {
      this.prePlay(move);
      this.epSquares.push(this.getEpSquare(move));
      kingCaptured = this.kingPos[this.turn][0] < 0;
    }
    if (kingCaptured) move.kingCaptured = true;
    V.PlayOnBoard(this.board, move);
    if (this.subTurn == 2 || kingCaptured) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
    }
    if (!kingCaptured) this.subTurn = 3 - this.subTurn;
  }

  undo(move) {
    if (!move.kingCaptured) this.subTurn = 3 - this.subTurn;
    if (this.subTurn == 2 || !!move.kingCaptured) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    V.UndoOnBoard(this.board, move);
    if (this.subTurn == 1) {
      this.epSquares.pop();
      this.postUndo(move);
    }
  }

  postUndo(move) {
    // (Potentially) Reset king(s) position
    const c = V.GetOppCol(this.turn);
    const piece = move.vanish[0].p;
    if (piece == V.KING) {
      // (Opp) king moved:
      this.kingPos[c][0] = move.vanish[0].x;
      this.kingPos[c][1] = move.vanish[0].y;
    }
    if (move.vanish.length == 2 && [V.KING, 'l'].includes(move.vanish[1].p))
      // (My) king was captured:
      this.kingPos[this.turn] = [move.vanish[1].x, move.vanish[1].y];
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 -";

    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Get random squares for every piece, totally freely
      let positions = shuffle(ArrayFun.range(8));
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
      const rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix bishops (on different colors)
        for (let i=2; i<8; i++) {
          if (positions[i] % 2 != rem2)
            [positions[1], positions[i]] = [positions[i], positions[1]];
        }
      }
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      // En-passant allowed, but no flags
      " w 0 -"
    );
  }

  getComputerMove() {
    let moves = this.getAllValidMoves();
    if (moves.length == 0) return null;
    // Random mover for now
    const color = this.turn;
    const m1 = moves[randInt(moves.length)];
    this.play(m1);
    let m = undefined;
    if (this.turn != color) m = m1;
    else {
      const moves2 = this.getAllValidMoves();
      m = [m1, moves2[randInt(moves2.length)]];
    }
    this.undo(m1);
    return m;
  }

  getNotation(move) {
    if (this.subTurn == 2) return "T:" + V.CoordsToSquare(move.end);
    // Remove and re-add target to get a good notation:
    const withTarget = move.vanish[1];
    if (move.vanish[1].p == V.GOAL) move.vanish.pop();
    else move.vanish[1].p = V.TARGET_DECODE[move.vanish[1].p];
    const notation = super.getNotation(move);
    if (move.vanish.length == 1) move.vanish.push(withTarget);
    else move.vanish[1].p = V.TARGET_CODE[move.vanish[1].p];
    return notation;
  }
};
