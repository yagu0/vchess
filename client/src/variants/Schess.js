import { ChessRules, PiPo } from "@/base_rules";

export class SchessRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        promotions:
          ChessRules.PawnSpecs.promotions.concat([V.HAWK, V.ELEPHANT])
      }
    );
  }

  static get HAWK() {
    return 'h';
  }

  static get ELEPHANT() {
    return 'e';
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.HAWK, V.ELEPHANT]);
  }

  getPpath(b) {
    if ([V.HAWK, V.ELEPHANT].includes(b[1])) return "Schess/" + b;
    return b;
  }

  // TODO: maybe changes could be done to this method to show "empty"
  // instead of a piece to not use a pocket piece...
//  getPPpath(b) { }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // Check pocket state
    if (!fenParsed.pocket || !fenParsed.pocket.match(/^[0-1]{4,4}$/))
      return false;
    return true;
  }

  static IsGoodFlags(flags) {
    // 4 for castle + 16 for generators
    return !!flags.match(/^[a-z]{4,4}[01]{16,16}$/);
  }

  setFlags(fenflags) {
    super.setFlags(fenflags); //castleFlags
    this.pieceFlags = {
      w: [...Array(8)], //pawns can move 2 squares?
      b: [...Array(8)]
    };
    const flags = fenflags.substr(4); //skip first 4 letters, for castle
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        this.pieceFlags[c][i] = flags.charAt((c == "w" ? 0 : 8) + i) == "1";
    }
  }

  aggregateFlags() {
    return [this.castleFlags, this.pieceFlags];
  }

  disaggregateFlags(flags) {
    this.castleFlags = flags[0];
    this.pieceFlags = flags[1];
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { pocket: fenParts[5] }
    );
  }

  static GenRandInitFen(randomness) {
    return (
      ChessRules.GenRandInitFen(randomness).slice(0, -2) +
      // Add pieceFlags + pocket
      "1111111111111111 - 1111"
    );
  }

  getFen() {
    return (
      super.getFen() + " " +
      this.getPocketFen()
    );
  }

  getFenForRepeat() {
    return (
      super.getFenForRepeat() + "_" +
      this.getPocketFen()
    );
  }

  getFlagsFen() {
    let fen = super.getFlagsFen();
    // Add pieces flags
    for (let c of ["w", "b"])
      for (let i = 0; i < 8; i++) fen += (this.pieceFlags[c][i] ? "1" : "0");
    return fen;
  }

  getPocketFen() {
    let res = "";
    for (let c of ["w", "b"])
      res += this.pocket[c][V.HAWK] + this.pocket[c][V.ELEPHANT];
    return res;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const fenParsed = V.ParseFen(fen);
    this.pocket = {
      "w": {
        h: parseInt(fenParsed.pocket[0]),
        e: parseInt(fenParsed.pocket[1])
      },
      "b": {
        h: parseInt(fenParsed.pocket[2]),
        e: parseInt(fenParsed.pocket[3])
      }
    };
  }

  getPotentialMovesFrom([x, y]) {
    let moves = undefined;
    switch (this.getPiece(x, y)) {
      case V.HAWK:
        moves = this.getPotentialHawkMoves([x, y]);
        break;
      case V.ELEPHANT:
        moves = this.getPotentialElephantMoves([x, y]);
        break;
      default:
        moves = super.getPotentialMovesFrom([x, y]);
    }
    // Post-processing: add choices for hawk and elephant,
    // except for moves letting the king under check.
    const color = this.turn;
    if (Object.values(this.pocket[color]).some(v => v > 0)) {
      const firstRank = (color == "w" ? 7 : 0);
      let pocketMoves = [];
      moves.forEach(m => {
        let inCheckAfter = false;
        this.play(m);
        if (this.underCheck(color)) inCheckAfter = true;
        this.undo(m);
        if (!inCheckAfter) {
          for (let pp of ['h', 'e']) {
            if (this.pocket[color][pp] > 0) {
              if (
                m.start.x == firstRank &&
                this.pieceFlags[color][m.start.y] &&
                (
                  m.appear.length == 1 ||
                  // Special castle case: is initial king square free?
                  ![m.appear[0].y, m.appear[1].y].includes(m.vanish[0].y)
                )
              ) {
                let pMove = JSON.parse(JSON.stringify(m));
                // NOTE: unshift instead of push, for choices presentation
                pMove.appear.unshift(new PiPo({
                  p: pp,
                  c: color,
                  x: x,
                  y: y
                }));
                pocketMoves.push(pMove);
              }
              if (
                m.appear.length == 2 &&
                ![m.appear[0].y, m.appear[1].y].includes(m.vanish[1].y)
              ) {
                // Special castle case: rook flag was necessarily on
                let pMove = JSON.parse(JSON.stringify(m));
                pMove.appear.unshift(new PiPo({
                  p: pp,
                  c: color,
                  x: m.vanish[1].x,
                  y: m.vanish[1].y
                }));
                pocketMoves.push(pMove);
              }
            }
          }
        }
      });
      // NOTE: the order matter, for presentation on screen
      moves = moves.concat(pocketMoves);
    }
    return moves;
  }

  getPotentialHawkMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.BISHOP].concat(V.steps[V.KNIGHT])
    );
  }

  getPotentialElephantMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.KNIGHT])
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByHawk(sq, color) ||
      this.isAttackedByElephant(sq, color)
    );
  }

  isAttackedByHawk(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.HAWK,
      V.steps[V.BISHOP].concat(V.steps[V.KNIGHT])
    );
  }

  isAttackedByElephant(sq, color) {
    return this.isAttackedBySlideNJump(
      sq,
      color,
      V.ELEPHANT,
      V.steps[V.ROOK].concat(V.steps[V.KNIGHT])
    );
  }

  prePlay(move) {
    super.prePlay(move);
    if (move.appear.length >= 2) {
      if ([V.HAWK, V.ELEPHANT].includes(move.appear[0].p)) {
        // A pocket piece is used
        const color = this.turn;
        this.pocket[color][move.appear[0].p] = 0;
      }
    }
  }

  postPlay(move) {
    super.postPlay(move);
    const color = move.vanish[0].c;
    const oppCol = V.GetOppCol(color);
    const firstRank = (color == 'w' ? 7 : 0);
    const oppFirstRank = 7 - firstRank;
    // Does this move turn off a piece init square flag?
    if (move.start.x == firstRank) {
      if (this.pieceFlags[color][move.start.y])
        this.pieceFlags[color][move.start.y] = false;
      // Special castle case:
      if (move.appear.length >= 2) {
        const L = move.appear.length;
        if (move.appear[L-1].p == V.ROOK)
          this.pieceFlags[color][move.vanish[1].y] = false;
      }
    }
    if (move.end.x == oppFirstRank && this.pieceFlags[oppCol][move.end.y])
      this.pieceFlags[oppCol][move.end.y] = false;
  }

  postUndo(move) {
    super.postUndo(move);
    if (move.appear.length >= 2) {
      if ([V.HAWK, V.ELEPHANT].includes(move.appear[0].p)) {
        // A pocket piece was used
        const color = this.turn;
        this.pocket[color][move.appear[0].p] = 1;
      }
    }
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      { 'h': 5, 'e': 7 }
    );
  }

  getNotation(move) {
    if (
      move.appear.length >= 2 &&
      [V.HAWK, V.ELEPHANT].includes(move.appear[0].p)
    ) {
      const suffix = "/" + move.appear[0].p.toUpperCase();
      let cmove = JSON.parse(JSON.stringify(move));
      cmove.appear.shift();
      return super.getNotation(cmove) + suffix;
    }
    return super.getNotation(move);
  }
};
