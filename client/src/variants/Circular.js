import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class CircularRules extends ChessRules {

  static get HasCastle() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get CanFlip() {
    return false;
  }

  setFlags(fenflags) {
    this.pawnFlags = {
      w: [...Array(8).fill(true)], //pawns can move 2 squares?
      b: [...Array(8).fill(true)]
    };
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        this.pawnFlags[c][i] = fenflags.charAt((c == "w" ? 0 : 8) + i) == "1";
    }
  }

  aggregateFlags() {
    return this.pawnFlags;
  }

  disaggregateFlags(flags) {
    this.pawnFlags = flags;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0) {
      return "8/8/pppppppp/rnbqkbnr/8/8/PPPPPPPP/RNBQKBNR " +
        "w 0 1111111111111111";
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
      const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
      const rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix bishops (on different colors)
        for (let i=2; i<8; i++) {
          if (positions[i] % 2 != rem2) {
            [positions[1], positions[i]] = [positions[i], positions[1]];
            break;
          }
        }
      }
      for (let i = 0; i < 8; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      "8/8/pppppppp/" +
      pieces["b"].join("") +
      "/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      // 16 flags: can pawns advance 2 squares?
      " w 0 1111111111111111"
    );
  }

  // Output basically x % 8 (circular board)
  static ComputeX(x) {
    let res = x % V.size.x;
    if (res < 0)
      res += V.size.x;
    return res;
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    // Don't add move twice when running on an infinite file:
    let infiniteSteps = {};
    outerLoop: for (let step of steps) {
      if (!!infiniteSteps[(-step[0]) + "." + (-step[1])]) continue;
      let i = V.ComputeX(x + step[0]);
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep !== undefined) continue outerLoop;
        i = V.ComputeX(i + step[0]);
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        if (i == x && j == y)
          // Looped back onto initial square
          infiniteSteps[step[0] + "." + step[1]] = true;
        else if (this.canTake([x, y], [i, j]))
          moves.push(this.getBasicMove([x, y], [i, j]));
      }
    }
    return moves;
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    // All pawns go in the same direction!
    const shiftX = -1;
    const startRank = color == "w" ? sizeX - 2 : 2;

    // One square forward
    const nextRow = V.ComputeX(x + shiftX);
    if (this.board[nextRow][y] == V.EMPTY) {
      moves.push(this.getBasicMove([x, y], [nextRow, y]));
      if (
        x == startRank &&
        this.pawnFlags[color][y] &&
        this.board[x + 2 * shiftX][y] == V.EMPTY
      ) {
        // Two squares jump
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    // Captures
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[nextRow][y + shiftY] != V.EMPTY &&
        this.canTake([x, y], [nextRow, y + shiftY])
      ) {
        moves.push(this.getBasicMove([x, y], [nextRow, y + shiftY]));
      }
    }

    return moves;
  }

  filterValid(moves) {
    const filteredMoves = super.filterValid(moves);
    // If at least one full move made, everything is allowed:
    if (this.movesCount >= 2) return filteredMoves;
    // Else, forbid check:
    const oppCol = V.GetOppCol(this.turn);
    return filteredMoves.filter(m => {
      this.play(m);
      const res = !this.underCheck(oppCol);
      this.undo(m);
      return res;
    });
  }

  isAttackedByPawn([x, y], color) {
    // pawn shift is always 1 (all pawns go the same way)
    const attackerRow = V.ComputeX(x + 1);
    for (let i of [-1, 1]) {
      if (
        y + i >= 0 &&
        y + i < V.size.y &&
        this.getPiece(attackerRow, y + i) == V.PAWN &&
        this.getColor(attackerRow, y + i) == color
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = V.ComputeX(x + step[0]),
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx = V.ComputeX(rx + step[0]);
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color
      ) {
        return true;
      }
    }
    return false;
  }

  getFlagsFen() {
    // Return pawns flags
    let flags = "";
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++) flags += this.pawnFlags[c][i] ? "1" : "0";
    }
    return flags;
  }

  postPlay(move) {
    super.postPlay(move);
    const c = move.vanish[0].c;
    const secondRank = { "w": 6, "b": 2 };
    if (move.vanish[0].p == V.PAWN && secondRank[c] == move.start.x)
      // This move turns off a 2-squares pawn flag
      this.pawnFlags[c][move.start.y] = false;
  }

  static get VALUES() {
    return {
      p: 1,
      r: 5,
      n: 3,
      b: 4,
      q: 10,
      k: 1000
    };
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
