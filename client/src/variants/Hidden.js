import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class HiddenRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  // Analyse in Hidden mode makes no sense
  static get CanAnalyze() {
    return false;
  }

  // Moves are revealed only when game ends
  static get ShowMoves() {
    return "none";
  }

  static get HIDDEN_DECODE() {
    return {
      s: "p",
      t: "q",
      u: "r",
      c: "b",
      o: "n",
      l: "k"
    };
  }
  static get HIDDEN_CODE() {
    return {
      p: "s",
      q: "t",
      r: "u",
      b: "c",
      n: "o",
      k: "l"
    };
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(Object.values(V.HIDDEN_CODE));
  }

  // Scan board for kings positions (no castling)
  scanKingsRooks(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
          case "l":
            this.kingPos["b"] = [i, k];
            break;
          case "K":
          case "L":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  getPpath(b, color, score) {
    if (Object.keys(V.HIDDEN_DECODE).includes(b[1])) {
      // Supposed to be hidden.
      if (score == "*" && (!color || color != b[0]))
        return "Hidden/" + b[0] + "p";
      // Else: condition OK to show the piece
      return b[0] + V.HIDDEN_DECODE[b[1]];
    }
    // The piece is already not supposed to be hidden:
    return b;
  }

  //getPotentialMovesFrom: TODO: write

  // TODO: bishops on different colors, a1 --> h1, h2 --> a2 ?
  static GenRandInitFen() {
    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces + pawns on two first ranks
    for (let c of ["w", "b"]) {
      let positions = ArrayFun.range(16);

      // Get random squares for bishops
      let randIndex = 2 * randInt(8);
      const bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(8) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(14);
      const knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(13);
      const knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(12);
      const queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random squares for pawns
      // TODO...

      // Rooks and king positions are now fixed,
      // because of the ordering rook-king-rook
      const rook1Pos = positions[0];
      const kingPos = positions[1];
      const rook2Pos = positions[2];

      // Finally put the shuffled pieces in the board array
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
      " w 0"
    );
  }

  getCheckSquares() {
    return [];
  }

  updateVariables(move) {
    super.updateVariables(move);
    if (
      move.vanish.length >= 2 &&
      [V.KING,V.HIDDEN_CODE[V.KING]].includes(move.vanish[1].p)
    ) {
      // We took opponent king
      this.kingPos[this.turn] = [-1, -1];
    }
  }

  unupdateVariables(move) {
    super.unupdateVariables(move);
    const c = move.vanish[0].c;
    const oppCol = V.GetOppCol(c);
    if (this.kingPos[oppCol][0] < 0)
      // Last move took opponent's king:
      this.kingPos[oppCol] = [move.vanish[1].x, move.vanish[1].y];
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (kp[0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    // Assume that stalemate is impossible:
    return "*";
  }

  getComputerMove() {
    // Just return a random move. TODO: something smarter...
    const moves = this.getAllValidMoves();
    return moves[randInt(moves.length)];
  }
};
