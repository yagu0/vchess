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

  // No "under check" verifications:
  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    if (x != (c == "w" ? V.size.x - 1 : 0) || y != this.INIT_COL_KING[c])
      return []; //x isn't first rank, or king has moved (shortcut)

    // Castling ?
    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then rook:
    const finalSquares = [
      [2, 3],
      [V.size.y - 2, V.size.y - 3]
    ];
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= 8) continue;
      // If this code is reached, rooks and king are on initial position

      const rookPos = this.castleFlags[c][castleSide];
      if (this.getColor(x, rookPos) != c)
        // Rook is here but changed color
        continue;

      // Nothing on the path of the king ?
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      for (let i = y; i != finalSquares[castleSide][0]; i += step) {
        if (
          this.board[x][i] != V.EMPTY &&
            // NOTE: next check is enough, because of chessboard constraints
            (this.getColor(x, i) != c ||
              ![V.KING, V.ROOK].includes(this.getPiece(x, i)))
        ) {
          continue castlingCheck;
        }
      }

      // Nothing on the path to the rook?
      step = castleSide == 0 ? -1 : 1;
      for (i = y + step; i != rookPos; i += step) {
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
      }

      // Nothing on final squares, except maybe king and castling rook?
      for (i = 0; i < 2; i++) {
        if (
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          this.getPiece(x, finalSquares[castleSide][i]) != V.KING &&
          finalSquares[castleSide][i] != rookPos
        ) {
          continue castlingCheck;
        }
      }

      // If this code is reached, castle is valid
      moves.push(
        new Move({
          appear: [
            new PiPo({ x: x, y: finalSquares[castleSide][0], p: V.KING, c: c }),
            new PiPo({ x: x, y: finalSquares[castleSide][1], p: V.ROOK, c: c })
          ],
          vanish: [
            new PiPo({ x: x, y: y, p: V.KING, c: c }),
            new PiPo({ x: x, y: rookPos, p: V.ROOK, c: c })
          ],
          end:
            Math.abs(y - rookPos) <= 2
              ? { x: x, y: rookPos }
              : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
        })
      );
    }

    return moves;
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

  // No notion of check here:
  getCheckSquares() {
    return [];
  }

  // Stop at the first move found
  atLeastOneMove() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) != oppCol) {
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.length > 0)
            return true;
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
    if (this.atLeastOneMove())
      return "*";
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
