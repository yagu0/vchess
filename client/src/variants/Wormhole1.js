import { ChessRules } from "@/base_rules";
import { Wormhole2Rules } from "@/variants/Wormhole2";

export class Wormhole1Rules extends Wormhole2Rules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { promotions: [V.LION, V.CHAMPION, V.WIZARD, V.KNIGHT] }
    );
  }

  static get LION() {
    return 'm';
  }
  static get WIZARD() {
    return 'w';
  }
  static get CHAMPION() {
    return 'c';
  }

  static get PIECES() {
    return [V.PAWN, V.CHAMPION, V.KNIGHT, V.WIZARD, V.LION, V.KING];
  }

  getPpath(b) {
    if (b[0] == 'x') return "Wormhole/hole";
    if ([V.LION, V.CHAMPION, V.WIZARD].includes(b[1]))
      return "Wormhole/" + b;
    return b;
  }

  static get steps() {
    return {
      w: [
        [ [-2, 0], [-1, -1] ],
        [ [-2, 0], [-1, 1] ],
        [ [0, -2], [-1, -1] ],
        [ [0, 2], [-1, 1] ],
        [ [0, -2], [1, -1] ],
        [ [0, 2], [1, 1] ],
        [ [2, 0], [1, -1] ],
        [ [2, 0], [1, 1] ]
      ],
      d: [
        [-2, 0],
        [0, -2],
        [2, 0],
        [0, 2]
      ],
      a: [
        [2, 2],
        [2, -2],
        [-2, 2],
        [-2, -2]
      ],
      f: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ],
      z: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ],
      n: Wormhole2Rules.steps[V.KNIGHT],
      k: Wormhole2Rules.steps[V.KING]
    };
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "cnwmkwnc/pppppppp/8/8/8/8/PPPPPPPP/CNWMKWNC w 0";

    // Mapping new --> standard:
    const piecesMap = {
      'r': 'c',
      'n': 'n',
      'b': 'w',
      'q': 'm',
      'k': 'k'
    };

    const baseFen = ChessRules.GenRandInitFen(randomness);
    return (
      baseFen.substr(0, 8).split('').map(p => piecesMap[p]).join('') +
      baseFen.substr(8, 27) +
      baseFen.substr(35, 43).split('')
        .map(p => piecesMap[p]).join('').toUpperCase() +
      " w 0"
    );
  }

  getPotentialMovesFrom(sq) {
    switch (this.getPiece(sq[0], sq[1])) {
      case V.PAWN: return super.getPotentialPawnMoves(sq);
      case V.CHAMPION: return this.getPotentialChampionMoves(sq);
      case V.KNIGHT: return super.getPotentialKnightMoves(sq);
      case V.WIZARD: return this.getPotentialWizardMoves(sq);
      case V.LION: return this.getPotentialLionMoves(sq);
      case V.KING: return super.getPotentialKingMoves(sq);
    }
    return [];
  }

  getJumpMoves([x, y], steps, onlyTake) {
    let moves = [];
    for (let step of steps) {
      const sq = this.getSquareAfter([x,y], step);
      if (sq &&
        (
          (!onlyTake && this.board[sq[0]][sq[1]] == V.EMPTY) ||
          (this.board[sq[0]][sq[1]] != V.EMPTY && this.canTake([x, y], sq))
        )
      ) {
        moves.push(this.getBasicMove([x, y], sq));
      }
    }
    return moves;
  }

  getPotentialChampionMoves(sq) {
    const steps = V.steps['d'].concat(V.steps['a']).concat(V.steps['z']);
    return this.getJumpMoves(sq, steps);
  }

  getPotentialWizardMoves(sq) {
    const steps = V.steps['w'].concat(V.steps['f']);
    return this.getJumpMoves(sq, steps);
  }

  getPotentialLionMoves(sq) {
    let steps = V.steps['d'].concat(V.steps['a']);
    const moves1 = this.getJumpMoves(sq, steps);
    steps = V.steps['f'].concat(V.steps['z']);
    const moves2 = this.getJumpMoves(sq, steps, "onlyTake");
    return moves1.concat(moves2);
  }

  isAttacked(sq, color) {
    return (
      super.isAttackedByPawn(sq, color) ||
      this.isAttackedByChampion(sq, color) ||
      super.isAttackedByKnight(sq, color) ||
      this.isAttackedByWizard(sq, color) ||
      this.isAttackedByLion(sq, color) ||
      super.isAttackedByKing(sq, color)
    );
  }

  isAttackedByWizard(sq, color) {
    return (
      this.isAttackedByJump(sq, color, V.WIZARD, V.steps['f']) ||
      // NOTE: wizard attack is not symmetric in this variant:
      // steps order need to be reversed.
      this.isAttackedByJump(
        sq,
        color,
        V.WIZARD,
        V.steps['w'].map(s => s.reverse())
      )
    );
  }

  isAttackedByChampion(sq, color) {
    const steps = V.steps['d'].concat(V.steps['a']).concat(V.steps['z']);
    return this.isAttackedByJump(sq, color, V.CHAMPION, steps);
  }

  isAttackedByLion(sq, color) {
    const steps = V.steps['d'].concat(V.steps['a'])
                    .concat(V.steps['f']).concat(V.steps['z']);
    return this.isAttackedByJump(sq, color, V.LION, steps);
  }

  static get VALUES() {
    return {
      p: 1,
      n: 3,
      c: 8,
      m: 9,
      w: 3,
      k: 1000
    };
  }

};
