import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export class ShogunRules extends ChessRules {

  static get CAPTAIN() {
    return 'c';
  }
  static get GENERAL() {
    return 'g';
  }
  static get ARCHBISHOP() {
    return 'a';
  }
  static get MORTAR() {
    return 'm';
  }
  static get DUCHESS() {
    return 'f';
  }

  static get PIECES() {
    return (
      ChessRules.PIECES
      .concat([V.CAPTAIN, V.GENERAL, V.ARCHBISHOP, V.MORTAR, V.DUCHESS])
    );
  }

  getPpath(b) {
    return "Shogun/" + b;
  }

  getReservePpath(index, color) {
    return "Shogun/" + color + V.RESERVE_PIECES[index];
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
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.RESERVE_PIECES[i]];
      counts[5 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
    }
    return counts.join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Also init reserves (used by the interface to show landable pieces)
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        [V.PAWN]: reserve[0],
        [V.ROOK]: reserve[1],
        [V.KNIGHT]: reserve[2],
        [V.BISHOP]: reserve[3],
        [V.DUCHESS]: reserve[4]
      },
      b: {
        [V.PAWN]: reserve[5],
        [V.ROOK]: reserve[6],
        [V.KNIGHT]: reserve[7],
        [V.BISHOP]: reserve[8],
        [V.DUCHESS]: reserve[9]
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

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.DUCHESS];
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const iZone = (color == 'w' ? [3, 4, 5, 6, 7] : [0, 1, 2, 3, 4]);
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    for (let i of iZone) {
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

  static get MapUnpromoted() {
    return {
      f: 'q',
      r: 'm',
      b: 'a',
      p: 'c',
      n: 'g'
    };
  }

  getPotentialMovesFrom([x, y]) {
    if (x >= V.size.x)
      // Reserves, outside of board: x == sizeX(+1)
      return this.getReserveMoves([x, y]);
    // Standard moves
    const piece = this.getPiece(x, y);
    const sq = [x, y];
    if (piece == V.KING) return super.getPotentialKingMoves(sq);
    let moves = [];
    switch (piece) {
      // Unpromoted
      case V.PAWN:
        return this.getPotentialPawnMoves(sq);
      case V.ROOK:
        moves = super.getPotentialRookMoves(sq);
        break;
      case V.KNIGHT:
        moves = super.getPotentialKnightMoves(sq);
        break;
      case V.BISHOP:
        moves = super.getPotentialBishopMoves(sq);
        break;
      case V.DUCHESS:
        moves = this.getPotentialDuchessMoves(sq);
        break;
    }
    if ([V.ROOK, V.KNIGHT, V.BISHOP, V.DUCHESS].includes(piece)) {
      let extraMoves = [];
      // Check that no promoted form is already on board:
      const promotedForm = V.MapUnpromoted[piece];
      const c = this.turn;
      if (
        this.board.some(b =>
          b.some(cell =>
            cell[0] == c && cell[1] == promotedForm)
        )
      ) {
        return moves;
      }
      const promotionZone = (this.turn == 'w' ? [0, 1, 2] : [5, 6, 7]);
      moves.forEach(m => {
        if (
          promotionZone.includes(m.end.x) ||
          promotionZone.includes(m.start.x)
        ) {
          let newMove = JSON.parse(JSON.stringify(m));
          newMove.appear[0].p = promotedForm;
          extraMoves.push(newMove);
        }
      });
      return moves.concat(extraMoves);
    }
    switch (piece) {
      // Promoted
      case V.CAPTAIN: return this.getPotentialCaptainMoves(sq);
      case V.MORTAR: return this.getPotentialMortarMoves(sq);
      case V.GENERAL: return this.getPotentialGeneralMoves(sq);
      case V.ARCHBISHOP: return this.getPotentialArchbishopMoves(sq);
      case V.QUEEN: return super.getPotentialQueenMoves(sq);
    }
    return []; //never reached
  }

  getPotentialPawnMoves([x, y]) {
    // NOTE: apply promotion freely, but not on en-passant
    const c = this.turn;
    const oppCol = V.GetOppCol(c);
    const forward = (c == 'w' ? -1 : 1);
    const initialRank = (c == 'w' ? 6 : 1);
    let moves = [];
    // Pawn push
    let [i, j] = [x + forward, y];
    if (this.board[i][j] == V.EMPTY) {
      moves.push(this.getBasicMove([x, y], [i, j]));
      if (x == initialRank && this.board[i + forward][j] == V.EMPTY)
        moves.push(this.getBasicMove([x, y], [i + forward, j]));
    }
    // Captures
    for (let shiftY of [-1, 1]) {
      [i, j] = [x + forward, y + shiftY];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
      }
    }
    let extraMoves = [];
    const promotionZone = (this.turn == 'w' ? [1, 2] : [5, 6]);
    const lastRank = (c == 'w' ? 0 : 7);
    moves.forEach(m => {
      if (m.end.x == lastRank)
        // Force promotion
        m.appear[0].p = V.CAPTAIN;
      else if (promotionZone.includes(m.end.x)) {
        let newMove = JSON.parse(JSON.stringify(m));
        newMove.appear[0].p = V.CAPTAIN;
        extraMoves.push(newMove);
      }
    });
    return (
      moves.concat(extraMoves)
      .concat(super.getEnpassantCaptures([x, y], forward))
    );
  }

  getPotentialDuchessMoves(sq) {
    return super.getSlideNJumpMoves(sq, V.steps[V.BISHOP], "oneStep");
  }

  getPotentialCaptainMoves(sq) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return super.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialMortarMoves(sq) {
    return (
      super.getSlideNJumpMoves(sq, V.steps[V.ROOK])
      .concat(super.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"))
    );
  }

  getPotentialGeneralMoves(sq) {
    const steps =
      V.steps[V.BISHOP].concat(V.steps[V.ROOK]).concat(V.steps[V.KNIGHT]);
    return super.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialArchbishopMoves(sq) {
    return (
      super.getSlideNJumpMoves(sq, V.steps[V.BISHOP])
      .concat(super.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"))
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByDuchess(sq, color) ||
      this.isAttackedByCaptain(sq, color) ||
      this.isAttackedByMortar(sq, color) ||
      this.isAttackedByGeneral(sq, color) ||
      this.isAttackedByArchbishop(sq, color)
    );
  }

  isAttackedByDuchess(sq, color) {
    return (
      super.isAttackedBySlideNJump(
        sq, color, V.DUCHESS, V.steps[V.BISHOP], "oneStep")
    );
  }

  isAttackedByCaptain(sq, color) {
    const steps = V.steps[V.BISHOP].concat(V.steps[V.ROOK]);
    return (
      super.isAttackedBySlideNJump(sq, color, V.DUCHESS, steps, "oneStep")
    );
  }

  isAttackedByMortar(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.MORTAR, V.steps[V.ROOK]) ||
      super.isAttackedBySlideNJump(
        sq, color, V.MORTAR, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedByGeneral(sq, color) {
    const steps =
      V.steps[V.BISHOP].concat(V.steps[V.ROOK]).concat(V.steps[V.KNIGHT]);
    return (
      super.isAttackedBySlideNJump(sq, color, V.GENERAL, steps, "oneStep")
    );
  }

  isAttackedByArchbishop(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.ARCHBISHOP, V.steps[V.BISHOP])
      ||
      super.isAttackedBySlideNJump(
        sq, color, V.ARCHBISHOP, V.steps[V.KNIGHT], "oneStep")
    );
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

  static get MapPromoted() {
    return {
      q: 'f',
      m: 'r',
      a: 'b',
      c: 'p',
      g: 'n'
    };
  }

  getUnpromotedForm(piece) {
    if (Object.keys(V.MapPromoted).includes(piece))
      return V.MapPromoted[piece];
    return piece;
  }

  postPlay(move) {
    super.postPlay(move);
    // Skip castle:
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = move.appear[0].c;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2)
      this.reserve[color][this.getUnpromotedForm(move.vanish[1].p)]++;
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = this.turn;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]++;
    else if (move.vanish.length == 2)
      this.reserve[color][this.getUnpromotedForm(move.vanish[1].p)]--;
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return (
      Object.assign(
        {
          c: 4,
          g: 5,
          a: 7,
          m: 7,
          f: 2
        },
        ChessRules.VALUES
      )
    );
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
    const piece =
      move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
    return piece + "@" + V.CoordsToSquare(move.end);
  }

};
