import { MakrukRules } from "@/variants/Makruk";

export class MakpongRules extends MakrukRules {

  filterValid(moves) {
    const color = this.turn;
    if (this.underCheck(color)) {
      // Filter out all moves involving king
      return super.filterValid(moves.filter(m => m.vanish[0].p != V.KING));
    }
    return super.filterValid(moves);
  }

};
