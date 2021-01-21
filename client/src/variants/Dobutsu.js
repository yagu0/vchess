import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { sample, shuffle } from "@/utils/alea";

export class DobutsuRules extends ChessRules {

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

  static get ELEPHANT() {
    return "e";
  }
  static get GIRAFFE() {
    return "g";
  }
  static get HEN() {
    return "h";
  }

  static get PIECES() {
    return [
      ChessRules.PAWN,
      ChessRules.KING,
      V.ELEPHANT,
      V.GIRAFFE,
      V.HEN
    ];
  }

  getPpath(b, color, score, orientation) {
    // 'i' for "inversed":
    const suffix = (b[0] == orientation ? "" : "i");
    return "Dobutsu/" + b + suffix;
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
    return "gke/1p1/1P1/EKG w 0 00000000";
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    let counts = new Array(6);
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.RESERVE_PIECES[i]];
      counts[3 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
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
        [V.ELEPHANT]: reserve[1],
        [V.GIRAFFE]: reserve[2]
      },
      b: {
        [V.PAWN]: reserve[3],
        [V.ELEPHANT]: reserve[4],
        [V.GIRAFFE]: reserve[5]
      }
    };
  }

  // Goal is to capture the king, easier to not track kings
  scanKings() {}

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  static get size() {
    return { x: 4, y: 3};
  }

  getReservePpath(index, color, orientation) {
    return (
      "Dobutsu/" + color + V.RESERVE_PIECES[index] +
      (color != orientation ? 'i' : '')
    );
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return (
      // No king, since the goal is to capture it
      [V.PAWN, V.ELEPHANT, V.GIRAFFE]
    );
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    for (let i = 0; i < V.size.x; i++) {
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

  getPotentialMovesFrom(sq) {
    if (sq[0] >= V.size.x) {
      // Reserves, outside of board: x == sizeX(+1)
      return this.getReserveMoves(sq);
    }
    switch (this.getPiece(sq[0], sq[1])) {
      case V.PAWN: return this.getPotentialPawnMoves(sq);
      case V.HEN: return this.getPotentialHenMoves(sq);
      case V.ELEPHANT: return this.getPotentialElephantMoves(sq);
      case V.GIRAFFE: return this.getPotentialGiraffeMoves(sq);
      case V.KING: return super.getPotentialKingMoves(sq);
    }
    return []; //never reached
  }

  getPotentialPawnMoves([x, y]) {
    const c = this.turn;
    const beforeLastRank = (c == 'w' ? 1 : 2);
    const forward = (c == 'w' ? -1 : 1);
    if (!V.OnBoard(x + forward, y)) return []; //stuck pawn
    if (
      this.board[x + forward][y] == V.EMPTY ||
      this.getColor(x + forward, y) != c
    ) {
      const tr = (x == beforeLastRank ? { p: V.HEN, c: c } : null);
      return [super.getBasicMove([x, y], [x + forward, y], tr)];
    }
  }

  getPotentialHenMoves(sq) {
    const c = this.turn;
    const forward = (c == 'w' ? -1 : 1);
    const steps = V.steps[V.ROOK].concat([[forward, 1], [forward, -1]]);
    return super.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialElephantMoves(sq) {
    return super.getSlideNJumpMoves(sq, V.steps[V.BISHOP], "oneStep");
  }

  getPotentialGiraffeMoves(sq) {
    return super.getSlideNJumpMoves(sq, V.steps[V.ROOK], "oneStep");
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    const color = this.turn;
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      moves = moves.concat(
        this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
      );
    }
    return moves;
  }

  // Goal is to capture the king:
  isAttacked() {
    return false;
  }
  filterValid(moves) {
    return moves;
  }
  getCheckSquares() {
    return [];
  }

  static MayDecode(piece) {
    if (piece == V.HEN) return V.PAWN;
    return piece;
  }

  postPlay(move) {
    const color = move.appear[0].c;
    if (move.vanish.length == 0)
      // Drop unpromoted piece:
      this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2)
      // May capture a promoted piece:
      this.reserve[color][V.MayDecode(move.vanish[1].p)]++;
  }

  postUndo(move) {
    const color = this.turn;
    if (move.vanish.length == 0)
      this.reserve[color][move.appear[0].p]++;
    else if (move.vanish.length == 2)
      this.reserve[color][V.MayDecode(move.vanish[1].p)]--;
  }

  getCurrentScore() {
    const c = this.turn;
    if (this.board.every(row => row.every(cell => cell != c + 'k')))
      return (c == 'w' ? "0-1" : "1-0");
    const oppCol = V.GetOppCol(c);
    const oppLastRank = (c == 'w' ? 3 : 0);
    for (let j=0; j < V.size.y; j++) {
      if (this.board[oppLastRank][j] == oppCol + 'k')
        return (oppCol == 'w' ? "1-0" : "0-1");
    }
    return "*";
  }

  static get SEARCH_DEPTH() {
    return 4;
  }

  static get VALUES() {
    // NOTE: very arbitrary
    return {
      p: 1,
      h: 4,
      g: 3,
      e: 2,
      k: 1000
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
