import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { sample, shuffle } from "@/utils/alea";

export class ShogiRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get Monochrome() {
    return true;
  }

  get showFirstTurn() {
    return true;
  }

  static get Notoodark() {
    return true;
  }

  get loseOnRepetition() {
    // If current side is under check: lost
    return this.underCheck(this.turn);
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
  static get LANCE() {
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
  static get P_LANCE() {
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
      V.LANCE,
      V.P_PAWN,
      V.P_KNIGHT,
      V.P_SILVER,
      V.P_LANCE,
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

  static GenRandInitFen(options) {
    if (options.randomness == 0) {
      return (
        "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL " +
        "w 0 00000000000000"
      );
    }
    // Randomization following these indications:
    // http://www.shogi.net/shogi-l/Archive/2007/Nmar16-02.txt
    let pieces1 = { w: new Array(4), b: new Array(4) };
    let positions2 = { w: new Array(2), b: new Array(2) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces1['b'] = JSON.parse(JSON.stringify(pieces1['w'])).reverse();
        positions2['b'] =
          JSON.parse(JSON.stringify(positions2['w'])).reverse()
          .map(p => 8 - p);
        break;
      }
      let positions = shuffle(ArrayFun.range(4));
      const composition = ['s', 's', 'g', 'g'];
      for (let i = 0; i < 4; i++) pieces1[c][positions[i]] = composition[i];
      positions2[c] = sample(ArrayFun.range(9), 2).sort();
    }
    return (
      (
        "ln" +
        pieces1["b"].slice(0, 2).join("") +
        "k" +
        pieces1["b"].slice(2, 4).join("") +
        "nl/"
      ) +
      (
        (positions2['b'][0] || "") + 'r' +
        (positions2['b'][1] - positions2['b'][0] - 1 || "") + 'b' +
        (8 - positions2['b'][1] || "")
      ) +
      "/ppppppppp/9/9/9/PPPPPPPPP/" +
      (
        (positions2['w'][0] || "") + 'B' +
        (positions2['w'][1] - positions2['w'][0] - 1 || "") + 'R' +
        (8 - positions2['w'][1] || "")
      ) +
      (
        "/LN" +
        pieces1["w"].slice(0, 2).join("").toUpperCase() +
        "K" +
        pieces1["w"].slice(2, 4).join("").toUpperCase() +
        "NL"
      ) +
      " w 0 00000000000000"
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
      counts[7 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
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
        [V.BISHOP]: reserve[2],
        [V.GOLD_G]: reserve[3],
        [V.SILVER_G]: reserve[4],
        [V.KNIGHT]: reserve[5],
        [V.LANCE]: reserve[6]
      },
      b: {
        [V.PAWN]: reserve[7],
        [V.ROOK]: reserve[8],
        [V.BISHOP]: reserve[9],
        [V.GOLD_G]: reserve[10],
        [V.SILVER_G]: reserve[11],
        [V.KNIGHT]: reserve[12],
        [V.LANCE]: reserve[13]
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
      [V.PAWN, V.ROOK, V.BISHOP, V.GOLD_G, V.SILVER_G, V.KNIGHT, V.LANCE]
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
        (i == lastRanks[0] && [V.PAWN, V.KNIGHT, V.LANCE].includes(p)) ||
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
            const res = (
              this.underCheck(oppCol) && !this.atLeastOneMove("noReserve")
            );
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
      case V.LANCE:
        return this.getPotentialLanceMoves([x, y]);
      case V.KING:
        return super.getPotentialKingMoves([x, y]);
      case V.P_ROOK:
        return this.getPotentialDragonMoves([x, y]);
      case V.P_BISHOP:
        return this.getPotentialHorseMoves([x, y]);
      case V.GOLD_G:
      case V.P_PAWN:
      case V.P_SILVER:
      case V.P_KNIGHT:
      case V.P_LANCE:
        return this.getPotentialGoldMoves([x, y]);
    }
    return []; //never reached
  }

  // Modified to take promotions into account
  getSlideNJumpMoves_opt([x, y], steps, options) {
    options = options || {};
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
    return this.getSlideNJumpMoves_opt(
      sq,
      V.steps[V.ROOK].concat([ [forward, 1], [forward, -1] ]),
      { oneStep: true }
    );
  }

  getPotentialPawnMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return (
      this.getSlideNJumpMoves_opt(
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
    return this.getSlideNJumpMoves_opt(
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
    return this.getSlideNJumpMoves_opt(
      sq,
      [ [forward, 1], [forward, -1] ],
      {
        oneStep: true,
        promote: V.P_KNIGHT,
        force: true
      }
    );
  }

  getPotentialLanceMoves(sq) {
    const forward = (this.turn == 'w' ? -1 : 1);
    return this.getSlideNJumpMoves_opt(
      sq,
      [ [forward, 0] ],
      {
        promote: V.P_LANCE,
        force: true
      }
    );
  }

  getPotentialRookMoves(sq) {
    return this.getSlideNJumpMoves_opt(
      sq, V.steps[V.ROOK], { promote: V.P_ROOK });
  }

  getPotentialBishopMoves(sq) {
    return this.getSlideNJumpMoves_opt(
      sq, V.steps[V.BISHOP], { promote: V.P_BISHOP });
  }

  getPotentialDragonMoves(sq) {
    return (
      this.getSlideNJumpMoves_opt(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves_opt(sq, V.steps[V.BISHOP], { oneStep: true }))
    );
  }

  getPotentialHorseMoves(sq) {
    return (
      this.getSlideNJumpMoves_opt(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves_opt(sq, V.steps[V.ROOK], { oneStep: true }))
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
      this.isAttackedByLance(sq, color) ||
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
        [V.GOLD_G, V.P_PAWN, V.P_SILVER, V.P_KNIGHT, V.P_LANCE]
          .includes(this.getPiece(i, j))
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedBySilver(sq, color) {
    const shift = (color == 'w' ? 1 : -1);
    return this.isAttackedBySlideNJump(
      sq, color, V.SILVER, V.steps[V.BISHOP].concat([ [shift, 0] ]), 1);
  }

  isAttackedByPawn(sq, color) {
    const shift = (color == 'w' ? 1 : -1);
    return this.isAttackedBySlideNJump(sq, color, V.PAWN, [ [shift, 0] ], 1);
  }

  isAttackedByKnight(sq, color) {
    const forward = (color == 'w' ? 2 : -2);
    return this.isAttackedBySlideNJump(
      sq, color, V.KNIGHT, [ [forward, 1], [forward, -1] ], 1);
  }

  isAttackedByLance(sq, color) {
    const forward = (color == 'w' ? 1 : -1);
    return this.isAttackedBySlideNJump(sq, color, V.LANCE, [[forward, 0]]);
  }

  isAttackedByDragon(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.P_ROOK, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(sq, color, V.P_ROOK, V.steps[V.BISHOP], 1)
    );
  }

  isAttackedByHorse(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.P_BISHOP, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(sq, color, V.P_BISHOP, V.steps[V.ROOK], 1)
    );
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    const lastRanks = (color == 'w' ? [0, 1] : [8, 7]);
    return moves.filter(m => {
      if (
        (m.appear[0].p == V.KNIGHT && lastRanks.includes(m.end.x)) ||
        ([V.PAWN, V.LANCE].includes(m.appear[0].p) && lastRanks[0] == m.end.x)
      ) {
        // Forbid moves resulting in a blocked piece
        return false;
      }
      this.play(m);
      const res = !this.underCheck(color);
      this.undo(m);
      return res;
    });
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

  atLeastOneMove(noReserve) {
    if (!super.atLeastOneMove()) {
      if (!noReserve) {
        // Search one reserve move
        for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
          let moves = this.filterValid(
            this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
          );
          if (moves.length > 0) return true;
        }
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
