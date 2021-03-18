import { ChessRules, PiPo, Move } from "@/base_rules";

export class ShinobiRules extends ChessRules {

  static get LoseOnRepetition() {
    return true;
  }

  static get CAPTAIN() {
    return 'c';
  }
  static get NINJA() {
    return 'j';
  }
  static get SAMURAI() {
    return 's';
  }
  static get MONK() {
    return 'm';
  }
  static get HORSE() {
    return 'h';
  }
  static get LANCE() {
    return 'l';
  }

  static IsGoodFlags(flags) {
    // Only black can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  static get PIECES() {
    return (
      ChessRules.PIECES
      .concat([V.CAPTAIN, V.NINJA, V.SAMURAI, V.MONK, V.HORSE, V.LANCE])
    );
  }

  getPpath(b) {
    if (b[0] == 'b' && b[1] != 'c') return b;
    return "Shinobi/" + b;
  }

  getReservePpath(index, color) {
    return "Shinobi/" + color + V.RESERVE_PIECES[index];
  }

  getFlagsFen() {
    return this.castleFlags['b'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'b': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['b'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check reserve
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{6,6}$/))
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

  // In hand initially: captain, ninja, samurai + 2 x monk, horse, lance.
  static GenRandInitFen(randomness) {
    const baseFen = ChessRules.GenRandInitFen(Math.min(randomness, 1));
    return (
      baseFen.substr(0, 35) + "3CK3 " +
      "w 0 " + baseFen.substr(48, 2) + " - 111222"
    );
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    // TODO: can simplify other drops variants with this code:
    return Object.values(this.reserve['w']).join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        [V.CAPTAIN]: reserve[0],
        [V.NINJA]: reserve[1],
        [V.SAMURAI]: reserve[2],
        [V.MONK]: reserve[3],
        [V.HORSE]: reserve[4],
        [V.LANCE]: reserve[5]
      }
    };
  }

  getColor(i, j) {
    if (i >= V.size.x) return 'w';
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  static get RESERVE_PIECES() {
    return [V.CAPTAIN, V.NINJA, V.SAMURAI, V.MONK, V.HORSE, V.LANCE];
  }

  getReserveMoves([x, y]) {
    // color == 'w', no drops for black.
    const p = V.RESERVE_PIECES[y];
    if (this.reserve['w'][p] == 0) return [];
    let moves = [];
    for (let i of [4, 5, 6, 7]) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: 'w',
                p: p
              })
            ],
            vanish: [],
            start: { x: x, y: y },
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
      m: 'b',
      h: 'n',
      l: 'r',
      p: 'c'
    };
  }

  getPotentialMovesFrom([x, y]) {
    if (x >= V.size.x) {
      // Reserves, outside of board: x == sizeX(+1)
      if (this.turn == 'b') return [];
      return this.getReserveMoves([x, y]);
    }
    // Standard moves
    const piece = this.getPiece(x, y);
    const sq = [x, y];
    if ([V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN].includes(piece))
      return super.getPotentialMovesFrom(sq);
    switch (piece) {
      case V.KING: return super.getPotentialKingMoves(sq);
      case V.CAPTAIN: return this.getPotentialCaptainMoves(sq);
      case V.NINJA: return this.getPotentialNinjaMoves(sq);
      case V.SAMURAI: return this.getPotentialSamuraiMoves(sq);
    }
    let moves = [];
    switch (piece) {
      // Unpromoted
      case V.PAWN:
        moves = super.getPotentialPawnMoves(sq);
        break;
      case V.MONK:
        moves = this.getPotentialMonkMoves(sq);
        break;
      case V.HORSE:
        moves = this.getPotentialHorseMoves(sq);
        break;
      case V.LANCE:
        moves = this.getPotentialLanceMoves(sq);
        break;
    }
    const promotionZone = (this.turn == 'w' ? [0, 1, 2] : [5, 6, 7]);
    const promotedForm = V.MapUnpromoted[piece];
    moves.forEach(m => {
      if (promotionZone.includes(m.end.x)) m.appear[0].p = promotedForm;
    });
    return moves;
  }

  getPotentialKingMoves([x, y]) {
    if (this.getColor(x, y) == 'b') return super.getPotentialKingMoves([x, y]);
    // Clan doesn't castle:
    return super.getSlideNJumpMoves(
      [x, y],
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  getPotentialCaptainMoves(sq) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return super.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialNinjaMoves(sq) {
    return (
      super.getSlideNJumpMoves(sq, V.steps[V.BISHOP])
      .concat(super.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"))
    );
  }

  getPotentialSamuraiMoves(sq) {
    return (
      super.getSlideNJumpMoves(sq, V.steps[V.ROOK])
      .concat(super.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"))
    );
  }

  getPotentialMonkMoves(sq) {
    return super.getSlideNJumpMoves(sq, V.steps[V.BISHOP], "oneStep");
  }

  getPotentialHorseMoves(sq) {
    return super.getSlideNJumpMoves(sq, [ [-2, 1], [-2, -1] ], "oneStep");
  }

  getPotentialLanceMoves(sq) {
    return super.getSlideNJumpMoves(sq, [ [-1, 0] ]);
  }

  isAttacked(sq, color) {
    if (color == 'b')
      return (super.isAttacked(sq, 'b') || this.isAttackedByCaptain(sq, 'b'));
    // Attacked by white:
    return (
      super.isAttackedByKing(sq, 'w') ||
      this.isAttackedByCaptain(sq, 'w') ||
      this.isAttackedByNinja(sq, 'w') ||
      this.isAttackedBySamurai(sq, 'w') ||
      this.isAttackedByMonk(sq, 'w') ||
      this.isAttackedByHorse(sq, 'w') ||
      this.isAttackedByLance(sq, 'w') ||
      super.isAttackedByBishop(sq, 'w') ||
      super.isAttackedByKnight(sq, 'w') ||
      super.isAttackedByRook(sq, 'w')
    );
  }

  isAttackedByCaptain(sq, color) {
    const steps = V.steps[V.BISHOP].concat(V.steps[V.ROOK]);
    return (
      super.isAttackedBySlideNJump(sq, color, V.CAPTAIN, steps, "oneStep")
    );
  }

  isAttackedByNinja(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.NINJA, V.steps[V.BISHOP]) ||
      super.isAttackedBySlideNJump(
        sq, color, V.NINJA, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedBySamurai(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.SAMURAI, V.steps[V.ROOK]) ||
      super.isAttackedBySlideNJump(
        sq, color, V.SAMURAI, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedByMonk(sq, color) {
    return (
      super.isAttackedBySlideNJump(
        sq, color, V.MONK, V.steps[V.BISHOP], "oneStep")
    );
  }

  isAttackedByHorse(sq, color) {
    return (
      super.isAttackedBySlideNJump(
        sq, color, V.HORSE, [ [2, 1], [2, -1] ], "oneStep")
    );
  }

  isAttackedByLance(sq, color) {
    return super.isAttackedBySlideNJump(sq, color, V.LANCE, [ [1, 0] ]);
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    if (this.turn == 'w') {
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        moves = moves.concat(
          this.getReserveMoves([V.size.x, i])
        );
      }
    }
    return this.filterValid(moves);
  }

  atLeastOneMove() {
    if (super.atLeastOneMove()) return true;
    if (this.turn == 'w') {
      // Search one reserve move
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        let moves = this.filterValid(
          this.getReserveMoves([V.size.x, i])
        );
        if (moves.length > 0) return true;
      }
    }
    return false;
  }

  updateCastleFlags(move, piece) {
    // Only black can castle:
    const firstRank = 0;
    if (piece == V.KING && move.appear[0].c == 'b')
      this.castleFlags['b'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['b'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['b'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
  }

  postPlay(move) {
    super.postPlay(move);
    // Skip castle:
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = move.appear[0].c;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]--;
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = this.turn;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]++;
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getCurrentScore() {
    const color = this.turn;
    const nodrawResult = (color == "w" ? "0-1" : "1-0");
    const oppLastRank = (color == 'w' ? 7 : 0);
    if (this.kingPos[V.GetOppCol(color)][0] == oppLastRank)
      return nodrawResult;
    if (this.atLeastOneMove()) return "*";
    return nodrawResult;
  }

  static get VALUES() {
    return (
      Object.assign(
        {
          c: 4,
          j: 7,
          s: 8,
          m: 2,
          h: 2,
          l: 2
        },
        ChessRules.VALUES
      )
    );
  }

  evalPosition() {
    let evaluation = super.evalPosition();
    // Add reserve:
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      const p = V.RESERVE_PIECES[i];
      evaluation += this.reserve["w"][p] * V.VALUES[p];
    }
    return evaluation;
  }

  getNotation(move) {
    if (move.vanish.length > 0) return super.getNotation(move);
    // Drop:
    const piece =
      move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
    return piece + "@" + V.CoordsToSquare(move.end);
  }

};
