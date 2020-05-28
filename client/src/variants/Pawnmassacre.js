import { ChessRules } from "@/base_rules";

export class PawnmassacreRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static GenRandInitFen(randomness) {
    return (
      ChessRules.GenRandIntFen(randomness)
      // Remove castle flags
      .slice(0, -6).concat("-")
      .replace("PPPPPPPP", "pppppppp")
      // Next replacement is OK because only acts on first occurrence
      .replace("pppppppp", "PPPPPPPP")
    );
  }
};
