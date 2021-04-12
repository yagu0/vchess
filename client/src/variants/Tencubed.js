import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class TencubedRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        initShift: { w: 2, b: 2 },
        promotions: [V.QUEEN, V.MARSHALL, V.ARCHBISHOP]
      }
    );
  }

  static get HasFlags() {
    return false;
  }

  getPpath(b) {
    return (
      [V.MARSHALL, V.ARCHBISHOP, V.CHAMPION, V.WIZARD].includes(b[1])
        ? "Tencubed/"
        : ""
    ) + b;
  }

  static get size() {
    return { x: 10, y: 10 };
  }

  // Rook + knight:
  static get MARSHALL() {
    return "m";
  }

  // Bishop + knight
  static get ARCHBISHOP() {
    return "a";
  }

  // Dabbabah + alfil + wazir
  static get CHAMPION() {
    return "c";
  }

  // Camel + ferz
  static get WIZARD() {
    return "w";
  }

  static get PIECES() {
    return (
      ChessRules.PIECES
      .concat([V.MARSHALL, V.ARCHBISHOP, V.CHAMPION, V.WIZARD])
    );
  }

  static get steps() {
    return Object.assign(
      {
        w: [
          [-3, -1],
          [-3, 1],
          [-1, -3],
          [-1, 3],
          [1, -3],
          [1, 3],
          [3, -1],
          [3, 1],
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1]
        ],
        c: [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2],
          [-2, 0],
          [0, -2],
          [2, 0],
          [0, 2]
        ]
      },
      ChessRules.steps,
    );
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0) {
      return (
        "2cwamwc2/1rnbqkbnr1/pppppppppp/91/91/" +
        "91/91/PPPPPPPPPP/1RNBQKBNR1/2CWAMWC2/ " +
        "w 0 bibi -"
      );
    }

    const baseFen = V.ParseFen(ChessRules.GenRandInitFen(options));
    const positionParts = baseFen.position.split("/");
    const bFen = (
      "1" + positionParts[0] +
      "1/pppppppppp/91/91/91/91/PPPPPPPPPP/1" +
      positionParts[7] + "1"
    );
    // Now just obtain randomized new pieces placements:
    let pieces = { w: new Array(6), b: new Array(6) };
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = shuffle(ArrayFun.range(6));
      const composition = ['w', 'w', 'c', 'c', 'a', 'm'];
      let rem2 = positions[0] % 2;
      if (rem2 == positions[1] % 2) {
        // Fix wizards (on different colors)
        for (let i=4; i<6; i++) {
          if (positions[i] % 2 != rem2)
            [positions[1], positions[i]] = [positions[i], positions[1]];
        }
      }
      rem2 = positions[2] % 2;
      if (rem2 == positions[3] % 2) {
        // Fix champions too: [NOTE: positions[4] & [5] should do]
        for (let i=4; i<6; i++) {
          if (positions[i] % 2 != rem2)
            [positions[3], positions[i]] = [positions[i], positions[3]];
        }
      }
      for (let i = 0; i < 9; i++) pieces[c][positions[i]] = composition[i];
    }
    return (
      "2" + pieces["b"].join("") + "2/" +
      bFen +
      "/2" + pieces["w"].join("").toUpperCase() + "2" +
      " w 0 -"
    );
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.MARSHALL:
        return this.getPotentialMarshallMoves([x, y]);
      case V.ARCHBISHOP:
        return this.getPotentialArchbishopMoves([x, y]);
      case V.CHAMPION:
        return this.getPotentialChampionMoves([x, y]);
      case V.WIZARD:
        return this.getPotentialWizardMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialMarshallMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], 1)
    );
  }

  getPotentialArchbishopMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], 1)
    );
  }

  getPotentialChampionMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.CHAMPION], 1);
  }

  getPotentialWizardMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.WIZARD], 1);
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByMarshall(sq, color) ||
      this.isAttackedByArchbishop(sq, color) ||
      this.isAttackedByChampion(sq, color) ||
      this.isAttackedByWizard(sq, color)
    );
  }

  isAttackedByMarshall(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.MARSHALL, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(sq, color, V.MARSHALL, V.steps[V.KNIGHT], 1)
    );
  }

  isAttackedByArchbishop(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.ARCHBISHOP, V.steps[V.BISHOP])
      ||
      this.isAttackedBySlideNJump(
        sq, color, V.ARCHBISHOP, V.steps[V.KNIGHT], 1)
    );
  }

  isAttackedByWizard(sq, color) {
    return this.isAttackedBySlideNJump(
      sq, color, V.WIZARD, V.steps[V.WIZARD], 1);
  }

  isAttackedByChampion(sq, color) {
    return this.isAttackedBySlideNJump(
      sq, color, V.CHAMPION, V.steps[V.CHAMPION], 1);
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  static get VALUES() {
    return Object.assign(
      {
        c: 4,
        w: 3,
        a: 6,
        m: 8
      },
      ChessRules.VALUES
    );
  }

};
