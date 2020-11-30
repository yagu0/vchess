import { ChessRules } from "@/base_rules";

export class FreecaptureRules extends ChessRules {

  canTake() {
    // Can capture both colors:
    return true;
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

};
