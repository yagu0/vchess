import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class AntikingRules extends ChessRules {
  static get ANTIKING() {
    return "a";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.ANTIKING]);
  }

  getPpath(b) {
    return b[1] == "a" ? "Antiking/" + b : b;
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
    switch (this.getPiece(x, y)) {
      case V.ANTIKING:
        return this.getPotentialAntikingMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialAntikingMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttacked(sq, colors) {
    return (
      super.isAttacked(sq, colors) || this.isAttackedByAntiking(sq, colors)
    );
  }

  isAttackedByKing([x, y], colors) {
    if (this.getPiece(x, y) == V.ANTIKING) return false; //antiking is not attacked by king
    return this.isAttackedBySlideNJump(
      [x, y],
      colors,
      V.KING,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttackedByAntiking([x, y], colors) {
    if ([V.KING, V.ANTIKING].includes(this.getPiece(x, y))) return false; //(anti)king is not attacked by antiking
    return this.isAttackedBySlideNJump(
      [x, y],
      colors,
      V.ANTIKING,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    let res =
      this.isAttacked(this.kingPos[color], [oppCol]) ||
      !this.isAttacked(this.antikingPos[color], [oppCol]);
    return res;
  }

  getCheckSquares(color) {
    let res = super.getCheckSquares(color);
    if (!this.isAttacked(this.antikingPos[color], [V.GetOppCol(color)]))
      res.push(JSON.parse(JSON.stringify(this.antikingPos[color])));
    return res;
  }

  updateVariables(move) {
    super.updateVariables(move);
    const piece = move.vanish[0].p;
    const c = move.vanish[0].c;
    // Update antiking position
    if (piece == V.ANTIKING) {
      this.antikingPos[c][0] = move.appear[0].x;
      this.antikingPos[c][1] = move.appear[0].y;
    }
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
    const c = move.vanish[0].c;
    if (move.vanish[0].p == V.ANTIKING)
      this.antikingPos[c] = [move.start.x, move.start.y];
  }

  getCurrentScore() {
    if (this.atLeastOneMove())
      return "*";

    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    if (
      !this.isAttacked(this.kingPos[color], [oppCol]) &&
      this.isAttacked(this.antikingPos[color], [oppCol])
    ) {
      return "1/2";
    }
    return color == "w" ? "0-1" : "1-0";
  }

  static get VALUES() {
    return Object.assign(
      { a: 1000 },
      ChessRules.VALUES
    );
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rnbqkbnr/pppppppp/3A4/8/8/3a4/PPPPPPPP/RNBQKBNR w 0 1111 -";

    let pieces = { w: new Array(8), b: new Array(8) };
    let antikingPos = { w: -1, b: -1 };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
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
      " w 0 1111 -"
    );
  }
};
