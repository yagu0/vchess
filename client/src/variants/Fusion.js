import { ChessRules, Move, PiPo } from "@/base_rules";

export class FusionRules extends ChessRules {

  static get PawnSpecs() {
    return (
      Object.assign(
        { promotions: [V.ROOK, V.KNIGHT, V.BISHOP] },
        ChessRules.PawnSpecs
      )
    );
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K', 'F', 'G', 'C'].includes(row[i])) kings['K']++;
        else if (['k', 'f', 'g', 'c'].includes(row[i])) kings['k']++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  scanKings(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        const ch_ij = fenRows[i].charAt(j);
        if (['k', 'f', 'g', 'c'].includes(ch_ij))
          this.kingPos["b"] = [i, k];
        else if (['K', 'F', 'G', 'C'].includes(ch_ij))
          this.kingPos["w"] = [i, k];
        else {
          const num = parseInt(fenRows[i].charAt(j), 10);
          if (!isNaN(num)) k += num - 1;
        }
        k++;
      }
    }
  }

  canTake([x1, y1], [x2, y2]) {
    if (this.getColor(x1, y1) !== this.getColor(x2, y2)) return true;
    const p1 = this.getPiece(x1, y1);
    const p2 = this.getPiece(x2, y2);
    return (
      p1 != p2 &&
      [V.ROOK, V.KNIGHT, V.BISHOP].includes(p1) &&
      [V.KING, V.ROOK, V.KNIGHT, V.BISHOP].includes(p2)
    );
  }

  getPpath(b) {
    if ([V.BN, V.RN, V.KB, V.KR, V.KN].includes(b[1])) return "Fusion/" + b;
    return b;
  }

  // Three new pieces: rook+knight, bishop+knight and queen+knight
  static get RN() {
    // Marshall
    return 'm';
  }
  static get BN() {
    // Paladin
    return 'd';
  }
  static get KB() {
    // Pontiff
    return 'f';
  }
  static get KR() {
    // Dragon King
    return 'g';
  }
  static get KN() {
    // Cavalier King
    return 'c';
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.RN, V.BN, V.KB, V.KR, V.KN]);
  }

  static Fusion(p1, p2) {
    if (p2 == V.KING) {
      switch (p1) {
        case V.ROOK: return V.KR;
        case V.BISHOP: return V.KB;
        case V.KNIGHT: return V.KN;
      }
    }
    if ([p1, p2].includes(V.KNIGHT)) {
      if ([p1, p2].includes(V.ROOK)) return V.RN;
      return V.BN;
    }
    // Only remaining combination is rook + bishop = queen
    return V.QUEEN;
  }

  getPotentialMovesFrom(sq) {
    let moves = [];
    const piece = this.getPiece(sq[0], sq[1]);
    switch (piece) {
      case V.RN:
        moves =
          super.getPotentialRookMoves(sq).concat(
          super.getPotentialKnightMoves(sq)).concat(
          this.getFissionMoves(sq));
        break;
      case V.BN:
        moves =
          super.getPotentialBishopMoves(sq).concat(
          super.getPotentialKnightMoves(sq)).concat(
          this.getFissionMoves(sq));
        break;
      case V.KN:
        moves =
          super.getPotentialKingMoves(sq).concat(
          this.getPotentialKingAsKnightMoves(sq)).concat(
          this.getFissionMoves(sq));
        break;
      case V.KB:
        moves =
          super.getPotentialKingMoves(sq).concat(
          this.getPotentialKingAsBishopMoves(sq)).concat(
          this.getFissionMoves(sq));
        break;
      case V.KR:
        moves =
          super.getPotentialKingMoves(sq).concat(
          this.getPotentialKingAsRookMoves(sq)).concat(
          this.getFissionMoves(sq));
        break;
      case V.QUEEN:
        moves =
          super.getPotentialQueenMoves(sq).concat(this.getFissionMoves(sq));
        break;
      default:
        moves = super.getPotentialMovesFrom(sq);
        break;
    }
    moves.forEach(m => {
      if (
        m.vanish.length == 2 &&
        m.appear.length == 1 &&
        m.vanish[0].c == m.vanish[1].c
      ) {
        // Augment pieces abilities in case of self-captures
        m.appear[0].p = V.Fusion(piece, m.vanish[1].p);
      }
    });
    return moves;
  }

  getSlideNJumpMoves_fission([x, y], moving, staying, steps, oneStep) {
    let moves = [];
    const c = this.getColor(x, y);
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(
          new Move({
            appear: [
              new PiPo({ x: i, y: j, c: c, p: moving }),
              new PiPo({ x: x, y: y, c: c, p: staying }),
            ],
            vanish: [
              new PiPo({ x: x, y: y, c: c, p: this.getPiece(x, y) })
            ]
          })
        );
        if (!!oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
    }
    return moves;
  }

  getFissionMoves(sq) {
    // Square attacked by opponent?
    const color = this.getColor(sq[0], sq[1]);
    const oppCol = V.GetOppCol(color);
    if (this.isAttacked(sq, oppCol)) return [];
    // Ok, fission a priori valid
    const kSteps = V.steps[V.BISHOP].concat(V.steps[V.BISHOP]);
    switch (this.getPiece(sq[0], sq[1])) {
      case V.BN:
        return (
          this.getSlideNJumpMoves_fission(
            sq, V.BISHOP, V.KNIGHT, V.steps[V.BISHOP])
          .concat(this.getSlideNJumpMoves_fission(
            sq, V.KNIGHT, V.BISHOP, V.steps[V.KNIGHT], "oneStep"))
        );
      case V.RN:
        return (
          this.getSlideNJumpMoves_fission(
            sq, V.ROOK, V.KNIGHT, V.steps[V.ROOK])
          .concat(this.getSlideNJumpMoves_fission(
            sq, V.KNIGHT, V.ROOK, V.steps[V.KNIGHT], "oneStep"))
        );
      case V.KN:
        return (
          this.getSlideNJumpMoves_fission(sq, V.KING, V.KNIGHT, kSteps)
          .concat(this.getSlideNJumpMoves_fission(
            sq, V.KNIGHT, V.KING, V.steps[V.KNIGHT], "oneStep"))
        );
      case V.KB:
        return (
          this.getSlideNJumpMoves_fission(sq, V.KING, V.BISHOP, kSteps)
          .concat(this.getSlideNJumpMoves_fission(
            sq, V.BISHOP, V.KING, V.steps[V.BISHOP]))
        );
      case V.KR:
        return (
          this.getSlideNJumpMoves_fission(sq, V.KING, V.ROOK, kSteps)
          .concat(this.getSlideNJumpMoves_fission(
            sq, V.ROOK, V.KING, V.steps[V.ROOK]))
        );
      case V.QUEEN:
        return (
          this.getSlideNJumpMoves_fission(
            sq, V.BISHOP, V.ROOK, V.steps[V.BISHOP])
          .concat(this.getSlideNJumpMoves_fission(
            sq, V.ROOK, V.BISHOP, V.steps[V.ROOK]))
        );
    }
  }

  intermediateSquaresFromKnightStep(step) {
    if (step[0] == 2) return [ [1, 0], [1, step[1]] ];
    if (step[0] == -2) return [ [-1, 0], [-1, step[1]] ];
    if (step[1] == 2) return [ [0, 1], [step[1], 1] ];
    // step[1] == -2:
    return [ [0, -1], [step[1], -1] ];
  }

  getPotentialKingAsKnightMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    let intermediateOk = {};
    for (let s of V.steps[V.KNIGHT]) {
      const [i, j] = [x + s[0], y + s[1]];
      if (!V.OnBoard(i, j) || this.board[i][j] != V.EMPTY) continue;
      const iSq = this.intermediateSquaresFromKnightStep(s);
      let moveOk = false;
      for (let sq of iSq) {
        const key = sq[0] + "_" + sq[1];
        if (Object.keys(intermediateOk).includes(key)) {
          if (intermediateOk[key]) moveOk = true;
        }
        else {
          moveOk = !this.isAttacked([x + sq[0], y + sq[1]], oppCol);
          intermediateOk[key] = moveOk;
        }
        if (moveOk) break;
      }
      if (moveOk) moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialKingMovesAsSlider([x, y], slider) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    for (let s of V.steps[slider]) {
      let [i, j] = [x + s[0], y + s[1]];
      if (
        !V.OnBoard(i, j) ||
        this.board[i][j] != V.EMPTY ||
        this.isAttacked([i, j], oppCol)
      ) {
        continue;
      }
      i += s[0];
      j += s[1];
      while (
        V.OnBoard(i, j) &&
        this.board[i][j] == V.EMPTY &&
        // TODO: this test will be done twice (also in filterValid())
        !this.isAttacked([i, j], oppCol)
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        i += s[0];
        j += s[1];
      }
    }
    return moves;
  }

  getPotentialKingAsBishopMoves(sq) {
    return this.getPotentialKingMovesAsSlider(sq, V.BISHOP);
  }

  getPotentialKingAsRookMoves(sq) {
    return this.getPotentialKingMovesAsSlider(sq, V.ROOK);
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByBN(sq, color) ||
      this.isAttackedByRN(sq, color) ||
      this.isAttackedByKN(sq, color) ||
      this.isAttackedByKB(sq, color) ||
      this.isAttackedByKR(sq, color)
    );
  }

  isAttackedByBN(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.BN, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.BN, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedByRN(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.RN, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.RN, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedByKN(sq, color) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return (
      this.isAttackedBySlideNJump(sq, color, V.KN, steps, "oneStep") ||
      this.isAttackedBySlideNJump(
        sq, color, V.KN, V.steps[V.KNIGHT], "oneStep")
    );
  }

  isAttackedByKB(sq, color) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return (
      this.isAttackedBySlideNJump(sq, color, V.KB, steps, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.KB, V.steps[V.BISHOP])
    );
  }

  isAttackedByKR(sq, color) {
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return (
      this.isAttackedBySlideNJump(sq, color, V.KR, steps, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.KR, V.steps[V.ROOK])
    );
  }

  updateCastleFlags(move, piece) {
    const c = V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    const oppCol = this.turn;
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (piece == V.KING)
      this.castleFlags[c] = [V.size.y, V.size.y];
    else if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    // Check move endpoint: if my king or any rook position, flags off
    if (move.end.x == this.kingPos[c][0] && move.end.y == this.kingPos[c][1])
      this.castleFlags[c] = [V.size.y, V.size.y];
    else if (
      move.end.x == firstRank &&
      this.castleFlags[c].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    else if (
      move.end.x == oppFirstRank &&
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  postPlay(move) {
    const c = V.GetOppCol(this.turn);
    const piece = move.appear[0].p;
    if ([V.KING, V.KN, V.KB, V.KR].includes(piece))
      this.kingPos[c] = [move.appear[0].x, move.appear[0].y];
    this.updateCastleFlags(move, piece);
  }

  postUndo(move) {
    const c = this.getColor(move.start.x, move.start.y);
    if ([V.KING, V.KN, V.KB, V.KR].includes(move.appear[0].p))
      this.kingPos[c] = [move.start.x, move.start.y];
  }

  static get VALUES() {
    // Values such that sum of values = value of sum
    return Object.assign(
      { m: 8, d: 6, f: 1003, g: 1005, c: 1003 },
      ChessRules.VALUES
    );
  }

  getNotation(move) {
    if (move.appear.length == 2 && move.vanish.length == 1) {
      // Fission (because no capture in this case)
      return (
        move.appear[0].p.toUpperCase() + V.CoordsToSquare(move.end) +
        "/f:" + move.appear[1].p.toUpperCase() + V.CoordsToSquare(move.start)
      );
    }
    let notation = super.getNotation(move);
    if (move.vanish[0].p != V.PAWN && move.appear[0].p != move.vanish[0].p)
      // Fusion (not from a pawn: handled in ChessRules)
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }

};
