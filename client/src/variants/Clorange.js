import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export class ClorangeRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      // TODO: pawns reaching last rank promote normally? Seems better
      { promotions: [V.PAWN] }
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{20,20}$/))
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

  static GenRandInitFen(randomness) {
    // Capturing and non-capturing reserves:
    return ChessRules.GenRandInitFen(randomness) + " 00000000000000000000";
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
      // TODO: adapt
      counts[i] = this.reserve["w"][V.PIECES[i]];
      counts[5 + i] = this.reserve["b"][V.PIECES[i]];
    }
    return counts.join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const fenParsed = V.ParseFen(fen);
    // Also init reserves (used by the interface to show landable pieces)
    // TODO: adapt
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

  getReservePpath(index, color) {
    return color + V.RESERVE_PIECES[index];
  }

  static get NON_VIOLENT() {
    return ['s', 'u', 'o', 'c', 't', 'l'];
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return ChessRules.PIECES.concat(V.NON_VIOLENT);
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

  // TODO: adapt all below:
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
    // Skip castle:
    if (move.vanish.length == 2 && move.appear.length == 2) return;
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
