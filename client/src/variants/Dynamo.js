import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class DynamoRules extends ChessRules {
  // TODO: later, allow to push out pawns on a and h files
  static get HasEnpassant() {
    return false;
  }

  canIplay(side, [x, y]) {
    // Sometimes opponent's pieces can be moved directly
    return this.turn == side;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
    // Local stack of "action moves"
    this.amoves = [];
    const amove = V.ParseFen(fen).amove;
    if (amove != "-") {
      const amoveParts = amove.split("/");
      let move = {
        // No need for start & end
        appear: [],
        vanish: []
      };
      [0, 1].map(i => {
        if (amoveParts[i] != "-") {
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
        }
      });
      this.amoves.push(move);
    }
    this.subTurn = 1;
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
    if (fenParts.length != 5) return false;
    if (fenParts[4] != "-") {
      // TODO: a single regexp instead.
      // Format is [bpa2[.wpd3]] || '-'/[bbc3[.wrd5]] || '-'
      const amoveParts = fenParts[4].split("/");
      if (amoveParts.length != 2) return false;
      for (let part of amoveParts) {
        if (part != "-") {
          for (let psq of part.split("."))
            if (!psq.match(/^[a-r]{3}[1-8]$/)) return false;
        }
      }
    }
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
    if (L == 0) return "-";
    return (
      ["appear","vanish"].map(
        mpart => {
          if (this.amoves[L-1][mpart].length == 0) return "-";
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

  // Step is right, just add (push/pull) moves in this direction
  // Direction is assumed normalized.
  getMovesInDirection([x, y], [dx, dy], nbSteps) {
    nbSteps = nbSteps || 8; //max 8 steps anyway
    let [i, j] = [x + dx, y + dy];
    let moves = [];
    const color = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    const lastRank = (color == 'w' ? 0 : 7);
    let counter = 1;
    while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
      if (i == lastRank && piece == V.PAWN) {
        // Promotion by push or pull
        V.PawnSpecs.promotions.forEach(p => {
          let move = super.getBasicMove([x, y], [i, j], { c: color, p: p });
          moves.push(move);
        });
      }
      else moves.push(super.getBasicMove([x, y], [i, j]));
      if (++counter > nbSteps) break;
      i += dx;
      j += dy;
    }
    if (!V.OnBoard(i, j) && piece != V.KING) {
      // Add special "exit" move, by "taking king"
      moves.push(
        new Move({
          start: { x: x, y: y },
          end: { x: this.kingPos[color][0], y: this.kingPos[color][1] },
          appear: [],
          vanish: [{ x: x, y: y, c: color, p: piece }]
        })
      );
    }
    return moves;
  }

  // Normalize direction to know the step
  getNormalizedDirection([dx, dy]) {
    const absDir = [Math.abs(dx), Math.abs(dy)];
    let divisor = 0;
    if (absDir[0] != 0 && absDir[1] != 0 && absDir[0] != absDir[1])
      // Knight
      divisor = Math.min(absDir[0], absDir[1]);
    else
      // Standard slider (or maybe a pawn or king: same)
      divisor = Math.max(absDir[0], absDir[1]);
    return [dx / divisor, dy / divisor];
  }

  // There was something on x2,y2, maybe our color, pushed/pulled.
  isAprioriValidExit([x1, y1], [x2, y2], color2) {
    const color1 = this.getColor(x1, y1);
    const pawnShift = (color1 == 'w' ? -1 : 1);
    const lastRank = (color1 == 'w' ? 0 : 7);
    const deltaX = Math.abs(x1 - x2);
    const deltaY = Math.abs(y1 - y2);
    const checkSlider = () => {
      const dir = this.getNormalizedDirection([x2 - x1, y2 - y1]);
      let [i, j] = [x1 + dir[0], y1 + dir[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += dir[0];
        j += dir[1];
      }
      return !V.OnBoard(i, j);
    };
    switch (this.getPiece(x1, y1)) {
      case V.PAWN:
        return (
          x1 + pawnShift == x2 &&
          (
            (color1 == color2 && x2 == lastRank && y1 == y2) ||
            (color1 != color2 && deltaY == 1 && !V.OnBoard(x2, 2 * y2 - y1))
          )
        );
      case V.ROOK:
        if (x1 != x2 && y1 != y2) return false;
        return checkSlider();
      case V.KNIGHT:
        return (
          deltaX + deltaY == 3 &&
          (deltaX == 1 || deltaY == 1) &&
          !V.OnBoard(2 * x2 - x1, 2 * y2 - y1)
        );
      case V.BISHOP:
        if (deltaX != deltaY) return false;
        return checkSlider();
      case V.QUEEN:
        if (deltaX != 0 && deltaY != 0 && deltaX != deltaY) return false;
        return checkSlider();
      case V.KING:
        return (
          deltaX <= 1 &&
          deltaY <= 1 &&
          !V.OnBoard(2 * x2 - x1, 2 * y2 - y1)
        );
    }
    return false;
  }

  isAprioriValidVertical([x1, y1], x2) {
    const piece = this.getPiece(x1, y1);
    const deltaX = Math.abs(x1 - x2);
    const startRank = (this.getColor(x1, y1) == 'w' ? 6 : 1);
    return (
      [V.QUEEN, V.ROOK].includes(piece) ||
      (
        [V.KING, V.PAWN].includes(piece) &&
        (
          deltaX == 1 ||
          (deltaX == 2 && piece == V.PAWN && x1 == startRank)
        )
      )
    );
  }

  // NOTE: for pushes, play the pushed piece first.
  //       for pulls: play the piece doing the action first
  // NOTE: to push a piece out of the board, make it slide until its king
  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    const sqCol = this.getColor(x, y);
    if (this.subTurn == 1) {
      const getMoveHash = (m) => {
        return V.CoordsToSquare(m.start) + V.CoordsToSquare(m.end);
      };
      const addMoves = (dir, nbSteps) => {
        const newMoves =
          this.getMovesInDirection([x, y], [-dir[0], -dir[1]], nbSteps)
          .filter(m => !movesHash[getMoveHash(m)]);
        newMoves.forEach(m => { movesHash[getMoveHash(m)] = true; });
        Array.prototype.push.apply(moves, newMoves);
      };
      // Free to play any move (if piece of my color):
      let moves =
        sqCol == color
          ? super.getPotentialMovesFrom([x, y])
          : [];
      // There may be several suicide moves: keep only one
      let hasExit = false;
      moves = moves.filter(m => {
        const suicide = (m.appear.length == 0);
        if (suicide) {
          if (hasExit) return false;
          hasExit = true;
        }
        return true;
      });
      const pawnShift = (color == 'w' ? -1 : 1);
      const pawnStartRank = (color == 'w' ? 6 : 1);
      // Structure to avoid adding moves twice (can be action & move)
      let movesHash = {};
      moves.forEach(m => { movesHash[getMoveHash(m)] = true; });
      // [x, y] is pushed by 'color'
      for (let step of V.steps[V.KNIGHT]) {
        const [i, j] = [x + step[0], y + step[1]];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.KNIGHT
        ) {
          addMoves(step, 1);
        }
      }
      for (let step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
        let [i, j] = [x + step[0], y + step[1]];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color
        ) {
          const deltaX = Math.abs(i - x);
          const deltaY = Math.abs(j - y);
          switch (this.getPiece(i, j)) {
            case V.PAWN:
              if (
                (x - i) / deltaX == pawnShift &&
                deltaX <= 2 &&
                deltaY <= 1
              ) {
                if (sqCol == color && deltaY == 0) {
                  // Pushed forward
                  const maxSteps = (i == pawnStartRank && deltaX == 1 ? 2 : 1);
                  addMoves(step, maxSteps);
                }
                else if (sqCol != color && deltaY == 1 && deltaX == 1)
                  // Pushed diagonally
                  addMoves(step, 1);
              }
              break;
            case V.ROOK:
              if (deltaX == 0 || deltaY == 0) addMoves(step);
              break;
            case V.BISHOP:
              if (deltaX == deltaY) addMoves(step);
              break;
            case V.QUEEN:
              // All steps are valid for a queen:
              addMoves(step);
              break;
            case V.KING:
              if (deltaX <= 1 && deltaY <= 1) addMoves(step, 1);
              break;
          }
        }
      }
      return moves;
    }
    // If subTurn == 2 then we should have a first move,
    // which restrict what we can play now: only in the first move direction
    // NOTE: no need for knight or pawn checks, because the move will be
    // naturally limited in those cases.
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (
      (fm.appear.length == 2 && fm.vanish.length == 2) ||
      (fm.vanish[0].c == sqCol && sqCol != color)
    ) {
      // Castle or again opponent color: no move playable then.
      return [];
    }
    if (fm.appear.length == 0) {
      // Piece at subTurn 1 just exited the board.
      // Can I be a piece which caused the exit?
      if (
        // Only "turn" color can do actions
        sqCol == color &&
        this.isAprioriValidExit(
          [x, y],
          [fm.start.x, fm.start.y],
          fm.vanish[0].c
        )
      ) {
        // Seems so:
        const dir = this.getNormalizedDirection(
          [fm.start.x - x, fm.start.y - y]);
        const nbSteps =
          ([V.PAWN,V.KING,V.KNIGHT].includes(this.getPiece(x, y)) ? 1 : null);
        return this.getMovesInDirection([x, y], dir, nbSteps);
      }
    }
    else {
      const dirM = this.getNormalizedDirection(
        [fm.end.x - fm.start.x, fm.end.y - fm.start.y]);
      const dir = this.getNormalizedDirection(
        [fm.start.x - x, fm.start.y - y]);
      // Normalized directions should match
      if (dir[0] == dirM[0] && dir[1] == dirM[1]) {
        // If first move is a pawn move, only a queen, rook, or maybe king or
        // pawn can follow (need vertical movement option).
        if (
          fm.vanish[0].p == V.PAWN &&
          fm.vanish[0].c == color &&
          !this.isAprioriValidVertical([x, y], fm.start.x)
        ) {
          return [];
        }
        // And nothing should stand between [x, y] and the square fm.start
        let [i, j] = [x + dir[0], y + dir[1]];
        while (
          (i != fm.start.x || j != fm.start.y) &&
          this.board[i][j] == V.EMPTY
        ) {
          i += dir[0];
          j += dir[1];
        }
        if (i == fm.start.x && j == fm.start.y)
          return this.getMovesInDirection([x, y], dir);
      }
    }
    return [];
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    const c = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j)) {
        if (this.canTake([x, y], [i, j]))
          moves.push(this.getBasicMove([x, y], [i, j]));
      }
      else {
        // Add potential board exit (suicide), except for the king
        if (piece != V.KING) {
          moves.push({
            start: { x: x, y: y},
            end: { x: this.kingPos[c][0], y: this.kingPos[c][1] },
            appear: [],
            vanish: [
              new PiPo({
                x: x,
                y: y,
                c: c,
                p: piece
              })
            ]
          });
        }
      }
    }
    return moves;
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
          for (let m2 of moves2) {
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
        // Continue some steps in the same direction (pull)
        rx += step[0];
        ry += step[1];
        while (
          V.OnBoard(rx, ry) &&
          this.board[rx][ry] == V.EMPTY &&
          !oneStep
        ) {
          rx += step[0];
          ry += step[1];
        }
        if (!V.OnBoard(rx, ry)) return true;
        // Step in the other direction (push)
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
    if (x != lastRank)
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

  // No consideration of color: all pieces could be played
  getAllPotentialMoves() {
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    return potentialMoves;
  }

  getCurrentScore() {
    if (this.subTurn == 2)
      // Move not over
      return "*";
    return super.getCurrentScore();
  }

  doClick(square) {
    // If subTurn == 2 && square is empty && !underCheck,
    // then return an empty move, allowing to "pass" subTurn2
    if (
      this.subTurn == 2 &&
      this.board[square[0]][square[1]] == V.EMPTY &&
      !this.underCheck(this.turn)
    ) {
      return {
        start: { x: -1, y: -1 },
        end: { x: -1, y: -1 },
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
      const L = this.firstMove.length;
      this.amoves.push(this.getAmove(this.firstMove[L-1], move));
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
    }
    else this.firstMove.push(move);
    this.subTurn = 3 - this.subTurn;
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.start.x < 0) return;
    for (let a of move.appear)
      if (a.p == V.KING) this.kingPos[a.c] = [a.x, a.y];
    this.updateCastleFlags(move);
  }

  updateCastleFlags(move) {
    const firstRank = { 'w': V.size.x - 1, 'b': 0 };
    for (let v of move.vanish) {
      if (v.p == V.KING) this.castleFlags[v.c] = [V.size.y, V.size.y];
      else if (v.x == firstRank[v.c] && this.castleFlags[v.c].includes(v.y)) {
        const flagIdx = (v.y == this.castleFlags[v.c][0] ? 0 : 1);
        this.castleFlags[v.c][flagIdx] = V.size.y;
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

  postUndo(move) {
    // (Potentially) Reset king position
    for (let v of move.vanish)
      if (v.p == V.KING) this.kingPos[v.c] = [v.x, v.y];
  }

  getComputerMove() {
    let moves = this.getAllValidMoves();
    if (moves.length == 0) return null;
    // "Search" at depth 1 for now
    const maxeval = V.INFINITY;
    const color = this.turn;
    const emptyMove = {
      start: { x: -1, y: -1 },
      end: { x: -1, y: -1 },
      appear: [],
      vanish: []
    };
    moves.forEach(m => {
      this.play(m);
      m.eval = (color == "w" ? -1 : 1) * maxeval;
      const moves2 = this.getAllValidMoves().concat([emptyMove]);
      m.next = moves2[0];
      moves2.forEach(m2 => {
        this.play(m2);
        const score = this.getCurrentScore();
        let mvEval = 0;
        if (score != "1/2") {
          if (score != "*") mvEval = (score == "1-0" ? 1 : -1) * maxeval;
          else mvEval = this.evalPosition();
        }
        if (
          (color == 'w' && mvEval > m.eval) ||
          (color == 'b' && mvEval < m.eval)
        ) {
          m.eval = mvEval;
          m.next = m2;
        }
        this.undo(m2);
      });
      this.undo(m);
    });
    moves.sort((a, b) => {
      return (color == "w" ? 1 : -1) * (b.eval - a.eval);
    });
    let candidates = [0];
    for (let i = 1; i < moves.length && moves[i].eval == moves[0].eval; i++)
      candidates.push(i);
    const mIdx = candidates[randInt(candidates.length)];
    const move2 = moves[mIdx].next;
    delete moves[mIdx]["next"];
    return [moves[mIdx], move2];
  }

  getNotation(move) {
    if (move.start.x < 0)
      // A second move is always required, but may be empty
      return "-";
    const initialSquare = V.CoordsToSquare(move.start);
    const finalSquare = V.CoordsToSquare(move.end);
    if (move.appear.length == 0)
      // Pushed or pulled out of the board
      return initialSquare + "R";
    return move.appear[0].p.toUpperCase() + initialSquare + finalSquare;
  }
};
