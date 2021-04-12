import { ChessRules } from "@/base_rules";

export class PawnmassacreRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  get showFirstTurn() {
    return true;
  }

  static GenRandInitFen(options) {
    const bFen =
      ChessRules.GenRandInitFen(options)
      // Remove castle flags
      .slice(0, -6).concat("-");
    const splitIdx = bFen.indexOf(' ');
    return (
      bFen.substr(0, splitIdx)
      .replace("PPPPPPPP", "pppppppp")
      // Next replacement is OK because only acts on first occurrence
      .replace("pppppppp", "PPPPPPPP")
      .split("").reverse().join("")
      .concat(bFen.substr(splitIdx))
    );
  }

};
