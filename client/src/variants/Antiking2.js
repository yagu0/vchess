import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class Antiking2Rules extends ChessRules {

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
            const num = parseInt(rows[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  canTake([x1, y1], [x2, y2]) {
    const piece1 = this.getPiece(x1, y1);
    const piece2 = this.getPiece(x2, y2);
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    return (
      piece2 != "a" &&
      (
        (piece1 != "a" && color1 != color2) ||
        (piece1 == "a" && color1 == color2)
      )
    );
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.ANTIKING:
        return this.getPotentialAntikingMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
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
    return super.isAttackedByKing([x, y], color);
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
    // Update antiking position
    if (piece == V.ANTIKING) {
      this.antikingPos[c][0] = move.appear[0].x;
      this.antikingPos[c][1] = move.appear[0].y;
    }
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

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rnbqkbnr/pppppppp/3A4/8/8/3a4/PPPPPPPP/RNBQKBNR w 0 ahah -";

    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    let antikingPos = { w: -1, b: -1 };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        antikingPos['b'] = antikingPos['w'];
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(8);

      // Get random squares for bishops, but avoid corners; because,
      // if an antiking blocks a cornered bishop, it can never be checkmated
      let randIndex = 2 * randInt(1, 4);
      const bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * randInt(3) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      randIndex = randInt(6);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(4);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      // Random squares for antikings
      antikingPos[c] = randInt(8);

      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(rook2Pos);
    }
    const ranks23_black =
      "pppppppp/" +
      (antikingPos["w"] > 0 ? antikingPos["w"] : "") +
      "A" +
      (antikingPos["w"] < 7 ? 7 - antikingPos["w"] : "");
    const ranks23_white =
      (antikingPos["b"] > 0 ? antikingPos["b"] : "") +
      "a" +
      (antikingPos["b"] < 7 ? 7 - antikingPos["b"] : "") +
      "/PPPPPPPP";
    return (
      pieces["b"].join("") +
      "/" +
      ranks23_black +
      "/8/8/" +
      ranks23_white +
      "/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " -"
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
