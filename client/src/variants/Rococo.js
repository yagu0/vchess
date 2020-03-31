import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class RococoRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.IMMOBILIZER]);
  }

  getPpath(b) {
    if (b[1] == "m")
      //'m' for Immobilizer (I is too similar to 1)
      return "Rococo/" + b;
    return b; //usual piece
  }

  getPPpath(m) {
    // The only "choice" case is between a swap and a mutual destruction:
    // show empty square in case of mutual destruction.
    if (m.appear.length == 0) return "Rococo/empty";
    return m.appear[0].c + m.appear[0].p;
  }

  setOtherVariables(fen) {
    // No castling, but checks, so keep track of kings
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenParts = fen.split(" ");
    const position = fenParts[0].split("/");
    for (let i = 0; i < position.length; i++) {
      let k = 0;
      for (let j = 0; j < position[i].length; j++) {
        switch (position[i].charAt(j)) {
          case "k":
            this.kingPos["b"] = [i, k];
            break;
          case "K":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(position[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
    // Local stack of swaps:
    this.smoves = [];
    const smove = V.ParseFen(fen).smove;
    if (smove == "-") this.smoves.push(null);
    else {
      this.smoves.push({
        start: ChessRules.SquareToCoords(smove.substr(0, 2)),
        end: ChessRules.SquareToCoords(smove.substr(2))
      });
    }
  }

  static ParseFen(fen) {
    return Object.assign(
      ChessRules.ParseFen(fen),
      { smove: fen.split(" ")[3] }
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 4) return false;
    if (fenParts[3] != "-" && !fenParts[3].match(/^([a-h][1-8]){2}$/))
      return false;
    return true;
  }

  getSmove(move) {
    if (move.appear.length == 2)
      return { start: move.start, end: move.end };
    return null;
  }

  static get size() {
    // Add the "capturing edge"
    return { x: 10, y: 10 };
  }

  static get IMMOBILIZER() {
    return "m";
  }
  // Although other pieces keep their names here for coding simplicity,
  // keep in mind that:
  //  - a "rook" is a swapper, exchanging positions and "capturing" by
  //             mutual destruction only.
  //  - a "knight" is a long-leaper, capturing as in draughts
  //  - a "bishop" is a chameleon, capturing as its prey
  //  - a "queen" is a withdrawer+advancer, capturing by moving away from
  //              pieces or advancing in front of them.

  // Is piece on square (x,y) immobilized?
  isImmobilized([x, y]) {
    const piece = this.getPiece(x, y);
    const oppCol = V.GetOppCol(this.getColor(x, y));
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        const oppPiece = this.getPiece(i, j);
        if (oppPiece == V.IMMOBILIZER) return [i, j];
        // Only immobilizers are immobilized by chameleons:
        if (oppPiece == V.BISHOP && piece == V.IMMOBILIZER) return [i, j];
      }
    }
    return null;
  }

  static OnEdge(x, y) {
    return x == 0 || y == 0 || x == V.size.x - 1 || y == V.size.y - 1;
  }

  getPotentialMovesFrom([x, y]) {
    // Pre-check: is thing on this square immobilized?
    const imSq = this.isImmobilized([x, y]);
    const piece = this.getPiece(x, y);
    if (!!imSq && piece != V.KING) {
      // Only option is suicide, if I'm not a king:
      return [
        new Move({
          start: { x: x, y: y },
          end: { x: imSq[0], y: imSq[1] },
          appear: [],
          vanish: [
            new PiPo({
              x: x,
              y: y,
              c: this.getColor(x, y),
              p: this.getPiece(x, y)
            })
          ]
        })
      ];
    }
    let moves = [];
    switch (piece) {
      case V.IMMOBILIZER:
        moves = this.getPotentialImmobilizerMoves([x, y]);
        break;
      default:
        moves = super.getPotentialMovesFrom([x, y]);
    }
    // Post-processing: prune redundant non-minimal capturing moves,
    // and non-capturing moves ending on the edge:
    moves.forEach(m => {
      // Useful precomputation
      m.dist = Math.abs(m.end.x - m.start.x) + Math.abs(m.end.y - m.start.y);
    });
    return moves.filter(m => {
      if (!V.OnEdge(m.end.x, m.end.y)) return true;
      // End on the edge:
      if (m.vanish.length == 1) return false;
      // Capture or swap: only captures get filtered
      if (m.appear.length == 2) return true;
      // Can we find other moves with a shorter path to achieve the same
      // capture? Apply to queens and knights.
      if (
        moves.some(mv => {
          return (
            mv.dist < m.dist &&
            mv.vanish.length == m.vanish.length &&
            mv.vanish.every(v => {
              return m.vanish.some(vv => {
                return (
                  vv.x == v.x && vv.y == v.y && vv.c == v.c && vv.p == v.p
                );
              });
            })
          );
        })
      ) {
        return false;
      }
      return true;
    });
    // NOTE: not removing "dist" field; shouldn't matter much...
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    const piece = this.getPiece(x, y);
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep !== undefined) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      // Only king can take on occupied square:
      if (piece == V.KING && V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  // "Cannon/grasshopper pawn"
  getPotentialPawnMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    adjacentSteps.forEach(step => {
      const [i, j] = [x + step[0], y + step[1]];
      if (V.OnBoard(i, j)) {
        if (this.board[i][j] == V.EMPTY)
          moves.push(this.getBasicMove([x, y], [i, j]));
        else {
          // Try to leap over:
          const [ii, jj] = [i + step[0], j + step[1]];
          if (V.OnBoard(ii, jj) && this.getColor(ii, jj) == oppCol)
            moves.push(this.getBasicMove([x, y], [ii, jj]));
        }
      }
    });
    return moves;
  }

  // NOTE: not really captures, but let's keep the name
  getRookCaptures([x, y], byChameleon) {
    let moves = [];
    const oppCol = V.GetOppCol(this.turn);
    // Simple: if something is visible, we can swap
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(step => {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.getColor(i, j) == oppCol) {
        const oppPiece = this.getPiece(i, j);
        if (!byChameleon || oppPiece == V.ROOK) {
          let m = this.getBasicMove([x, y], [i, j]);
          m.appear.push(
            new PiPo({
              x: x,
              y: y,
              c: oppCol,
              p: this.getPiece(i, j)
            })
          );
          moves.push(m);
          if (i == x + step[0] && j == y + step[1]) {
            // Add mutual destruction option:
            m = new Move({
              start: { x: x, y: y},
              end: { x: i, y: j },
              appear: [],
              // TODO: is copying necessary here?
              vanish: JSON.parse(JSON.stringify(m.vanish))
            });
            moves.push(m);
          }
        }
      }
    });
    return moves;
  }

  // Swapper
  getPotentialRookMoves(sq) {
    return super.getPotentialQueenMoves(sq).concat(this.getRookCaptures(sq));
  }

  getKnightCaptures(startSquare, byChameleon) {
    // Look in every direction for captures
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let moves = [];
    const [x, y] = [startSquare[0], startSquare[1]];
    const piece = this.getPiece(x, y); //might be a chameleon!
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (
        !V.OnBoard(i, j) ||
        this.getColor(i, j) == color ||
        (!!byChameleon && this.getPiece(i, j) != V.KNIGHT)
      ) {
        continue;
      }
      // last(thing), cur(thing) : stop if "cur" is our color,
      // or beyond board limits, or if "last" isn't empty and cur neither.
      // Otherwise, if cur is empty then add move until cur square;
      // if cur is occupied then stop if !!byChameleon and the square not
      // occupied by a leaper.
      let last = [i, j];
      let cur = [i + step[0], j + step[1]];
      let vanished = [new PiPo({ x: x, y: y, c: color, p: piece })];
      while (V.OnBoard(cur[0], cur[1])) {
        if (this.board[last[0]][last[1]] != V.EMPTY) {
          const oppPiece = this.getPiece(last[0], last[1]);
          if (!!byChameleon && oppPiece != V.KNIGHT) continue outerLoop;
          // Something to eat:
          vanished.push(
            new PiPo({ x: last[0], y: last[1], c: oppCol, p: oppPiece })
          );
        }
        if (this.board[cur[0]][cur[1]] != V.EMPTY) {
          if (
            this.getColor(cur[0], cur[1]) == color ||
            this.board[last[0]][last[1]] != V.EMPTY
          ) {
            //TODO: redundant test
            continue outerLoop;
          }
        } else {
          moves.push(
            new Move({
              appear: [new PiPo({ x: cur[0], y: cur[1], c: color, p: piece })],
              vanish: JSON.parse(JSON.stringify(vanished)), //TODO: required?
              start: { x: x, y: y },
              end: { x: cur[0], y: cur[1] }
            })
          );
        }
        last = [last[0] + step[0], last[1] + step[1]];
        cur = [cur[0] + step[0], cur[1] + step[1]];
      }
    }
    return moves;
  }

  // Long-leaper
  getPotentialKnightMoves(sq) {
    return super.getPotentialQueenMoves(sq).concat(this.getKnightCaptures(sq));
  }

  // Chameleon
  getPotentialBishopMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = super
      .getPotentialQueenMoves([x, y])
      .concat(this.getKnightCaptures([x, y], "asChameleon"))
      .concat(this.getRookCaptures([x, y], "asChameleon"));
    // No "king capture" because king cannot remain under check
    this.addQueenCaptures(moves, "asChameleon");
    // Also add pawn captures (as a pawn):
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    adjacentSteps.forEach(step => {
      const [i, j] = [x + step[0], y + step[1]];
      const [ii, jj] = [i + step[0], j + step[1]];
      // Try to leap over (i,j):
      if (
        V.OnBoard(ii, jj) &&
        this.board[i][j] != V.EMPTY &&
        this.board[ii][jj] != V.EMPTY &&
        this.getColor(ii, jj) == oppCol &&
        this.getPiece(ii, jj) == V.PAWN
      ) {
        moves.push(this.getBasicMove([x, y], [ii, jj]));
      }
    });
    // Post-processing: merge similar moves, concatenating vanish arrays
    let mergedMoves = {};
    moves.forEach(m => {
      const key = m.end.x + V.size.x * m.end.y;
      if (!mergedMoves[key]) mergedMoves[key] = m;
      else {
        for (let i = 1; i < m.vanish.length; i++)
          mergedMoves[key].vanish.push(m.vanish[i]);
      }
    });
    return Object.values(mergedMoves);
  }

  addQueenCaptures(moves, byChameleon) {
    if (moves.length == 0) return;
    const [x, y] = [moves[0].start.x, moves[0].start.y];
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    let capturingDirStart = {};
    const oppCol = V.GetOppCol(this.turn);
    // Useful precomputation:
    adjacentSteps.forEach(step => {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol &&
        (!byChameleon || this.getPiece(i, j) == V.QUEEN)
      ) {
        capturingDirStart[step[0] + "_" + step[1]] = this.getPiece(i, j);
      }
    });
    moves.forEach(m => {
      const step = [
        m.end.x != x ? (m.end.x - x) / Math.abs(m.end.x - x) : 0,
        m.end.y != y ? (m.end.y - y) / Math.abs(m.end.y - y) : 0
      ];
      // TODO: this test should be done only once per direction
      const capture = capturingDirStart[(-step[0]) + "_" + (-step[1])];
      if (!!capture) {
        const [i, j] = [x - step[0], y - step[1]];
        m.vanish.push(
          new PiPo({
            x: i,
            y: j,
            p: capture,
            c: oppCol
          })
        );
      }
      // Also test the end (advancer effect)
      const [i, j] = [m.end.x + step[0], m.end.y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol &&
        (!byChameleon || this.getPiece(i, j) == V.QUEEN)
      ) {
        m.vanish.push(
          new PiPo({
            x: i,
            y: j,
            p: this.getPiece(i, j),
            c: oppCol
          })
        );
      }
    });
  }

  // Withdrawer + advancer: "pushme-pullyu"
  getPotentialQueenMoves(sq) {
    let moves = super.getPotentialQueenMoves(sq);
    this.addQueenCaptures(moves);
    return moves;
  }

  getPotentialImmobilizerMoves(sq) {
    // Immobilizer doesn't capture
    return super.getPotentialQueenMoves(sq);
  }

  // Does m2 un-do m1 ? (to disallow undoing swaps)
  oppositeMoves(m1, m2) {
    return (
      !!m1 &&
      m2.appear.length == 2 &&
      m1.start.x == m2.start.x &&
      m1.end.x == m2.end.x &&
      m1.start.y == m2.start.y &&
      m1.end.y == m2.end.y
    );
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    return (
      super.filterValid(
        moves.filter(m => {
          const L = this.smoves.length; //at least 1: init from FEN
          return !this.oppositeMoves(this.smoves[L - 1], m);
        })
      )
    );
  }

  // isAttacked() is OK because the immobilizer doesn't take

  isAttackedByPawn([x, y], color) {
    // Attacked if an enemy pawn stands just behind an immediate obstacle:
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], y + step[1]];
      const [ii, jj] = [i + step[0], j + step[1]];
      if (
        V.OnBoard(ii, jj) &&
        this.board[i][j] != V.EMPTY &&
        this.board[ii][jj] != V.EMPTY &&
        this.getColor(ii, jj) == color &&
        this.getPiece(ii, jj) == V.PAWN &&
        !this.isImmobilized([ii, jj])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByRook([x, y], color) {
    // The only way a swapper can take is by mutual destruction when the
    // enemy piece stands just next:
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.ROOK &&
        !this.isImmobilized([i, j])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByKnight([x, y], color) {
    // Square (x,y) must be on same line as a knight,
    // and there must be empty square(s) behind.
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    outerLoop: for (let step of steps) {
      const [i0, j0] = [x + step[0], y + step[1]];
      if (V.OnBoard(i0, j0) && this.board[i0][j0] == V.EMPTY) {
        // Try in opposite direction:
        let [i, j] = [x - step[0], y - step[1]];
        while (V.OnBoard(i, j)) {
          while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
            i -= step[0];
            j -= step[1];
          }
          if (V.OnBoard(i, j)) {
            if (this.getColor(i, j) == color) {
              if (
                this.getPiece(i, j) == V.KNIGHT &&
                !this.isImmobilized([i, j])
              )
                return true;
              continue outerLoop;
            }
            // [else] Our color,
            // could be captured *if there was an empty space*
            if (this.board[i + step[0]][j + step[1]] != V.EMPTY)
              continue outerLoop;
            i -= step[0];
            j -= step[1];
          }
        }
      }
    }
    return false;
  }

  isAttackedByBishop([x, y], color) {
    // We cheat a little here: since this function is used exclusively for
    // the king, it's enough to check the immediate surrounding of the square.
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.BISHOP &&
        !this.isImmobilized([i, j])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByQueen([x, y], color) {
    // Is there a queen in view?
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (
        V.OnBoard(i, j) &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.QUEEN
      ) {
        // Two cases: the queen is at 2 steps at least, or just close
        // but maybe with enough space behind to withdraw.
        let attacked = false;
        if (i == x + step[0] && j == y + step[1]) {
          const [ii, jj] = [i + step[0], j + step[1]];
          if (V.OnBoard(ii, jj) && this.board[ii][jj] == V.EMPTY)
            attacked = true;
        }
        else attacked = true;
        if (attacked && !this.isImmobilized([i, j])) return true;
      }
    }
    return false;
  }

  isAttackedByKing([x, y], color) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) === V.KING &&
        this.getColor(rx, ry) == color &&
        !this.isImmobilized([rx, ry])
      ) {
        return true;
      }
    }
    return false;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0) {
      return (
        "91/1rnbkqbnm1/1pppppppp1/91/91/91/91/1PPPPPPPP1/1MNBQKBNR1/91 w 0 -"
      );
    }

    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces on first and last rank
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      // Get random squares for every piece, totally freely
      let positions = shuffle(ArrayFun.range(8));
      const composition = ['r', 'm', 'n', 'n', 'q', 'q', 'b', 'k'];
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      "91/1" + pieces["b"].join("") +
      "1/1pppppppp1/91/91/91/91/1PPPPPPPP1/1" +
      pieces["w"].join("").toUpperCase() + "1/91 w 0 -"
    );
  }

  getSmoveFen() {
    const L = this.smoves.length;
    return (
      !this.smoves[L - 1]
        ? "-"
        : ChessRules.CoordsToSquare(this.smoves[L - 1].start) +
          ChessRules.CoordsToSquare(this.smoves[L - 1].end)
    );
  }

  getFen() {
    return super.getFen() + " " + this.getSmoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getSmoveFen();
  }

  postPlay(move) {
    super.postPlay(move);
    this.smoves.push(this.getSmove(move));
  }

  postUndo(move) {
    super.postUndo(move);
    this.smoves.pop();
  }

  static get VALUES() {
    return {
      p: 1,
      r: 2,
      n: 5,
      b: 3,
      q: 5,
      m: 5,
      k: 1000
    };
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    const initialSquare = V.CoordsToSquare(move.start);
    const finalSquare = V.CoordsToSquare(move.end);
    if (move.appear.length == 0) {
      // Suicide 'S' or mutual destruction 'D':
      return (
        initialSquare + (move.vanish.length == 1 ? "S" : "D" + finalSquare)
      );
    }
    let notation = undefined;
    if (move.appear[0].p == V.PAWN) {
      // Pawn: generally ambiguous short notation, so we use full description
      notation = "P" + initialSquare + finalSquare;
    } else if (move.appear[0].p == V.KING)
      notation = "K" + (move.vanish.length > 1 ? "x" : "") + finalSquare;
    else notation = move.appear[0].p.toUpperCase() + finalSquare;
    // Add a capture mark (not describing what is captured...):
    if (move.vanish.length > 1 && move.appear[0].p != V.KING) notation += "X";
    return notation;
  }
};
