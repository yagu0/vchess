import { ChessRules } from "@/base_rules";

export class VchessRules extends ChessRules {
  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { captureBackward: true }
    );
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    // TODO: if capture backwards, add an indication 'b'
    return notation;
  }
};
