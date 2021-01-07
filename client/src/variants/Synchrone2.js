import { ChessRules } from "@/base_rules";
import { Synchrone1Rules } from "@/variants/Synchrone1";
import { randInt } from "@/utils/alea";

export class Synchrone2Rules extends Synchrone1Rules {

  static get CanAnalyze() {
    return true;//false;
  }

  static get HasEnpassant() {
    return false;
  }

  static IsGoodFen(fen) {
    if (!Synchrone1Rules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check initFen (not really... TODO?)
    if (!fenParsed.initFen || fenParsed.initFen == "-") return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      {
        initFen: fenParts[4],
        whiteMove: fenParts[5]
      },
      ChessRules.ParseFen(fen)
    );
  }

  getInitfenFen() {
    if (!this.whiteMove) return "-";
    return JSON.stringify({
      start: this.whiteMove.start,
      end: this.whiteMove.end,
      appear: this.whiteMove.appear,
      vanish: this.whiteMove.vanish
    });
  }

  getFen() {
    return (
      super.getFen() + " " +
      this.getInitfenFen() + " " +
      this.getWhitemoveFen()
    );
  }

  static GenRandInitFen(randomness) {
    const res = ChessRules.GenRandInitFen(randomness);
    // Add initFen field:
    return res.slice(0, -1) + " " + res.split(' ')[1] + " -";
  }

  setOtherVariables(fen) {
    const parsedFen = V.ParseFen(fen);
    this.setFlags(parsedFen.flags);
    super.scanKings(fen);
    // Also init whiteMove
    this.whiteMove =
      parsedFen.whiteMove != "-"
        ? JSON.parse(parsedFen.whiteMove)
        : null;
    // And initFen (not empty)
    this.initFen = parsedFen.initFen;
  }

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount % 4 <= 1) return super.getPotentialMovesFrom([x, y]);
    // TODO: either add a "blackMove' field in FEN (bof...),
    // or write an helper function to detect from diff positions,
    // which piece moved (if not disappeared!), which moves are valid.
    // + do not forget pass move (king 2 king): always possible at stage 2.
    return [];
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    // Do not play on board (would reveal the move...)
    this.turn = V.GetOppCol(this.turn);
    this.movesCount++;
    this.postPlay(move);
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    if (this.turn == 'w')
      // Back to the middle of the move
      V.UndoOnBoard(this.board, move.smove);
    this.turn = V.GetOppCol(this.turn);
    this.movesCount--;
    this.postUndo(move);
  }

  getCurrentScore() {
    if (this.movesCount % 4 != 0)
      // Turn (2 x white + black) not over yet
      return "*";
    // Was a king captured?
    if (this.kingPos['w'][0] < 0) return "0-1";
    if (this.kingPos['b'][0] < 0) return "1-0";
    const whiteCanMove = this.atLeastOneMove('w');
    const blackCanMove = this.atLeastOneMove('b');
    if (whiteCanMove && blackCanMove) return "*";
    // Game over
    const whiteInCheck = this.underCheck('w');
    const blackInCheck = this.underCheck('b');
    if (
      (whiteCanMove && !this.underCheck('b')) ||
      (blackCanMove && !this.underCheck('w'))
    ) {
      return "1/2";
    }
    // Checkmate: could be mutual
    if (!whiteCanMove && !blackCanMove) return "1/2";
    return (whiteCanMove ? "1-0" : "0-1");
  }

};
