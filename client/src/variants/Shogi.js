import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export class ShogiRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 3) Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{14,14}$/))
      return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { reserve: fenParts[3] }
    );
  }

  // pawns, rooks, knights, bishops and king kept from ChessRules
  static get GOLD_G() {
    return "g";
  }
  static get SILVER_G() {
    return "s";
  }
  static get LANCER() {
    return "l";
  }

  // Promoted pieces:
  static get P_PAWN() {
    return 'q';
  }
  static get P_KNIGHT() {
    return 'o';
  }
  static get P_SILVER() {
    return 't';
  }
  static get P_LANCER() {
    return 'm';
  }
  static get P_ROOK() {
    return 'd';
  }
  static get P_BISHOP() {
    return 'h';
  }

  static get PIECES() {
    return [
      ChessRules.PAWN,
      ChessRules.ROOK,
      ChessRules.KNIGHT,
      ChessRules.BISHOP,
      ChessRules.KING,
      V.GOLD_G,
      V.SILVER_G,
      V.LANCER,
      V.P_PAWN,
      V.P_KNIGHT,
      V.P_SILVER,
      V.P_LANCER,
      V.P_ROOK,
      V.P_BISHOP
    ];
  }

  getPpath(b, color, score, orientation) {
    // 'i' for "inversed":
    const suffix = (b[0] == orientation ? "" : "i");
    return "Shogi/" + b + suffix;
  }

  getPPpath(m, orientation) {
    return (
      this.getPpath(
        m.appear[0].c + m.appear[0].p,
        null,
        null,
        orientation
      )
    );
  }

  static GenRandInitFen() {
    // No randomization for now:
    return (
      "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL " +
      "w 0 00000000000000"
    );
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    let counts = new Array(14);
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.RESERVE_PIECES[i]];
      counts[6 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
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
        [V.BISHOP]: parseInt(fenParsed.reserve[2]),
        [V.GOLD_G]: parseInt(fenParsed.reserve[3]),
        [V.SILVER_G]: parseInt(fenParsed.reserve[4]),
        [V.KNIGHT]: parseInt(fenParsed.reserve[5]),
        [V.LANCER]: parseInt(fenParsed.reserve[6])
      },
      b: {
        [V.PAWN]: parseInt(fenParsed.reserve[7]),
        [V.ROOK]: parseInt(fenParsed.reserve[8]),
        [V.BISHOP]: parseInt(fenParsed.reserve[9]),
        [V.GOLD_G]: parseInt(fenParsed.reserve[10]),
        [V.SILVER_G]: parseInt(fenParsed.reserve[11]),
        [V.KNIGHT]: parseInt(fenParsed.reserve[12]),
        [V.LANCER]: parseInt(fenParsed.reserve[13])
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

  static get size() {
    return { x: 9, y: 9};
  }

  getReservePpath(index, color, orientation) {
    return (
      "Shogi/" + color + V.RESERVE_PIECES[index] +
      (color != orientation ? 'i' : '')
    );
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return (
      [V.PAWN, V.ROOK, V.BISHOP, V.GOLD_G, V.SILVER_G, V.KNIGHT, V.LANCER]
    );
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (p == V.PAWN) {
      var oppCol = V.GetOppCol(color);
      var allowedFiles =
        [...Array(9).keys()].filter(j =>
          [...Array(9).keys()].every(i => {
            return (
              this.board[i][j] == V.EMPTY ||
              this.getColor(i, j) != color ||
              this.getPiece(i, j) != V.PAWN
            );
          })
        )
    }
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    const forward = color == 'w' ? -1 : 1;
    const lastRanks = color == 'w' ? [0, 1] : [8, 7];
    for (let i = 0; i < V.size.x; i++) {
      if (
        (i == lastRanks[0] && [V.PAWN, V.KNIGHT, V.LANCER].includes(p)) ||
        (i == lastRanks[1] && p == V.KNIGHT)
      ) {
        continue;
      }
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] == V.EMPTY &&
          (p != V.PAWN || allowedFiles.includes(j))
        ) {
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
          if (p == V.PAWN) {
            // Do not drop on checkmate:
            this.play(mv);
            const res = (this.underCheck(oppCol) && !this.atLeastOneMove());
            this.undo(mv);
            if (res) continue;
          }
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
    switch (this.getPiece(x, y)) {
      case V.PAWN:
        return this.getPotentialPawnMoves([x, y]);
      case V.ROOK:
        return this.getPotentialRookMoves([x, y]);
      case V.KNIGHT:
        return this.getPotentialKnightMoves([x, y]);
      case V.BISHOP:
        return this.getPotentialBishopMoves([x, y]);
      case V.SILVER_G:
        return this.getPotentialSilverMoves([x, y]);
      case V.LANCER:
        return this.getPotentialLancerMoves([x, y]);
      case V.KING:
        return this.getPotentialKingMoves([x, y]);
      case V.P_ROOK:
        return this.getPotentialDragonMoves([x, y]);
      case V.P_BISHOP:
        return this.getPotentialHorseMoves([x, y]);
      case V.GOLD_G:
      case V.P_PAWN:
      case V.P_SILVER:
      case V.P_KNIGHT:
      case V.P_LANCER:
        return this.getPotentialGoldMoves([x, y]);
    }
    return []; //never reached
  }

  // Modified to take promotions into account
  getSlideNJumpMoves([x, y], steps, options) {
    const options = options || {};
    const color = this.turn;
    const oneStep = options.oneStep;
    const forcePromoteOnLastRank = options.force;
    const promoteInto = options.promote;
    const lastRanks = (color == 'w' ? [0, 1, 2] : [9, 8, 7]);
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (i != lastRanks[0] || !forcePromoteOnLastRank)
          moves.push(this.getBasicMove([x, y], [i, j]));
        if (!!promoteInto && lastRanks.includes(i)) {
          moves.push(
            this.getBasicMove(
              [x, y], [i, j], { c: color, p: promoteInto })
          );
        }
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j])) {
        if (i != lastRanks[0] || !forcePromoteOnLastRank)
          moves.push(this.getBasicMove([x, y], [i, j]));
        if (!!promoteInto && lastRanks.includes(i)) {
          moves.push(
            this.getBasicMove(
              [x, y], [i, j], { c: color, p: promoteInto })
          );
        }
      }
    }
    return moves;
  }

  getPotentialGoldMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat([ [forward, 1], [forward, -1] ]),
      { oneStep: true }
    );
  }

  getPotentialPawnMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return (
      this.getSlideNJumpMoves(
        sq,
        [[forward, 0]],
        {
          oneStep: true,
          promote: V.P_PAWN,
          force: true
        }
      )
    );
  }

  getPotentialSilverMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP].concat([ [forward, 0] ]),
      {
        oneStep: true,
        promote: V.P_SILVER
      }
    );
  }

  getPotentialKnightMoves(sq) {
    const forward = (this.turn == 'w' ? -2 : 2);
    return this.getSlideNJumpMoves(
      sq,
      [ [forward, 1], [forward, -1] ],
      {
        oneStep: true,
        promote: V.P_KNIGHT,
        force: true
      }
    );
  }

  getPotentialRookMoves(sq) {
    return this.getSlideNJumpMoves(
      sq, V.steps[V.ROOK], { promote: V.P_ROOK });
  }

  getPotentialBishopMoves(sq) {
    return this.getSlideNJumpMoves(
      sq, V.steps[V.BISHOP], { promote: V.P_BISHOP });
  }

  getPotentialLancerMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return this.getSlideNJumpMoves(
      sq, [[forward, 0]], { promote: V.P_LANCER });
  }

  getPotentialDragonMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], { oneStep: true }))
    );
  }

  getPotentialHorseMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.ROOK], { oneStep: true }))
    );
  }

  getPotentialKingMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      { oneStep: true }
    );
  }

  isAttacked(sq, color) {
    return (
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByDragon(sq, color) ||
      this.isAttackedByKnight(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByHorse(sq, color) ||
      this.isAttackedByLancer(sq, color) ||
      this.isAttackedBySilver(sq, color) ||
      this.isAttackedByGold(sq, color) ||
      this.isAttackedByKing(sq, color)
    );
  }

  isAttackedByGold([x, y], color) {
    const shift = (color == 'w' ? 1 : -1);
    for (let step of V.steps[V.ROOK].concat([[shift, 1], [shift, -1]])) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color &&
        [V.GOLD_G, V.P_PAWN, V.P_SILVER, V.P_KNIGHT, V.P_LANCER]
          .includes(this.getPiece(i, j))
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedBySilver([x, y], color) {
    const shift = (color == 'w' ? 1 : -1);
    for (let step of V.steps[V.BISHOP].concat([[shift, 0]])) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.SILVER_G
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByPawn([x, y], color) {
    const shift = (color == 'w' ? 1 : -1);
    const [i, j] = [x + shift, y];
    return (
      V.OnBoard(i, j) &&
      this.board[i][j] != V.EMPTY &&
      this.getColor(i, j) == color &&
      this.getPiece(i, j) == V.PAWN
    );
  }

  isAttackedByKnight(sq, color) {
    const forward = (color == 'w' ? 2 : -2);
    return this.isAttackedBySlideNJump(
      sq, color, V.KNIGHT, [[forward, 1], [forward, -1]], "oneStep");
  }

  isAttackedByLancer(sq, color) {
    const forward = (color == 'w' ? 1 : -1);
    return this.isAttackedBySlideNJump(sq, color, V.LANCER, [[forward, 0]]);
  }

  isAttackedByDragon(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.P_ROOK, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.DRAGON, V.steps[V.BISHOP], "oneStep")
    );
  }

  isAttackedByHorse(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.P_BISHOP, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.DRAGON, V.steps[V.ROOK], "oneStep")
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

  static get P_CORRESPONDANCES() {
    return {
      q: 'p',
      o: 'n',
      t: 's',
      m: 'l',
      d: 'r',
      h: 'b'
    };
  }

  static MayDecode(piece) {
    if (Object.keys(V.P_CORRESPONDANCES).includes(piece))
      return V.P_CORRESPONDANCES[piece];
    return piece;
  }

  postPlay(move) {
    super.postPlay(move);
    const color = move.appear[0].c;
    if (move.vanish.length == 0)
      // Drop unpromoted piece:
      this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2)
      // May capture a promoted piece:
      this.reserve[color][V.MayDecode(move.vanish[1].p)]++;
  }

  postUndo(move) {
    super.postUndo(move);
    const color = this.turn;
    if (move.vanish.length == 0)
      this.reserve[color][move.appear[0].p]++;
    else if (move.vanish.length == 2)
      this.reserve[color][V.MayDecode(move.vanish[1].p)]--;
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    // TODO: very arbitrary and wrong
    return {
      p: 1,
      q: 3,
      r: 5,
      d: 6,
      n: 2,
      o: 3,
      b: 3,
      h: 4,
      s: 3,
      t: 3,
      l: 2,
      m: 3,
      g: 3,
      k: 1000,
    }
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
    if (move.vanish.length == 0) {
      // Rebirth:
      const piece = move.appear[0].p.toUpperCase();
      return (piece != 'P' ? piece : "") + "@" + finalSquare;
    }
    const piece = move.vanish[0].p.toUpperCase();
    return (
      (piece != 'P' || move.vanish.length == 2 ? piece : "") +
      (move.vanish.length == 2 ? "x" : "") +
      finalSquare +
      (
        move.appear[0].p != move.vanish[0].p
          ? "=" + move.appear[0].p.toUpperCase()
          : ""
      )
    );
  }
};
