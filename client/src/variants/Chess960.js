import { ChessRules } from "@/base_rules";

export class Chess960Rules extends ChessRules {

  // Do not allow standard chess:
  static get Options() {
    return {
      select: [
        {
          label: "Randomness",
          variable: "randomness",
          defaut: 2,
          options: [
            { label: "Symmetric random", value: 1 },
            { label: "Asymmetric random", value: 2 }
          ]
        }
      ]
    };
  }

};
