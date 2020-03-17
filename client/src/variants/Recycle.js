import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export class RecycleRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.PAWN] } //in fact, none
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{10,10}$/))
      return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(ChessRules.ParseFen(fen), {
      reserve: fenParts[5]
    });
  }

  getEpSquare(moveOrSquare) {
    if (typeof moveOrSquare !== "object" || moveOrSquare.vanish.length > 0)
      return super.getEpSquare(moveOrSquare);
    // Landing move: no en-passant
    return undefined;
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness) + " 0000000000";
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    let counts = new Array(10);
    for (
      let i = 0;
      i < V.PIECES.length - 1;
      i++ //-1: no king reserve
    ) {
      counts[i] = this.reserve["w"][V.PIECES[i]];
      counts[5 + i] = this.reserve["b"][V.PIECES[i]];
    }
    return counts.join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const fenParsed = V.ParseFen(fen);
    // Also init reserves (used by the interface to show landable pieces)
    this.reserve = {
      w: {
        [V.PAWN]: parseInt(fenParsed.reserve[0]),
        [V.ROOK]: parseInt(fenParsed.reserve[1]),
        [V.KNIGHT]: parseInt(fenParsed.reserve[2]),
        [V.BISHOP]: parseInt(fenParsed.reserve[3]),
        [V.QUEEN]: parseInt(fenParsed.reserve[4])
      },
      b: {
        [V.PAWN]: parseInt(fenParsed.reserve[5]),
        [V.ROOK]: parseInt(fenParsed.reserve[6]),
        [V.KNIGHT]: parseInt(fenParsed.reserve[7]),
        [V.BISHOP]: parseInt(fenParsed.reserve[8]),
        [V.QUEEN]: parseInt(fenParsed.reserve[9])
      }
    };
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  // Used by the interface:
  getReservePpath(index, color) {
    return color + V.RESERVE_PIECES[index];
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    const pawnShift = p == V.PAWN ? 1 : 0;
    for (let i = pawnShift; i < V.size.x - pawnShift; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: p
              })
            ],
            vanish: [],
            start: { x: x, y: y }, //a bit artificial...
            end: { x: i, y: j }
          });
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    if (x >= V.size.x) {
      // Reserves, outside of board: x == sizeX(+1)
      return this.getReserveMoves([x, y]);
    }
    // Standard moves
    return super.getPotentialMovesFrom([x, y]);
  }

  getPotentialPawnMoves([x, y]) {
    let moves = super.getPotentialPawnMoves([x, y]);
    // Remove pawns on 8th rank ("fallen"):
    const color = this.turn;
    const lastRank = (color == "w" ? 0 : V.size.x - 1);
    moves.forEach(m => {
      if (m.appear[0].x == lastRank) m.appear.pop();
    });
    return moves;
  }

  getAllValidMoves() {
    let moves = super.getAllValidMoves();
    const color = this.turn;
    for (let i = 0; i < V.RESERVE_PIECES.length; i++)
      moves = moves.concat(
        this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
      );
    return this.filterValid(moves);
  }

  atLeastOneMove() {
    if (!super.atLeastOneMove()) {
      // Search one reserve move
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        let moves = this.filterValid(
          this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
        );
        if (moves.length > 0) return true;
      }
      return false;
    }
    return true;
  }

  canTake([x1, y1], [x2, y2]) {
    // Self-captures allowed, except for the king:
    return this.getPiece(x2, y2) != V.KING;
  }

  prePlay(move) {
    super.prePlay(move);
    if (move.vanish.length == 2 && move.appear.length == 2) return; //skip castle
    const color = this.turn;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2 && move.vanish[1].c == color)
      // Self-capture
      this.reserve[color][move.vanish[1].p]++;
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = this.turn;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]++;
    else if (move.vanish.length == 2 && move.vanish[1].c == color)
      this.reserve[color][move.vanish[1].p]--;
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  evalPosition() {
    let evaluation = super.evalPosition();
    // Add reserves:
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      const p = V.RESERVE_PIECES[i];
      evaluation += this.reserve["w"][p] * V.VALUES[p];
      evaluation -= this.reserve["b"][p] * V.VALUES[p];
    }
    return evaluation;
  }

  getNotation(move) {
    const finalSquare = V.CoordsToSquare(move.end);
    if (move.vanish.length > 0) {
      if (move.appear.length > 0) {
        // Standard move
        return super.getNotation(move);
      } else {
        // Pawn fallen: capturing or not
        let res = "";
        if (move.vanish.length == 2)
          res += V.CoordToColumn(move.start.y) + "x";
        return res + finalSquare;
      }
    }
    // Rebirth:
    const piece =
      move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
    return piece + "@" + V.CoordsToSquare(move.end);
  }
};
