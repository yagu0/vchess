import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";
import { ArrayFun } from "@/utils/array";

export class BicolourRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  canTake([x1, y1], [x2, y2]) {
    return (
      this.getPiece(x1, y1) == V.KING || super.canTake([x1, y1], [x2, y2])
    );
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rqbnkbnr/pppppppp/8/8/8/8/PPPPPPPP/RQBNKBNR w 0 -";

    // Place pieces at random but the king cannot be next to a rook or queen.
    // => One bishop and one knight should surround the king.
    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(8);

      const kingPos = randInt(8);
      let toRemove = [kingPos];
      let knight1Pos = undefined;
      let bishop1Pos = undefined;
      if (kingPos == 0) {
        if (Math.random() < 0.5) knight1Pos = 1;
        else bishop1Pos = 1;
        toRemove.push(1);
      }
      else if (kingPos == V.size.y - 1) {
        if (Math.random() < 0.5) knight1Pos = V.size.y - 2;
        else bishop1Pos = V.size.y - 2;
        toRemove.push(V.size.y - 2);
      }
      else {
        knight1Pos = kingPos + (Math.random() < 0.5 ? 1 : -1);
        bishop1Pos = kingPos + (knight1Pos < kingPos ? 1 : -1);
        toRemove.push(knight1Pos, bishop1Pos);
      }
      const firstPieces = [kingPos, knight1Pos, bishop1Pos]
        .filter(elt => elt !== undefined);
      firstPieces
        .sort((a, b) => b - a)
        .forEach(elt => positions.splice(elt, 1));

      let randIndex = undefined;
      if (bishop1Pos === undefined) {
        const posWithIdx = positions.map((e,i) => { return { e: e, i: i }; });
        let availableSquares = posWithIdx.filter(p => p.e % 2 == 0);
        randIndex = randInt(availableSquares.length);
        bishop1Pos = availableSquares[randIndex].e;
        positions.splice(availableSquares[randIndex].i, 1);
      }
      const posWithIdx = positions.map((e,i) => { return { e: e, i: i }; });
      const rem1B = bishop1Pos % 2;
      let availableSquares = posWithIdx.filter(p => p.e % 2 == 1 - rem1B);
      randIndex = randInt(availableSquares.length);
      const bishop2Pos = availableSquares[randIndex].e;
      positions.splice(availableSquares[randIndex].i, 1);

      if (knight1Pos === undefined) {
        randIndex = randInt(5);
        knight1Pos = positions[randIndex];
        positions.splice(randIndex, 1);
      }
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
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 -"
    );
  }

  underCheck(color) {
    return (
      this.isAttacked(this.kingPos[color], 'w') ||
      this.isAttacked(this.kingPos[color], 'b')
    );
  }

};
