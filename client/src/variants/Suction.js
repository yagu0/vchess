import { ChessRules, PiPo, Move } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";

export class SuctionRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      // No promotions:
      { promotions: [V.PAWN] }
    );
  }

  static get HasFlags() {
    return false;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Local stack of "captures"
    this.cmoves = [];
    const cmove = V.ParseFen(fen).cmove;
    if (cmove == "-") this.cmoves.push(null);
    else {
      this.cmoves.push({
        start: ChessRules.SquareToCoords(cmove.substr(0, 2)),
        end: ChessRules.SquareToCoords(cmove.substr(2))
      });
    }
  }

  static ParseFen(fen) {
    return Object.assign(
      ChessRules.ParseFen(fen),
      { cmove: fen.split(" ")[4] }
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 5) return false;
    if (fenParts[4] != "-" && !fenParts[4].match(/^([a-h][1-8]){2}$/))
      return false;
    return true;
  }

  getCmove(move) {
    if (move.vanish.length == 2)
      return { start: move.start, end: move.end };
    return null;
  }

  getBasicMove([sx, sy], [ex, ey]) {
    const startColor = this.getColor(sx, sy);
    const startPiece = this.getPiece(sx, sy);
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: startColor,
          p: startPiece
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: startColor,
          p: startPiece
        })
      ]
    });

    if (this.board[ex][ey] != V.EMPTY) {
      const endColor = this.getColor(ex, ey);
      const endPiece = this.getPiece(ex, ey);
      mv.vanish.push(
        new PiPo({
          x: ex,
          y: ey,
          c: endColor,
          p: endPiece
        })
      );
      mv.appear.push(
        new PiPo({
          x: sx,
          y: sy,
          c: endColor,
          p: endPiece
        })
      );
    }
    return mv;
  }

  getEnpassantCaptures([x, y], shiftX) {
    let moves = [];
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1
    ) {
      let enpassantMove = this.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      const oppCol = V.GetOppCol(this.turn);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: "p",
        c: oppCol
      });
      enpassantMove.appear.push({
        x: x,
        y: y,
        p: "p",
        c: oppCol
      });
      moves.push(enpassantMove);
    }
    return moves;
  }

  getPotentialKingMoves() {
    return [];
  }

  // Does m2 un-do m1 ? (to disallow undoing captures)
  oppositeMoves(m1, m2) {
    return (
      !!m1 &&
      m2.vanish.length == 2 &&
      m1.start.x == m2.start.x &&
      m1.end.x == m2.end.x &&
      m1.start.y == m2.start.y &&
      m1.end.y == m2.end.y
    );
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    return moves.filter(m => {
      const L = this.cmoves.length; //at least 1: init from FEN
      return !this.oppositeMoves(this.cmoves[L - 1], m);
    });
  }

  static GenRandInitFen(randomness) {
    // Add empty cmove:
    return SuicideRules.GenRandInitFen(randomness) + " -";
  }

  getCmoveFen() {
    const L = this.cmoves.length;
    return (
      !this.cmoves[L - 1]
        ? "-"
        : ChessRules.CoordsToSquare(this.cmoves[L - 1].start) +
          ChessRules.CoordsToSquare(this.cmoves[L - 1].end)
    );
  }

  getFen() {
    return super.getFen() + " " + this.getCmoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getCmoveFen();
  }

  postPlay(move) {
    super.postPlay(move);
    // Was opponent king swapped?
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[this.turn] = [move.appear[1].x, move.appear[1].y];
    this.cmoves.push(this.getCmove(move));
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.appear.length == 2 && move.appear[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
    this.cmoves.pop();
  }

  atLeastOneMove() {
    return true;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (color == "w" && kp[0] == 0) return "0-1";
    if (color == "b" && kp[0] == V.size.x - 1) return "1-0";
    // King is not on the opposite edge: game not over
    return "*";
  }

  evalPosition() {
    // Very simple criterion for now: kings position
    return this.kingPos["w"][0] + this.kingPos["b"][0];
  }

  getNotation(move) {
    // Translate final square
    const finalSquare = V.CoordsToSquare(move.end);

    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      let notation = "";
      if (move.vanish.length == 2) {
        // Capture
        const startColumn = V.CoordToColumn(move.start.y);
        notation = startColumn + "x" + finalSquare;
      }
      else notation = finalSquare;
      return notation;
    }
    // Piece movement
    return (
      piece.toUpperCase() +
      (move.vanish.length == 2 ? "x" : "") +
      finalSquare
    );
  }

};
