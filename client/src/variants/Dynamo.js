import { ChessRules, Move, PiPo } from "@/base_rules";

export class DynamoRules extends ChessRules {
  // TODO: later, allow to push out pawns on a and h files?
  static get HasEnpassant() {
    return false;
  }

  canIplay(side, [x, y]) {
    // Sometimes opponent's pieces can be moved directly
    return true;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
    // Local stack of "action moves"
    this.amoves = [];
    const amove = V.ParseFen(fen).amove;
    if (cmove == "-") this.amoves.push(null);
    else {
      const amoveParts = amove.split("/");
      let amove = {
        // No need for start & end
        appear: [],
        vanish: []
      };
      [0, 1].map(i => {
        amoveParts[0].split(".").forEach(av => {
          // Format is "bpe3"
          const xy = V.SquareToCoords(av.substr(2));
          move[i == 0 ? "appear" : "vanish"].push(
            new PiPo({
              x: xy.x,
              y: xy.y,
              c: av[0],
              p: av[1]
            })
          );
        });
      });
      this.amoves.push(move);
    }
  }

  static ParseFen(fen) {
    return Object.assign(
      ChessRules.ParseFen(fen),
      { cmove: fen.split(" ")[4] }
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 6) return false;
    if (fenParts[5] != "-" && !fenParts[5].match(/^([a-h][1-8]){2}$/))
      return false;
    return true;
  }

  getAmove(move) {
    if (move.appear.length == 2 && move.vanish.length == 2)
      return { appear: move.appear, vanish: move.vanish };
    return null;
  }

  // TODO: this.firstMove + rooks location in setOtherVariables
  // only rooks location in FEN (firstMove is forgotten if quit game and come back)
  doClick(square) {
    // If subTurn == 2 && square is the final square of last move,
    // then return an empty move
    if (
      this.subTurn == 2 &&
      square.x == this.firstMove.end.x &&
      square.y == this.firstMove.end.y
    ) {
      return {
        appear: [],
        vanish: []
      };
    }
    return null;
  }

  canTake() {
    // Captures don't occur (only pulls & pushes)
    return false;
  }

  // "pa" : piece (as a square) doing this push/pull action
  getActionMoves([sx, sy], [ex, ey], pa) {
    const color = this.getColor(sx, sy);
    const lastRank = (color == 'w' ? 0 : 7);
    const piece = this.getPiece(sx, sy);
    let moves = [];
    if (ex == lastRank && piece == V.PAWN) {
      // Promotion by push or pull
      V.PawnSpecs.promotions.forEach(p => {
        let move = super.getBasicMove([sx, sy], [ex, ey], { c: color, p: p });
        moves.push(move);
      });
    } else moves.push(super.getBasicMove([sx, sy], [ex, ey]));
    const actionType =
      (
        Math.abs(pa[0] - sx) < Math.abs(pa[0] - ex) ||
        Math.abs(pa[1] - sy) < Math.abs(pa[1] - ey)
      )
        ? "push"
        : "pull";
    moves.forEach(m => m.action = [{ by: pa, type: actionType }]);
    return moves;
  }

  // TODO: if type is given, consider only actions of this type
  getPactions(sq, color, type) {
    const [x, y] = sq;
    let moves = [];
    let squares = {};
    if (!by) {
      const oppCol = V.GetOppCol(color);
      // Look in all directions for a "color" piece
      for (let step of V.steps[V.KNIGHT]) {
        const xx = x + step[0],
              yy = y + step[1];
        if (
          V.OnBoard(xx, yy) &&
          this.getPiece(xx, yy) == V.KNIGHT &&
          this.getColor(xx, yy) == color
        ) {
          const px = x - step[0],
                py = y - step[1];
          if (V.OnBoard(px, py)) {
            if (this.board[px][py] == V.EMPTY) {
              const hash = "s" + px + py;
              if (!squares[hash]) {
                squares[hash] = true;
                Array.prototype.push.apply(
                  moves,
                  this.getActionMoves([x, y], [px, py], [xx, yy])
                );
              }
              else { //add piece doing action
              }
            }
          } else {
            const hash = "s" + xx + yy;
            if (!squares[hash]) {
              squares[hash] = true;
              moves.push(
                new Move({
                  start: { x: x, y: y },
                  end: { x: xx, y: yy },
                  appear: [],
                  vanish: [
                    new PiPo({
                      x: x,
                      y: y,
                      p: this.getPiece(x, y),
                      c: oppCol
                    })
                  ]
                })
              );
            }
          }
        }
      }
      for (let step in V.steps[V.ROOK]) {
        // (+ if color is ours, pawn pushes) king, rook and queen
        // --> pawns special case can push from a little distance if on 2nd rank (or 1st rank)
      }
      for (let step in V.steps[V.BISHOP]) {
        // King, bishop, queen, and possibly pawns attacks (if color is enemy)
      }
    }
    return moves;
  }

