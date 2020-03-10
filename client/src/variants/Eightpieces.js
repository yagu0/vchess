import { ArrayFun } from "@/utils/array";
import { randInt, shuffle } from "@/utils/alea";
import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class EightpiecesRules extends ChessRules {
  static get JAILER() {
    return "j";
  }
  static get SENTRY() {
    return "s";
  }
  static get LANCER() {
    return "l";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.JAILER, V.SENTRY, V.LANCER]);
  }

  static get LANCER_DIRS() {
    return {
      'c': [-1, 0], //north
      'd': [-1, 1], //N-E
      'e': [0, 1], //east
      'f': [1, 1], //S-E
      'g': [1, 0], //south
      'h': [1, -1], //S-W
      'm': [0, -1], //west
      'o': [-1, -1] //N-W
    };
  }

  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    // Special lancer case: 8 possible orientations
    if (Object.keys(V.LANCER_DIRS).includes(piece)) return V.LANCER;
    return piece;
  }

  getPpath(b) {
    return (
      ([V.JAILER, V.SENTRY, V.LANCER].includes(b[1])
        ? "Eightpieces/" : "") + b
    );
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // subTurn == 2 only when a sentry moved, and is about to push something
    this.subTurn = 1;
    // Stack pieces' forbidden squares after a sentry move at each turn
    this.sentryPath = [];
  }

  canTake([x1,y1], [x2, y2]) {
    if (this.subTurn == 2)
      // Sentry push: pieces can capture own color (only)
      return this.getColor(x1, y1) == this.getColor(x2, y2);
    return super.canTake([x1,y1], [x2, y2]);
  }

  static GenRandInitFen(randomness) {
    // TODO: special conditions
  }

  // TODO: rook + jailer
  scanKingsRooks(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
          case "l":
            this.kingPos["b"] = [i, k];
            break;
          case "K":
          case "L":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  getPotentialMovesFrom([x,y]) {
    // if subTurn == 2, allow only 
  }

  // getPotentialMoves, isAttacked: TODO
  getPotentialCastleMoves(sq) { //TODO: adapt, with jailer
  }

  updateVariables(move) {
    // TODO: stack sentryPath if subTurn == 2 --> all squares between move.start et move.end, sauf si c'est un pion
  }

  // TODO: special pass move: take jailer with king

  // subTurn : if sentry moved to some enemy piece --> enregistrer déplacement sentry, subTurn == 2, puis déplacer pièce adverse --> 1st 1/2 of turn, vanish sentry tout simplement.
  // --> le turn ne change pas !
  // 2nd half: move only 
  // FEN flag: sentryPath from init pushing to final enemy square --> forbid some moves (getPotentialMoves)

  static get VALUES() {
    return Object.assign(
      { l: 4.8, s: 2.8, j: 3.8 }, //Jeff K. estimations
      ChessRules.VALUES
    );
  }
};
