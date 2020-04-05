import { ChessRules } from "@/base_rules";
import { BerolinaRules } from "@/variants/Berolina";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class Antiking1Rules extends BerolinaRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { twoSquares: false }
    );
  }

  static get HasCastle() {
    return false;
  }

  static get ANTIKING() {
    return "a";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.ANTIKING]);
  }

  getPpath(b) {
    return b[1] == "a" ? "Antiking/" + b : b;
  }

  static IsGoodPosition(position) {
    if (!ChessRules.IsGoodPosition(position)) return false;
    const rows = position.split("/");
    // Check that exactly one antiking of each color is there:
    let antikings = { 'a': 0, 'A': 0 };
    for (let row of rows) {
      for (let i = 0; i < row.length; i++)
        if (['A','a'].includes(row[i])) antikings[row[i]]++;
    }
    if (Object.values(antikings).some(v => v != 1)) return false;
    return true;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.antikingPos = { w: [-1, -1], b: [-1, -1] };
    const rows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < rows.length; i++) {
      let k = 0;
      for (let j = 0; j < rows[i].length; j++) {
        switch (rows[i].charAt(j)) {
          case "a":
            this.antikingPos["b"] = [i, k];
            break;
          case "A":
            this.antikingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(rows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  // (Anti)King flags at 1 (true) if they can knight-jump
  setFlags(fenflags) {
    this.kingFlags = {
      // King then antiking
      w: [...Array(2).fill(false)],
      b: [...Array(2).fill(false)]
    };
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 2; i++)
        this.kingFlags[c][i] = fenflags.charAt((c == "w" ? 0 : 2) + i) == "1";
    }
  }

  aggregateFlags() {
    return this.kingFlags;
  }

  disaggregateFlags(flags) {
    this.kingFlags = flags;
  }

  getFlagsFen() {
    // Return kings flags
    let flags = "";
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 2; i++) flags += this.kingFlags[c][i] ? "1" : "0";
    }
    return flags;
  }

  canTake([x1, y1], [x2, y2]) {
    const piece1 = this.getPiece(x1, y1);
    const piece2 = this.getPiece(x2, y2);
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    return (
      piece2 != "a" &&
      ((piece1 != "a" && color1 != color2) ||
        (piece1 == "a" && color1 == color2))
    );
  }

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    let addKnightJumps = false;
    const piece = this.getPiece(x, y);
    const color = this.getColor(x, y);
    if (piece == V.ANTIKING) {
      moves = this.getPotentialAntikingMoves([x, y]);
      addKnightJumps = this.kingFlags[color][1];
    } else {
      moves = super.getPotentialMovesFrom([x, y]);
      if (piece == V.KING) addKnightJumps = this.kingFlags[color][0];
    }
    if (addKnightJumps) {
      // Add potential knight jump to (anti)kings
      const knightJumps = super.getPotentialKnightMoves([x, y]);
      // Remove captures (TODO: could be done more efficiently...)
      moves = moves.concat(knightJumps.filter(m => m.vanish.length == 1));
    }
    return moves;
  }

  getPotentialAntikingMoves(sq) {
    // The antiking moves like a king (only captured colors differ)
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByAntiking(sq, color)
    );
  }

  isAttackedByKing([x, y], color) {
    // Antiking is not attacked by king:
    if (this.getPiece(x, y) == V.ANTIKING) return false;
    return this.isAttackedBySlideNJump(
      [x, y],
      color,
      V.KING,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttackedByAntiking([x, y], color) {
    // (Anti)King is not attacked by antiking
    if ([V.KING, V.ANTIKING].includes(this.getPiece(x, y))) return false;
    return this.isAttackedBySlideNJump(
      [x, y],
      color,
      V.ANTIKING,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    let res =
      this.isAttacked(this.kingPos[color], oppCol) ||
      !this.isAttacked(this.antikingPos[color], oppCol);
    return res;
  }

  getCheckSquares() {
    const color = this.turn;
    let res = [];
    const oppCol = V.GetOppCol(color);
    if (this.isAttacked(this.kingPos[color], oppCol))
      res.push(JSON.parse(JSON.stringify(this.kingPos[color])));
    if (!this.isAttacked(this.antikingPos[color], oppCol))
      res.push(JSON.parse(JSON.stringify(this.antikingPos[color])));
    return res;
  }

  postPlay(move) {
    super.postPlay(move);
    const piece = move.vanish[0].p;
    const c = move.vanish[0].c;
    // Update antiking position, and kings flags
    if (piece == V.ANTIKING) {
      this.antikingPos[c][0] = move.appear[0].x;
      this.antikingPos[c][1] = move.appear[0].y;
      this.kingFlags[c][1] = false;
    } else if (piece == V.KING) this.kingFlags[c][0] = false;
  }

  postUndo(move) {
    super.postUndo(move);
    const c = move.vanish[0].c;
    if (move.vanish[0].p == V.ANTIKING)
      this.antikingPos[c] = [move.start.x, move.start.y];
  }

  static get VALUES() {
    return Object.assign(
      { a: 1000 },
      ChessRules.VALUES
    );
  }

  static GenRandInitFen() {
    // Always deterministic setup
    return "2prbkqA/2p1nnbr/2pppppp/8/8/PPPPPP2/RBNN1P2/aQKBRP2 w 0 1111";
  }

  static get SEARCH_DEPTH() {
    return 2;
  }
};
