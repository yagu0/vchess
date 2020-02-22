import { ChessRules, PiPo, Move } from "@/base_rules";

export const VariantRules = class BenedictRules extends ChessRules {
  static get HasEnpassant() {
    return false;
  }

  // TODO(?): some duplicated code in 2 next functions
  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let loop = 0; loop < steps.length; loop++) {
      const step = steps[loop];
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      // No capture check: handled elsewhere (next method)
    }
    return moves;
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

  getPotentialPawnMoves([x, y]) {
    const color = this.getColor(x, y);
    let moves = [];
    const sizeY = V.size.y;
    const shift = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeY - 2 : 1;
    const firstRank = color == "w" ? sizeY - 1 : 0;
    const lastRank = color == "w" ? 0 : sizeY - 1;

    if (x + shift != lastRank) {
      // Normal moves
      if (this.board[x + shift][y] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [x + shift, y]));
        if (
          [startRank, firstRank].includes(x) &&
          this.board[x + 2 * shift][y] == V.EMPTY
        ) {
          // Two squares jump
          moves.push(this.getBasicMove([x, y], [x + 2 * shift, y]));
        }
      }
    }
    else {
      // Promotion
      let promotionPieces = [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
      promotionPieces.forEach(p => {
        // Normal move
        if (this.board[x + shift][y] == V.EMPTY)
          moves.push(
            this.getBasicMove([x, y], [x + shift, y], { c: color, p: p })
          );
      });
    }

    // No en passant here

    return moves;
  }

  getPotentialRookMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]);
  }

  getPotentialKnightMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep");
  }

  getPotentialBishopMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]);
  }

  getPotentialQueenMoves(sq) {
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
    );
  }

  getPotentialKingMoves(sq) {
    // Initialize with normal (non-capturing) moves
    let noCaptures = this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
    return noCaptures.concat(this.getCastleMoves(sq));
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
      V.PlayOnBoard(this.board, m);
      const flipped = this.findCaptures([m.end.x, m.end.y]);
      V.UndoOnBoard(this.board, m);
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
        m.appear.push(pipoA);
        m.vanish.push(pipoV);
      });
    });
    return moves;
  }

  // Moves cannot flip our king's color, so all are valid
  filterValid(moves) {
    return moves;
  }

  // No notion of check here:
  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    // Did a king change color?
    const kp = this.kingPos[color];
    if (this.getColor(kp[0], kp[1]) != color)
      return color == "w" ? "0-1" : "1-0";
    return "*";
  }
};
