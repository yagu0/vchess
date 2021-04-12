import { ChessRules, PiPo, Move } from "@/base_rules";

export class BenedictRules extends ChessRules {

  static get HasEnpassant() {
    return false;
  }

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      { canCapture: false }
    );
  }

  canTake() {
    return false;
  }

  // Find possible captures from a square
  // follow steps from x,y until something is met.
  findCaptures([x, y]) {
    const color = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    let squares = [];
    const steps =
      piece != V.PAWN
        ? [V.QUEEN,V.KING].includes(piece)
          ? V.steps[V.ROOK].concat(V.steps[V.BISHOP])
          : V.steps[piece]
        : color == "w"
          ? [
            [-1, -1],
            [-1, 1]
          ]
          : [
            [1, -1],
            [1, 1]
          ];
    const oneStep = [V.KNIGHT,V.PAWN,V.KING].includes(piece);
    outerLoop: for (let loop = 0; loop < steps.length; loop++) {
      const step = steps[loop];
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (
        V.OnBoard(i, j) &&
        this.getColor(i, j) == V.GetOppCol(color)
      ) {
        // eat!
        squares.push([i, j]);
      }
    }
    return squares;
  }

  // TODO: appear/vanish description of a move is too verbose for Benedict.
  // => Would need a new "flipped" array, to be passed in Game.vue...
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    // Get all moves from x,y without captures:
    let moves = super.getPotentialMovesFrom([x, y]);
    // Add flips:
    moves.forEach(m => {
      let newAppear = [];
      let newVanish = [];
      V.PlayOnBoard(this.board, m);
      // If castling, m.appear has 2 elements.
      // In this case, consider the attacks of moving units only.
      // (Sometimes the king or rook doesn't move).
      for (let i = 0; i < m.appear.length; i++) {
        const a  = m.appear[i];
        if (m.vanish[i].x != a.x || m.vanish[i].y != a.y) {
          const flipped = this.findCaptures([a.x, a.y]);
          flipped.forEach(sq => {
            const piece = this.getPiece(sq[0],sq[1]);
            const pipoA = new PiPo({
              x:sq[0],
              y:sq[1],
              c:color,
              p:piece
            });
            const pipoV = new PiPo({
              x:sq[0],
              y:sq[1],
              c:oppCol,
              p:piece
            });
            newAppear.push(pipoA);
            newVanish.push(pipoV);
          });
        }
      }
      Array.prototype.push.apply(m.appear, newAppear);
      Array.prototype.push.apply(m.vanish, newVanish);
      V.UndoOnBoard(this.board, m);
    });
    return moves;
  }

  // Moves cannot flip our king's color, so all are valid
  filterValid(moves) {
    return moves;
  }

  // Since it's used just for the king, and there are no captures:
  isAttacked(sq, color) {
    return false;
  }

  // No notion of check here:
  getCheckSquares() {
    return [];
  }

  // Stop at the first move found
  atLeastOneMove() {
    const color = this.turn;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          if (this.getPotentialMovesFrom([i, j]).length > 0) return true;
        }
      }
    }
    return false;
  }

  getCurrentScore() {
    const color = this.turn;
    // Did a king change color?
    const kp = this.kingPos[color];
    if (this.getColor(kp[0], kp[1]) != color)
      return color == "w" ? "0-1" : "1-0";
    if (this.atLeastOneMove()) return "*";
    // Stalemate:
    return "1/2";
  }

  getNotation(move) {
    // Just remove flips:
    const basicMove = {
      appear: [move.appear[0]],
      vanish: [move.vanish[0]],
      start: move.start,
      end: move.end
    };
    return super.getNotation(basicMove);
  }

};
