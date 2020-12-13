import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class OrdaRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.QUEEN, V.KHESHIG] }
    );
  }

  static IsGoodFlags(flags) {
    // Only white can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  getPpath(b) {
    if (b[0] == 'b' || b[1] == 'h')
      // Horde piece or white promoted pawn in kheshig
      return "Orda/" + b;
    return b;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "lhaykahl/8/pppppppp/8/8/8/PPPPPPPP/RNBQKBNR w 0 ah -";

    // Mapping kingdom --> horde:
    const piecesMap = {
      'r': 'l',
      'n': 'h',
      'b': 'a',
      'q': 'y',
      'k': 'k'
    };

    const baseFen = ChessRules.GenRandInitFen(randomness);
    return (
      baseFen.substr(0, 8).split('').map(p => piecesMap[p]).join('') +
      // Skip 3 first rows + black castle flags
      "/8/pppppppp" + baseFen.substr(19, 31) + " -"
    );
  }

  getFlagsFen() {
    return this.castleFlags['w'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'w': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['w'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  static get LANCER() {
    return 'l';
  }
  static get ARCHER() {
    return 'a';
  }
  static get KHESHIG() {
    return 'h';
  }
  static get YURT() {
    return 'y';
  }
  // Khan is technically a King, so let's keep things simple.

  static get PIECES() {
    return ChessRules.PIECES.concat([V.LANCER, V.ARCHER, V.KHESHIG, V.YURT]);
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.LANCER:
        return this.getPotentialLancerMoves([x, y]);
      case V.ARCHER:
        return this.getPotentialArcherMoves([x, y]);
      case V.KHESHIG:
        return this.getPotentialKheshigMoves([x, y]);
      case V.YURT:
        return this.getPotentialYurtMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
    return [];
  }

  getSlideNJumpMoves([x, y], steps, oneStep, options) {
    options = options || {};
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (!options.onlyTake) moves.push(this.getBasicMove([x, y], [i, j]));
        if (!!oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]) && !options.onlyMove)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialLancerMoves(sq) {
    const onlyMoves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.KNIGHT],
      "oneStep",
      { onlyMove: true }
    );
    const onlyTakes = this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK],
      null,
      { onlyTake: true }
    );
    return onlyMoves.concat(onlyTakes);
  }

  getPotentialArcherMoves(sq) {
    const onlyMoves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.KNIGHT],
      "oneStep",
      { onlyMove: true }
    );
    const onlyTakes = this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP],
      null,
      { onlyTake: true }
    );
    return onlyMoves.concat(onlyTakes);
  }

  getPotentialKheshigMoves(sq) {
    return super.getSlideNJumpMoves(
      sq,
      V.steps[V.KNIGHT].concat(V.steps[V.ROOK]).concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  getPotentialYurtMoves(sq) {
    return super.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP].concat([ [1, 0] ]),
      "oneStep"
    );
  }

  getPotentialKingMoves([x, y]) {
    if (this.getColor(x, y) == 'w') return super.getPotentialKingMoves([x, y]);
    // Horde doesn't castle:
    return super.getSlideNJumpMoves(
      [x, y],
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttacked(sq, color) {
    if (color == 'w') {
      return (
        super.isAttacked(sq, color) ||
        this.isAttackedByKheshig(sq, color)
      );
    }
    // Horde: only pawn, king and queen (if promotions) in common:
    return (
      super.isAttackedByPawn(sq, color) ||
      this.isAttackedByLancer(sq, color) ||
      this.isAttackedByKheshig(sq, color) ||
      this.isAttackedByArcher(sq, color) ||
      this.isAttackedByYurt(sq, color) ||
      super.isAttackedByKing(sq, color) ||
      super.isAttackedByQueen(sq, color)
    );
  }

  isAttackedByLancer(sq, color) {
    return this.isAttackedBySlideNJump(sq, color, V.LANCER, V.steps[V.ROOK]);
  }

  isAttackedByArcher(sq, color) {
    return this.isAttackedBySlideNJump(sq, color, V.ARCHER, V.steps[V.BISHOP]);
  }

  isAttackedByKheshig(sq, color) {
    return super.isAttackedBySlideNJump(
      sq,
      color,
      V.KHESHIG,
      V.steps[V.KNIGHT].concat(V.steps[V.ROOK]).concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttackedByYurt(sq, color) {
    return super.isAttackedBySlideNJump(
      sq,
      color,
      V.YURT,
      V.steps[V.BISHOP].concat([ [1, 0] ]),
      "oneStep"
    );
  }

  updateCastleFlags(move, piece) {
    // Only white can castle:
    const firstRank = 7;
    if (piece == V.KING && move.appear[0].c == 'w')
      this.castleFlags['w'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['w'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['w'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
  }

  getCurrentScore() {
    // Turn has changed:
    const color = V.GetOppCol(this.turn);
    const lastRank = (color == 'w' ? 0 : 7);
    if (this.kingPos[color][0] == lastRank)
      // The opposing edge is reached!
      return color == "w" ? "1-0" : "0-1";
    if (this.atLeastOneMove()) return "*";
    // Game over
    const oppCol = this.turn;
    if (!this.underCheck(oppCol)) return "1/2";
    return (oppCol == "w" ? "0-1" : "1-0");
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        y: 2,
        a: 4,
        h: 7,
        l: 4
      }
    );
  }

};
