import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class FugueRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get LoseOnRepetition() {
    return true;
  }

  static get IMMOBILIZER() {
    return 'i';
  }
  static get PUSHME_PULLYOU() {
    return 'u';
  }
  static get ARCHER() {
    return 'a';
  }
  static get SHIELD() {
    return 's';
  }
  static get LONG_LEAPER() {
    return 'l';
  }
  static get SWAPPER() {
    return 'w';
  }

  static get PIECES() {
    return [
      V.PAWN,
      V.QUEEN,
      V.KING,
      V.IMMOBILIZER,
      V.PUSHME_PULLYOU,
      V.ARCHER,
      V.SHIELD,
      V.LONG_LEAPER,
      V.SWAPPER
    ];
  }

  getPpath(b) {
    if (['p', 'q', 'k'].includes(b[1])) return b;
    return "Fugue/" + b;
  }

  getPPpath(m) {
    // The only "choice" case is between a swap and a mutual destruction:
    // show empty square in case of mutual destruction.
    if (m.appear.length == 0) return "Rococo/empty";
    return this.getPpath(m.appear[0].c + m.appear[0].p);
  }

  scanKings(fen) {
    // No castling, but keep track of kings for faster game end checks
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
            const num = parseInt(position[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  // Is piece on square (x,y) immobilized?
  isImmobilized([x, y]) {
    const piece = this.getPiece(x, y);
    if (piece == V.IMMOBILIZER) return false;
    const oppCol = V.GetOppCol(this.getColor(x, y));
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        if (this.getPiece(i, j) == V.IMMOBILIZER) return true;
      }
    }
    return false;
  }

  isProtected([x, y]) {
    const color = this.getColor(x, y);
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let s of steps) {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        V.OnBoard(i, j) &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.SHIELD
      ) {
        return true;
      }
    }
    return false;
  }

  canTake([x1, y1], [x2, y2]) {
    return !this.isProtected([x2, y2]) && super.canTake([x1, y1], [x2, y2]);
  }

  getPotentialMovesFrom([x, y]) {
    // Pre-check: is thing on this square immobilized?
    if (this.isImmobilized([x, y])) return [];
    const piece = this.getPiece(x, y);
    let moves = [];
    switch (piece) {
      case V.PAWN: return this.getPotentialPawnMoves([x, y]);
      case V.IMMOBILIZER: return this.getPotentialImmobilizerMoves([x, y]);
      case V.PUSHME_PULLYOU: return this.getPotentialPushmePullyuMoves([x, y]);
      case V.ARCHER: return this.getPotentialArcherMoves([x, y]);
      case V.SHIELD: return this.getPotentialShieldMoves([x, y]);
      case V.KING: return this.getPotentialKingMoves([x, y]);
      case V.QUEEN: return super.getPotentialQueenMoves([x, y]);
      case V.LONG_LEAPER: return this.getPotentialLongLeaperMoves([x, y]);
      case V.SWAPPER: return this.getPotentialSwapperMoves([x, y]);
    }
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
      // Only queen and king can take on occupied square:
      if (
        [V.KING, V.QUEEN].includes(piece) &&
        V.OnBoard(i, j) &&
        this.canTake([x, y], [i, j])
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
      }
    }
    return moves;
  }

  // "Cannon/grasshopper pawn"
  getPotentialPawnMoves([x, y]) {
    const c = this.turn;
    const oppCol = V.GetOppCol(c);
    const lastRank = (c == 'w' ? 0 : 7);
    let canResurect = {
      [V.QUEEN]: true,
      [V.IMMOBILIZER]: true,
      [V.PUSHME_PULLYOU]: true,
      [V.ARCHER]: true,
      [V.SHIELD]: true,
      [V.LONG_LEAPER]: true,
      [V.SWAPPER]: true
    };
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == c) {
          const pIJ = this.getPiece(i, j);
          if (![V.PAWN, V.KING].includes(pIJ)) canResurect[pIJ] = false;
        }
      }
    }
    let moves = [];
    const addPromotions = sq => {
      // Optional promotion
      Object.keys(canResurect).forEach(p => {
        if (canResurect[p]) {
          moves.push(
            this.getBasicMove([x, y], [sq[0], sq[1]], { c: c, p: p }));
        }
      });
    }
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    adjacentSteps.forEach(step => {
      const [i, j] = [x + step[0], y + step[1]];
      if (V.OnBoard(i, j)) {
        if (this.board[i][j] == V.EMPTY) {
          moves.push(this.getBasicMove([x, y], [i, j]));
          if (i == lastRank) addPromotions([i, j]);
        }
        else {
          // Try to leap over:
          const [ii, jj] = [i + step[0], j + step[1]];
          if (
            V.OnBoard(ii, jj) &&
            (
              this.board[ii][jj] == V.EMPTY ||
              this.getColor(ii, jj) == oppCol && !this.isProtected([ii, jj])
            )
          ) {
            moves.push(this.getBasicMove([x, y], [ii, jj]));
            if (ii == lastRank) addPromotions([ii, jj]);
          }
        }
      }
    });
    return moves;
  }

  getPotentialKingMoves(sq) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return this.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  // NOTE: not really captures, but let's keep the name
  getSwapperCaptures([x, y]) {
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
        if (
          i == x + step[0] && j == y + step[1] &&
          !this.isProtected([i, j])
        ) {
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
    });
    return moves;
  }

  getPotentialSwapperMoves(sq) {
    return (
      super.getPotentialQueenMoves(sq).concat(this.getSwapperCaptures(sq))
    );
  }

  getLongLeaperCaptures([x, y]) {
    // Look in every direction for captures
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let moves = [];
    const piece = this.getPiece(x, y);
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (
        !V.OnBoard(i, j) ||
        this.getColor(i, j) == color ||
        this.isProtected([i, j])
      ) {
        continue;
      }
      let [ii, jj] = [i + step[0], j + step[1]];
      const vanished = [
        new PiPo({ x: x, y: y, c: color, p: piece }),
        new PiPo({ x: i, y: j, c: oppCol, p: this.getPiece(i, j)})
      ];
      while (V.OnBoard(ii, jj) && this.board[ii][jj] == V.EMPTY) {
        moves.push(
          new Move({
            appear: [new PiPo({ x: ii, y: jj, c: color, p: piece })],
            vanish: JSON.parse(JSON.stringify(vanished)), //TODO: required?
            start: { x: x, y: y },
            end: { x: ii, y: jj }
          })
        );
        ii += step[0];
        jj += step[1];
      }
    }
    return moves;
  }

  getPotentialLongLeaperMoves(sq) {
    return (
      super.getPotentialQueenMoves(sq).concat(this.getLongLeaperCaptures(sq))
    );
  }

  completeAndFilterPPcaptures(moves) {
    if (moves.length == 0) return [];
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
        this.getColor(i, j) == oppCol
      ) {
        capturingDirStart[step[0] + "_" + step[1]] = {
          p: this.getPiece(i, j),
          canTake: !this.isProtected([i, j])
        };
      }
    });
    moves.forEach(m => {
      const step = [
        m.end.x != x ? (m.end.x - x) / Math.abs(m.end.x - x) : 0,
        m.end.y != y ? (m.end.y - y) / Math.abs(m.end.y - y) : 0
      ];
      // TODO: this test should be done only once per direction
      const capture = capturingDirStart[(-step[0]) + "_" + (-step[1])];
      if (!!capture && capture.canTake) {
        const [i, j] = [x - step[0], y - step[1]];
        m.vanish.push(
          new PiPo({
            x: i,
            y: j,
            p: capture.p,
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
        !this.isProtected([i, j])
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
    // Forbid "double captures"
    return moves.filter(m => m.vanish.length <= 2);
  }

  getPotentialPushmePullyuMoves(sq) {
    let moves = super.getPotentialQueenMoves(sq);
    return this.completeAndFilterPPcaptures(moves);
  }

  getPotentialImmobilizerMoves(sq) {
    // Immobilizer doesn't capture
    return super.getPotentialQueenMoves(sq);
  }

  getPotentialArcherMoves([x, y]) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    let moves = this.getSlideNJumpMoves([x, y], steps);
    const c = this.turn;
    const oppCol = V.GetOppCol(c);
    // Add captures
    for (let s of steps) {
      let [i, j] = [x + s[0], y + s[1]];
      let stepCounter = 1;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += s[0];
        j += s[1];
        stepCounter++;
      }
      if (
        V.OnBoard(i, j) &&
        this.getColor(i, j) == oppCol &&
        !this.isProtected([i, j])
      ) {
        let shootOk = (stepCounter <= 2);
        if (!shootOk) {
          // try to find a spotting piece:
          for (let ss of steps) {
            let [ii, jj] = [i + ss[0], j + ss[1]];
            if (V.OnBoard(ii, jj)) {
              if (this.board[ii][jj] != V.EMPTY) {
                if (this.getColor(ii, jj) == c) {
                  shootOk = true;
                  break;
                }
              }
              else {
                ii += ss[0];
                jj += ss[1];
                if (
                  V.OnBoard(ii, jj) &&
                  this.board[ii][jj] != V.EMPTY &&
                  this.getColor(ii, jj) == c
                ) {
                  shootOk = true;
                  break;
                }
              }
            }
          }
        }
        if (shootOk) {
          moves.push(
            new Move({
              appear: [],
              vanish: [
                new PiPo({ x: i, y: j, c: oppCol, p: this.getPiece(i, j) })
              ],
              start: { x: x, y: y },
              end: { x: i, y: j }
            })
          );
        }
      }
    }
    return moves;
  }

  getPotentialShieldMoves(sq) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return this.getSlideNJumpMoves(sq, steps);
  }

  getCheckSquares() {
    return [];
  }

  filterValid(moves) {
    return moves;
  }

  getCurrentScore() {
    const c = this.turn;
    if (this.kingPos[c][0] < 0) return (c == 'w' ? "0-1" : "1-0");
    if (this.atLeastOneMove()) return "*";
    // Stalemate, or checkmate: I lose
    return (c == 'w' ? "0-1" : "1-0");
  }

  postPlay(move) {
    const startIdx = (move.appear.length == 0 ? 0 : 1);
    for (let i = startIdx; i < move.vanish.length; i++) {
      const v = move.vanish[i];
      if (v.p == V.KING) this.kingPos[v.c] = [-1, -1];
    }
    // King may have moved, or was swapped
    for (let a of move.appear) {
      if (a.p == V.KING) {
        this.kingPos[a.c] = [a.x, a.y];
        break;
      }
    }
  }

  postUndo(move) {
    const startIdx = (move.appear.length == 0 ? 0 : 1);
    for (let i = startIdx; i < move.vanish.length; i++) {
      const v = move.vanish[i];
      if (v.p == V.KING) this.kingPos[v.c] = [v.x, v.y];
    }
    // King may have moved, or was swapped
    for (let i = 0; i < move.appear.length; i++) {
      const a = move.appear[i];
      if (a.p == V.KING) {
        const v = move.vanish[i];
        this.kingPos[a.c] = [v.x, v.y];
        break;
      }
    }
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0) {
      return (
        "wlqksaui/pppppppp/8/8/8/8/PPPPPPPP/IUASKQLW w 0"
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
      const composition = ['w', 'l', 'q', 'k', 's', 'a', 'u', 'i'];
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() + " w 0"
    );
  }

  static get VALUES() {
    // Experimental...
    return {
      p: 1,
      q: 9,
      l: 5,
      s: 5,
      a: 5,
      u: 5,
      i: 12,
      w: 3,
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
      // Archer shooting 'S' or Mutual destruction 'D':
      return (
        initialSquare + (move.vanish.length == 1 ? "S" : "D") + finalSquare
      );
    }
    let notation = undefined;
    const symbol = move.appear[0].p.toUpperCase();
    if (symbol == 'P')
      // Pawn: generally ambiguous short notation, so we use full description
      notation = "P" + initialSquare + finalSquare;
    else if (['Q', 'K'].includes(symbol))
      notation = symbol + (move.vanish.length > 1 ? "x" : "") + finalSquare;
    else {
      notation = symbol + finalSquare;
      // Add a capture mark (not describing what is captured...):
      if (move.vanish.length > 1) notation += "X";
    }
    return notation;
  }

};
