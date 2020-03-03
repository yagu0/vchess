import { ChessRules } from "@/base_rules";

export const VariantRules = class ThreechecksRules extends ChessRules {
  static IsGoodFlags(flags) {
    // 4 for castle + 2 for checks (0,1 or 2)
    return !!flags.match(/^[01]{4,4}[012]{2,2}$/);
  }

  setFlags(fenflags) {
    super.setFlags(fenflags); //castleFlags
    this.checkFlags = { w: 0, b: 0 };
    const flags = fenflags.substr(4); //skip first 4 digits, for castle
    for (let c of ["w", "b"]) {
      this.checkFlags[c] = parseInt(flags.charAt(c == "w" ? 0 : 1));
    }
  }

  aggregateFlags() {
    return [this.castleFlags, this.checkFlags];
  }

  disaggregateFlags(flags) {
    this.castleFlags = flags[0];
    this.checkFlags = flags[1];
  }

  getPpath(b) {
    // TODO: !!this.checkFlags condition for printDiagram, but clearly not good.
    // This is just a temporary fix.
    if (b[1] == 'k' && this.checkFlags && this.checkFlags[b[0]] > 0)
      return "Threechecks/" + b[0] + 'k_' + this.checkFlags[b[0]];
    return b;
  }

  updateVariables(move) {
    super.updateVariables(move);
    // Does this move give check?
    const oppCol = this.turn;
    if (this.underCheck(oppCol))
      this.checkFlags[oppCol]++;
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.checkFlags[color] >= 3)
      return color == "w" ? "0-1" : "1-0";
    return super.getCurrentScore();
  }

  static GenRandInitFen() {
    const randFen = ChessRules.GenRandInitFen();
    // Add check flags (at 0)
    return randFen.replace(" w 0 1111", " w 0 111100");
  }

  getFlagsFen() {
    let fen = super.getFlagsFen();
    // Add check flags
    for (let c of ["w", "b"])
      fen += this.checkFlags[c];
    return fen;
  }

  evalPosition() {
    const baseEval = super.evalPosition();
    // Take number of checks into account
    return baseEval/5 - this.checkFlags["w"] + this.checkFlags["b"];
  }
};