  // NOTE: to push a piece out of the board, make it slide until our piece
  // (doing the action, moving or not)
  // TODO: for pushes, play the pushed piece first.
  //       for pulls: play the piece doing the action first
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    if (this.getColor(x, y) != color)
      // The only moves possible with enemy pieces are pulls and pushes:
      return this.getPactions([x, y], color);
    // Playing my pieces: either on their own, or pushed by another
    // If subTurn == 2 then we should have a first move,
    // TODO = use it to allow some type of action
    if (this.subTurn == 2) {
      return (
        this.moveOnSubturn1.isAnAction
          ? super.getPotentialMovesFrom([x, y])
          : this.getPactions([x, y], color, TODO_arg)
      );
    }
    // Both options are possible at subTurn1: normal move, or push
    return (
      super.getPotentialMovesFrom([x, y])
      .concat(this.getPactions([x, y], color, "push"))
      // TODO: discard moves that let the king underCheck, and no second
      // move can counter check. Example: pinned queen pushes pinned pawn.
      .filter(m => {
        this.play(m);
        const res = this.filterMoves(this.getPotentialMoves(/* TODO: args? */)).length > 0;
        this.undo(m);
        return res;
      })
    );
  }

  // TODO: track rooks locations, should be a field in FEN, in castleflags?
  // --> only useful if castleFlags is still ON
  getCastleMoves(sq) {
    // TODO: if rook1 isn't at its place (with castleFlags ON), set it off
    // same for rook2.
    let moves = super.getCastleMoves(sq);
    // TODO: restore castleFlags
  }

  // Does m2 un-do m1 ? (to disallow undoing actions)
  oppositeMoves(m1, m2) {
    const isEqual = (av1, av2) => {
      // Precondition: av1 and av2 length = 2
      for (let av of av1) {
        const avInAv2 = av2.find(elt => {
          return (
            elt.x == av.x &&
            elt.y == av.y &&
            elt.c == av.c &&
            elt.p == av.p
          );
        });
        if (!avInAv2) return false;
      }
      return true;
    };
    return (
      !!m1 &&
      m1.appear.length == 2 &&
      m2.appear.length == 2 &&
      m1.vanish.length == 2 &&
      m2.vanish.length == 2 &&
      isEqual(m1.appear, m2.vanish) &&
      isEqual(m1.vanish, m2.appear)
    );
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    return moves.filter(m => {
      const L = this.amoves.length; //at least 1: init from FEN
      return !this.oppositeMoves(this.amoves[L - 1], m);
    });
  }

  isAttackedBySlideNJump([x, y], color, piece, steps, oneStep) {
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY && !oneStep) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color
      ) {
        // Now step in the other direction: if end of the world, then attacked
        rx = x - step[0];
        ry = y - step[1];
        while (
          V.OnBoard(rx, ry) &&
          this.board[rx][ry] == V.EMPTY &&
          !oneStep
        ) {
          rx -= step[0];
          ry -= step[1];
        }
        if (!V.OnBoard(rx, ry)) return true;
      }
    }
    return false;
  }

  isAttackedByPawn([x, y], color) {
    const lastRank = (color == 'w' ? 0 : 7);
    if (y != lastRank)
      // The king can be pushed out by a pawn only on last rank
      return false;
    const pawnShift = (color == "w" ? 1 : -1);
    for (let i of [-1, 1]) {
      if (
        y + i >= 0 &&
        y + i < V.size.y &&
        this.getPiece(x + pawnShift, y + i) == V.PAWN &&
        this.getColor(x + pawnShift, y + i) == color
      ) {
        return true;
      }
    }
    return false;
  }

  getCurrentScore() {
    if (this.subTurn == 2)
      // Move not over
      return "*";
    return super.getCurrentScore();
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    if (this.subTurn == 1) {
      // TODO: is there a second move possible?
      // (if the first move is a normal one, there may be no actions available)
      // --> If not, just change turn as ion the else {} section
      this.subTurn = 2;
      this.movesCount++;
    } else {
      // subTurn == 2
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
    }
    this.postPlay(move);
  }

  updateCastleFlags(move, piece) {
    const c = V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    // Update castling flags if rooks are moved (only)
    if (piece == V.KING && move.appear.length > 0)
      this.castleFlags[c] = [V.size.y, V.size.y];
    else if (
      move.start.x == firstRank &&
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.subTurn == 2) {
      this.subTurn = 1;
      this.movesCount--;
    }
    else {
      // subTurn == 1 (after a move played)
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 2;
    }
    this.postUndo(move);
  }
};
