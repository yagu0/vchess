import { ChessRules, PiPo, Move } from "@/base_rules";

export class ParachuteRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{12,12}$/))
      return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { reserve: fenParts[4] }
    );
  }

  static GenRandInitFen() {
    // ChessRules.PIECES order is P, R, N, B, Q, K:
    return "8/8/8/8/8/8/8/8 w 0 - 822211822211";
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    let counts = new Array(12);
    for (let i = 0; i < V.PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.PIECES[i]];
      counts[6 + i] = this.reserve["b"][V.PIECES[i]];
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
        [V.QUEEN]: parseInt(fenParsed.reserve[4]),
        [V.KING]: parseInt(fenParsed.reserve[5])
      },
      b: {
        [V.PAWN]: parseInt(fenParsed.reserve[6]),
        [V.ROOK]: parseInt(fenParsed.reserve[7]),
        [V.KNIGHT]: parseInt(fenParsed.reserve[8]),
        [V.BISHOP]: parseInt(fenParsed.reserve[9]),
        [V.QUEEN]: parseInt(fenParsed.reserve[10]),
        [V.KING]: parseInt(fenParsed.reserve[11])
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

  // Ordering on reserve pieces (matching V.PIECES order)
  static get RESERVE_PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.KING];
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    let boundary =
      p == V.PAWN
        // Pawns can land only on 4 first ranks:
        ? (color == 'w' ? [4, 8] : [0, 4])
        : [0, 8];
    for (let i = boundary[0]; i < boundary[1]; i++) {
      for (let j = 0; j < 8; j++) {
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
          this.play(mv);
          // Landing with check is forbidden:
          if (!this.underCheck(oppCol)) moves.push(mv);
          this.undo(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    let moves =
      x >= 8
        ? this.getReserveMoves([x, y])
        : super.getPotentialMovesFrom([x, y]);
    // Forbid captures if king not landed yet:
    if (x < 8 && moves.length > 0 && this.kingPos[moves[0].appear[0].c][0] < 0)
      moves = moves.filter(m => m.vanish.length == 1);
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

  isAttacked(sq, color) {
    // While the king hasn't landed, nothing is attacked:
    if (this.kingPos[color][0] < 0) return false;
    return super.isAttacked(sq, color);
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

  prePlay(move) {
    super.prePlay(move);
    if (move.vanish.length == 0) this.reserve[this.turn][move.appear[0].p]--;
  }

  postUndo(move) {
    if (move.vanish.length == 0) this.reserve[this.turn][move.appear[0].p]++;
    // (Potentially) Reset king position
    if (move.appear[0].p == V.KING) {
      const c = move.appear[0].c;
      if (move.vanish.length == 0)
        // Landing king
        this.kingPos[c] = [-1, -1];
      else
        // King movement
        this.kingPos[c] = [move.start.x, move.start.y];
    }
  }

  static get SEARCH_DEPTH() {
    return 1;
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
    // Parachutage:
    const piece =
      move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
    return piece + "@" + V.CoordsToSquare(move.end);
  }
};
