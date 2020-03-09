import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";
import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class EightpiecesRules extends ChessRules {
  static get JAILER() {
    return "j";
  }
  static get SENTRY() {
    return "s";
  }
  static get LANCER() {
    return "l";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.JAILER, V.SENTRY, V.LANCER]);
  }

  getPpath(b) {
    // TODO: more subtle, path depends on the orientations
    // lancerOrientations should probably be a 8x8 array, for speed.
    return (
      ([V.JAILER, V.SENTRY, V.LANCER].includes(b[1])
        ? "Eightpieces/" : "") + b
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check lancers orientations (if there are any left)
    if (
      !fenParsed.lancers ||
      (
        fenParsed.lancers != "-" &&
        !fenParsed.lancers.match(/^([a-h][1-8][0-7],?)+$/)
      )
    ) {
      return false;
    }
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(ChessRules.ParseFen(fen), {
      lancers: fenParts[5],
    });
  }

  static GenRandInitFen(randomness) {
    // TODO: special conditions
  }

  getFen() {
    return (
      super.getFen() + " " + this.getLancersFen()
    );
  }

  getFenForRepeat() {
    return (
      this.getBaseFen() + "_" +
      this.getTurnFen() + "_" +
      this.getFlagsFen() + "_" +
      this.getEnpassantFen() + "_" +
      this.getLancersFen()
    );
  }

  getLancersFen() {
    let res = "";
    this.lancerOrientations.forEach(o => {
      res += V.CoordsToSquare(o.sq) + o.dir + ",";
    });
    res = res.slice(0, -1);
    return res || "-";
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const fenParsed = V.ParseFen(fen);
    // Also init lancer orientations (from FEN):
    this.lancerOrientations = 32; // TODO
  }

  // getPotentialMoves, isAttacked: TODO

  // updatedVariables: update lancers' orientations

  // subTurn : if sentry moved to some enemy piece.

  static get VALUES() {
    return Object.assign(
      { l: 5, s: 4, j: 5 }, //experimental
      ChessRules.VALUES
    );
  }
};
