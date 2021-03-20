import { Teleport1Rules } from "@/variants/Teleport1";

export class Teleport2Rules extends Teleport1Rules {

  canTake([x1, y1], [x2, y2]) {
    // Cannot teleport king:
    return (this.subTurn == 1 && this.getPiece(x2, y2) != V.KING);
  }

  underCheck(color) {
    // Standard method:
    return this.isAttacked(this.kingPos[color], V.GetOppCol(color));
  }

  postPlay(move) {
    if (move.vaish.length > 0) {
      // Standard method:
      if (move.appear[0].p == V.KING)
        this.kingPos[move.appear[0].c] = [move.appear[0].x, move.appear[0].y];
      this.updateCastleFlags(move);
    }
  }

  updateCastleFlags(move) {
    // Standard method: TODO = find a better way... (not rewriting)
    const c = color || V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    const oppCol = this.turn;
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (piece == V.KING && move.appear.length > 0)
      this.castleFlags[c] = [V.size.y, V.size.y];
    else if (
      move.start.x == firstRank &&
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    if (
      move.end.x == oppFirstRank &&
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  postUndo(move) {
    if (move.vanish.length > 0) {
      // Standard method:
      const c = this.getColor(move.start.x, move.start.y);
      if (this.getPiece(move.start.x, move.start.y) == V.KING)
        this.kingPos[c] = [move.start.x, move.start.y];
    }
  }

};
