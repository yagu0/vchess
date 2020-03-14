import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class HiddenqueenRules extends ChessRules {
  // Analyse in Hiddenqueen mode makes no sense
  static get CanAnalyze() {
    return false;
  }

  static get HIDDEN_QUEEN() {
    return 't';
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(Object.values(V.HIDDEN_CODE));
  }

  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    if (
      piece != V.HIDDEN_QUEEN ||
      // 'side' is used to determine what I see: a pawn or a (hidden)queen?
      this.getColor(i, j) == this.side
    ) {
      return piece;
    }
    return V.PAWN;
  }

  getPpath(b, color, score) {
    if (b[1] == V.HIDDEN_QUEEN) {
      // Supposed to be hidden.
      if (score == "*" && (!color || color != b[0]))
        return b[0] + "p";
      return "Hiddenqueen/" + b[0] + "t";
    }
    return b;
  }

  isValidPawnMove(move) {
    const color = move.vanish[0].c;
    const pawnShift = color == "w" ? -1 : 1;
    const startRank = color == "w" ? V.size.x - 2 : 1;
    return (
      (
        move.end.x - move.start.x == pawnShift &&
        (
          (
            // Normal move
            move.end.y == move.start.y &&
            this.board[move.end.x][move.end.y] == V.EMPTY
          )
          ||
          (
            // Capture
            Math.abs(move.end.y - move.start.y) == 1 &&
            this.board[move.end.x][move.end.y] != V.EMPTY
          )
        )
      )
      ||
      (
        // Two-spaces initial jump
        move.start.x == startRank &&
        move.end.y == move.start.y &&
        move.end.x - move.start.x == 2 * pawnShift &&
        this.board[move.end.x][move.end.y] == V.EMPTY
      )
    );
  }

  getPotentialMovesFrom([x, y]) {
    if (this.getPiece(x, y) == V.HIDDEN_QUEEN) {
      const pawnMoves = this.getPotentialPawnMoves([x, y]);
      let queenMoves = super.getPotentialQueenMoves([x, y]);
      // Remove from queen moves those corresponding to a pawn move:
      queenMoves = queenMoves
        .filter(m => !this.isValidPawnMove(m))
        // Hidden queen is revealed if moving like a queen:
        .map(m => {
          m.appear[0].p = V.QUEEN;
          return m;
        });
      return pawnMoves.concat(queenMoves);
    }
    return super.getPotentialMovesFrom([x, y]);
  }

  // TODO: find a more general way to describe pawn movements to avoid
  // re-writing almost the same function for several variants.
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    const piece = this.getPiece(x, y);
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;

    const finalPieces =
      x + shiftX == lastRank
        ? piece == V.PAWN
          ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
          : [V.QUEEN] //hidden queen revealed
        : [piece]; //V.PAWN
    if (this.board[x + shiftX][y] == V.EMPTY) {
      // One square forward
      for (let p of finalPieces) {
        moves.push(
          this.getBasicMove([x, y], [x + shiftX, y], {
            c: color,
            p: p
          })
        );
      }
      if (
        x == startRank &&
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
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        this.canTake([x, y], [x + shiftX, y + shiftY])
      ) {
        for (let p of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [x + shiftX, y + shiftY], {
              c: color,
              p: p
            })
          );
        }
      }
    }

    // En passant
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1
    ) {
      let enpassantMove = this.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: "p",
        c: this.getColor(x, epSquare.y)
      });
      moves.push(enpassantMove);
    }

    return moves;
  }

  getPossibleMovesFrom(sq) {
    this.side = this.turn;
    return this.filterValid(this.getPotentialMovesFrom(sq));
  }

  static GenRandInitFen(randomness) {
    let fen = ChessRules.GenRandInitFen(randomness);
    // Place hidden queens at random (always):
    let hiddenQueenPos = randInt(8);
    let pawnRank = "PPPPPPPP".split("");
    pawnRank[hiddenQueenPos] = "T";
    fen = fen.replace("PPPPPPPP", pawnRank.join(""));
    hiddenQueenPos = randInt(8);
    pawnRank = "pppppppp".split("");
    pawnRank[hiddenQueenPos] = "t";
    fen = fen.replace("pppppppp", pawnRank.join(""));
    return fen;
  }

  postPlay(move) {
    super.postPlay(move);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      // We took opponent king
      this.kingPos[this.turn] = [-1, -1];
  }

  preUndo(move) {
    super.preUndo(move);
    const oppCol = this.turn;
    if (this.kingPos[oppCol][0] < 0)
      // Move takes opponent's king:
      this.kingPos[oppCol] = [move.vanish[1].x, move.vanish[1].y];
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.kingPos[color][0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    return super.getCurrentScore();
  }

  // Search is biased, so not really needed to explore deeply
  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return Object.assign(
      { t: 9 },
      ChessRules.VALUES
    );
  }

  getComputerMove() {
    this.side = this.turn;
    return super.getComputerMove();
  }

  getNotation(move) {
    const notation = super.getNotation(move);
    if (notation.charAt(0) == 'T')
      // Do not reveal hidden queens
      return notation.substr(1);
    return notation;
  }
};
