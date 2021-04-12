import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export class CrazyhouseRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      // Change names to know that this goes back to pawn after capture:
      { promotions: ['u', 'o', 'c', 't'] }
    );
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(['u', 'o', 'c', 't']);
  }

  getPpath(b) {
    const prefix = (ChessRules.PIECES.includes(b[1]) ? "" : "Crazyhouse/");
    return prefix + b;
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
    return Object.assign(
      ChessRules.ParseFen(fen),
      { reserve: fenParts[5] }
    );
  }

  static GenRandInitFen(options) {
    return ChessRules.GenRandInitFen(options) + " 0000000000 -";
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
    const reserve = fenParsed.reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        [V.PAWN]: reserve[0],
        [V.ROOK]: reserve[1],
        [V.KNIGHT]: reserve[2],
        [V.BISHOP]: reserve[3],
        [V.QUEEN]: reserve[4]
      },
      b: {
        [V.PAWN]: reserve[5],
        [V.ROOK]: reserve[6],
        [V.KNIGHT]: reserve[7],
        [V.BISHOP]: reserve[8],
        [V.QUEEN]: reserve[9]
      }
    };
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  // Pieces types after pawn promotion
  static get PromotionMap() {
    return {
      u: 'r',
      o: 'n',
      c: 'b',
      t: 'q'
    };
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    const p = this.board[i][j].charAt(1);
    if (ChessRules.PIECES.includes(p)) return p;
    // Pawn promotion:
    return V.PromotionMap[p];
  }

  // Used by the interface:
  getReservePpath(index, color) {
    return color + V.RESERVE_PIECES[index];
  }
//  // Version if some day I have pieces with numbers printed on it:
//  getReservePpath(index, color) {
//    return (
//      "Crazyhouse/" +
//      color + V.RESERVE_PIECES[index] +
//      "_" + this.vr.reserve[playingColor][V.RESERVE_PIECES[i]]
//    );
//  }

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
    if (x >= V.size.x)
      // Reserves, outside of board: x == sizeX(+1)
      return this.getReserveMoves([x, y]);
    // Standard moves
    return super.getPotentialMovesFrom([x, y]);
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    const color = this.turn;
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      moves = moves.concat(
        this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
      );
    }
    return this.filterValid(moves);
  }

  atLeastOneMove() {
    if (super.atLeastOneMove()) return true;
    // Search one reserve move
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      const moves = this.filterValid(
        this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
      );
      if (moves.length > 0) return true;
    }
    return false;
  }

  postPlay(move) {
    super.postPlay(move);
    // Skip castle:
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = move.appear[0].c;
    if (move.vanish.length == 0) {
      this.reserve[color][move.appear[0].p]--;
      return;
    }
    if (move.vanish.length == 2) {
      if (V.PawnSpecs.promotions.includes(move.vanish[1].p))
        this.reserve[color][V.PAWN]++;
      else this.reserve[color][move.vanish[1].p]++;
    }
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = this.turn;
    if (move.vanish.length == 0) {
      this.reserve[color][move.appear[0].p]++;
      return;
    }
    if (move.vanish.length == 2) {
      if (V.PawnSpecs.promotions.includes(move.vanish[1].p))
        this.reserve[color][V.PAWN]--;
      else this.reserve[color][move.vanish[1].p]--;
    }
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
    if (move.vanish.length > 0) return super.getNotation(move);
    // Rebirth:
    let piece = move.appear[0].p;
    let prefix = "";
    const endNotation = "@" + V.CoordsToSquare(move.end);
    if (piece != V.PAWN) {
      if (ChessRules.PIECES.includes(piece)) prefix = piece.toUpperCase();
      else piece = V.PromotionMap[piece].toUpperCase();
    }
    return prefix + endNotation;
  }

};
