import { ChessRules } from "@/base_rules";

export class CastleRules extends ChessRules {

  getCurrentScore() {
    const baseScore = super.getCurrentScore();
    if (baseScore != '*') return baseScore;
    if (this.castleFlags['b'][0] >= 8) {
      if (this.getPiece(0,2) == V.KING && this.getPiece(0,3) == V.ROOK)
        return "0-1";
      return "1-0";
    }
    return '*';
  }

};
