import { ChessRules, Move, PiPo } from "@/base_rules";

export class DynamoRules extends ChessRules {
  // TODO: later, allow to push out pawns on a and h files
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
    if (amove != "-") {
      const amoveParts = amove.split("/");
      let amove = {
        // No need for start & end
        appear: [],
        vanish: []
      };
      [0, 1].map(i => {
        amoveParts[i].split(".").forEach(av => {
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
    // Stack "first moves" (on subTurn 1) to merge and check opposite moves
    this.firstMove = [];
  }

  static ParseFen(fen) {
    return Object.assign(
      ChessRules.ParseFen(fen),
      { amove: fen.split(" ")[4] }
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

  getFen() {
    return super.getFen() + " " + this.getAmoveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getAmoveFen();
  }

  getAmoveFen() {
    const L = this.amoves.length;
    return (
      ["appear","vanish"].map(
        mpart => {
          return (
            this.amoves[L-1][mpart].map(
              av => {
                const square = V.CoordsToSquare({ x: av.x, y: av.y });
                return av.c + av.p + square;
              }
            ).join(".")
          );
        }
      ).join("/")
    );
  }

  canTake() {
    // Captures don't occur (only pulls & pushes)
    return false;
  }

  // "pa": piece (as a square) doing this push/pull action
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
    return moves;
  }

  // Actions on piece on square "sq", by color "color"
  // NOTE: to push a piece out of the board, make it slide until our piece
  // (doing the action, moving or not)
  getPactions(sq, color) {
    const [x, y] = sq;
    let moves = [];
    let squares = {};
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
    return moves;
  }

  // NOTE: for pushes, play the pushed piece first.
  //       for pulls: play the piece doing the action first
  // If castle, then no options available next (just re-click)
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    if (this.subTurn == 1) {
      // Free to play any move or action:
      return (
        super.getPotentialMovesFrom([x, y])
        .concat(this.getPactions([x, y], color))
      );
    }
    // If subTurn == 2 then we should have a first move,
    // which restrict what we can play now.
    // Case 1: an opponent's piece moved: we can only move the piece which
    //         did the action, in the moving direction.
    // Case 2: one of our pieces moved: either by action or by itself.
    //         Just check if it could be a normal move. If yes, allow both.
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (fm.vanish[0].c != color) {
      // Case 1: TODO
    }
    else {
      // Case 2: TODO
      // Use fm.start.x, fm.start.y, fm.end.x, fm.end.y, fm.vanish[0].c
      // Search for the piece doing the action "pa": the action type
      // is deduced from pa relative positon then.
    }
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
      m1.appear.length == 2 &&
      m2.appear.length == 2 &&
      m1.vanish.length == 2 &&
      m2.vanish.length == 2 &&
      isEqual(m1.appear, m2.vanish) &&
      isEqual(m1.vanish, m2.appear)
    );
  }

  getAmove(move1, move2) {
    // Just merge (one is action one is move, one may be empty)
    return {
      appear: move1.appear.concat(move2.appear),
      vanish: move1.vanish.concat(move2.vanish)
    }
  }

  filterValid(moves) {
    const color = this.turn;
    if (this.subTurn == 1) {
      return moves.filter(m => {
        // A move is valid either if it doesn't result in a check,
        // or if a second move is possible to counter the check
        // (not undoing a potential move + action of the opponent)
        this.play(m);
        let res = this.underCheck(color);
        if (res) {
          const moves2 = this.getAllPotentialMoves();
          for (m2 of moves2) {
            this.play(m2);
            const res2 = this.underCheck(color);
            this.undo(m2);
            if (!res2) {
              res = false;
              break;
            }
          }
        }
        this.undo(m);
        return !res;
      });
    }
    const Lf = this.firstMove.length;
    const La = this.amoves.length;
    if (La == 0) return super.filterValid(moves);
    return (
      super.filterValid(
        moves.filter(m => {
          // Move shouldn't undo another:
          const amove = this.getAmove(this.firstMove[Lf-1], m);
          return !this.oppositeMoves(this.amoves[La-1], amove);
        })
      )
    );
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

  doClick(square) {
    // If subTurn == 2 && square is the final square of last move,
    // then return an empty move
    const L = this.firstMove.length;
    if (
      this.subTurn == 2 &&
      square.x == this.firstMove[L-1].end.x &&
      square.y == this.firstMove[L-1].end.y
    ) {
      return {
        appear: [],
        vanish: []
      };
    }
    return null;
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    if (this.subTurn == 2) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
    }
    else this.firstMove.push(move);
    this.subTurn = 3 - this.subTurn;
    this.postPlay(move);
  }

  updateCastleFlags(move, piece) {
    const c = V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    // Update castling flags
    if (piece == V.KING) this.castleFlags[c] = [V.size.y, V.size.y];
    for (let v of move.vanish) {
      if (v.x == firstRank && this.castleFlags[c].includes(v.y)) {
        const flagIdx = (v.y == this.castleFlags[c][0] ? 0 : 1);
        this.castleFlags[c][flagIdx] = V.size.y;
      }
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.subTurn == 1) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    else this.firstMove.pop();
    this.subTurn = 3 - this.subTurn;
    this.postUndo(move);
  }
};
