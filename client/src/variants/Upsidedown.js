import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";
import { ArrayFun } from "@/utils/array";

export class UpsidedownRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "RNBQKBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbqkbnr w 0";

    let pieces = { w: new Array(8), b: new Array(8) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && options.randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(8);

      let randIndex = randInt(8);
      const kingPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // At least a knight must be next to the king:
      let knight1Pos = undefined;
      if (kingPos == 0) knight1Pos = 1;
      else if (kingPos == V.size.y - 1) knight1Pos = V.size.y - 2;
      else knight1Pos = kingPos + (Math.random() < 0.5 ? 1 : -1);
      // Search for knight1Pos index in positions and remove it
      const knight1Index = positions.indexOf(knight1Pos);
      positions.splice(knight1Index, 1);

      // King+knight1 are on two consecutive squares: one light, one dark
      randIndex = 2 * randInt(3);
      const bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * randInt(3) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      randIndex = randInt(4);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(3);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      const rook1Pos = positions[0];
      const rook2Pos = positions[1];

      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
    }
    return (
      pieces["w"].join("").toUpperCase() +
      "/PPPPPPPP/8/8/8/8/pppppppp/" +
      pieces["b"].join("") +
      // No castle, no en-passant:
      " w 0"
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
