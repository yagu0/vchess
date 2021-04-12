import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class BarioRules extends ChessRules {

  static get Options() {
    return null;
  }

  // Does not really seem necessary (although the author mention it)
  // Instead, first move = pick a square for the king.
  static get HasFlags() {
    return false;
  }

  // Undetermined piece form:
  static get UNDEFINED() {
    return 'u';
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.UNDEFINED);
  }

  getPpath(b) {
    if (b[1] == V.UNDEFINED) return "Bario/" + b;
    return b;
  }

  canIplay(side, [x, y]) {
    if (this.movesCount >= 2) return super.canIplay(side, [x, y]);
    return (
      this.turn == side &&
      (
        (side == 'w' && x == 7) ||
        (side == 'b' && x == 0)
      )
    );
  }

  hoverHighlight([x, y]) {
    const c = this.turn;
    return (
      this.movesCount <= 1 &&
      (
        (c == 'w' && x == 7) ||
        (c == 'b' && x == 0)
      )
    );
  }

  onlyClick([x, y]) {
    return (
      this.movesCount <= 1 ||
      // TODO: next line theoretically shouldn't be required...
      (this.movesCount == 2 && this.getColor(x, y) != this.turn)
    );
  }

  // Initiate the game by choosing a square for the king:
  doClick(square) {
    const c = this.turn;
    if (
      this.movesCount >= 2 ||
      (
        (c == 'w' && square[0] != 7) ||
        (c == 'b' && square[0] != 0)
      )
    ) {
      return null;
    }
    return new Move({
      appear: [
        new PiPo({ x: square[0], y: square[1], c: c, p: V.KING })
      ],
      vanish: [
        new PiPo({ x: square[0], y: square[1], c: c, p: V.UNDEFINED })
      ],
      start: { x: -1, y: -1 }
    });
  }

  // Do not check kings (TODO: something more subtle!)
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    return true;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{8,8}$/))
    if (!fenParsed.capture) return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      {
        reserve: fenParts[4],
        capture: fenParts[5]
      },
      ChessRules.ParseFen(fen)
    );
  }

  getReserveFen() {
    let counts = new Array(8);
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.RESERVE_PIECES[i]];
      counts[4 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
    }
    return counts.join("");
  }

  getCaptureFen() {
    const L = this.captureUndefined.length;
    const cu = this.captureUndefined[L-1];
    return (!!cu ? V.CoordsToSquare(cu) : "-");
  }

  getFen() {
    return (
      super.getFen() + " " +
      this.getReserveFen() + " " +
      this.getCaptureFen()
    );
  }

  getFenForRepeat() {
    return (
      super.getFenForRepeat() + "_" +
      this.getReserveFen() + "_" +
      this.getCaptureFen()
    );
  }

  static GenRandInitFen() {
    return "uuuuuuuu/pppppppp/8/8/8/8/PPPPPPPP/UUUUUUUU w 0 - 22212221 -";
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        [V.ROOK]: reserve[0],
        [V.KNIGHT]: reserve[1],
        [V.BISHOP]: reserve[2],
        [V.QUEEN]: reserve[3]
      },
      b: {
        [V.ROOK]: reserve[4],
        [V.KNIGHT]: reserve[5],
        [V.BISHOP]: reserve[6],
        [V.QUEEN]: reserve[7]
      }
    };
    const cu = V.ParseFen(fen).capture;
    this.captureUndefined = [cu == '-' ? null : V.SquareToCoords(cu)];
    this.subTurn = (cu == "-" ? 1 : 0);
    // Local stack of pieces' definitions
    this.definitions = [];
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  getReservePpath(index, color) {
    return color + V.RESERVE_PIECES[index];
  }

  static get RESERVE_PIECES() {
    return [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    // 2 cases, subTurn == 0 => target this.captureUndefined only (one square)
    if (this.subTurn == 0) {
      const L = this.captureUndefined.length;
      const cu = this.captureUndefined[L-1];
      return [
        // Nothing changes on the board, just mark start.p for reserve update
        new Move({
          appear: [],
          vanish: [],
          start: { x: x, y: y, p: p },
          end: { x: cu.x, y: cu.y }
        })
      ];
    }
    // or, subTurn == 1 => target any undefined piece that we own.
    let moves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.UNDEFINED
        ) {
          let mv = new Move({
            appear: [
              new PiPo({ x: i, y: j, c: color, p: p })
            ],
            vanish: [
              new PiPo({ x: i, y: j, c: color, p: V.UNDEFINED })
            ],
            start: { x: x, y: y },
            end: { x: i, y: j }
          });
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 0) {
      if (x < V.size.x) return [];
      return this.getReserveMoves([x, y]);
    }
    if (this.subTurn == 1) {
      // Both normal move (from defined piece) and definition allowed
      if (x >= V.size.x) return this.getReserveMoves([x, y]);
      if (this.getPiece(x, y) == V.UNDEFINED) return [];
    }
    // subTurn == 1 and we move any piece, or
    // subTurn == 2 and we can only move the just-defined piece
    if (this.subTurn == 2) {
      const L = this.definitions.length; //at least 1
      const df = this.definitions[L-1];
      if (x != df.x || y != df.y) return [];
    }
    return super.getPotentialMovesFrom([x, y]);
  }

  getAllPotentialMoves() {
    const color = this.turn;
    if (this.movesCount <= 1) {
      // Just put the king on the board
      const firstRank = (color == 'w' ? 7 : 0);
      return [...Array(8)].map((x, j) => {
        return new Move({
          appear: [
            new PiPo({ x: firstRank, y: j, c: color, p: V.KING })
          ],
          vanish: [
            new PiPo({ x: firstRank, y: j, c: color, p: V.UNDEFINED })
          ],
          start: { x: -1, y: -1 }
        });
      });
    }
    const getAllReserveMoves = () => {
      let moves = [];
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        moves = moves.concat(
          this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
        );
      }
      return moves;
    }
    if (this.subTurn == 0) return getAllReserveMoves();
    let moves = super.getAllPotentialMoves();
    if (this.subTurn == 1)
      moves = moves.concat(getAllReserveMoves());
    return this.filterValid(moves);
  }

  filterValid(moves) {
    if (this.movesCount <= 1) return moves;
    const color = this.turn;
    return moves.filter(m => {
      if (m.vanish.length == 0) {
        // subTurn == 0: need to check if a move exists at subTurn == 1
        this.play(m);
        const res = this.filterValid(this.getAllPotentialMoves()).length > 0;
        this.undo(m);
        return res;
      }
      const start = { x: m.vanish[0].x, y: m.vanish[0].y };
      const end = { x: m.appear[0].x, y: m.appear[0].y };
      if (start.x == end.x && start.y == end.y) {
        // Unfinished turn: require careful check
        this.play(m);
        let res = false;
        if (this.subTurn == 1)
          // Can either play a move, or specialize a piece
          res = this.filterValid(this.getAllPotentialMoves()).length > 0;
        else {
          // subTurn == 2: can only play a specialized piece
          res = this.filterValid(
            this.getPotentialMovesFrom([m.end.x, m.end.y])).length > 0;
        }
        this.undo(m);
        return res;
      }
      this.play(m);
      const res = !this.underCheck(color);
      this.undo(m);
      return res;
    });
  }

  atLeastOneMove() {
    const atLeastOneReserveMove = () => {
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        let moves = this.filterValid(
          this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
        );
        if (moves.length > 0) return true;
      }
      return false;
    };
    if (this.subTurn == 0) return atLeastOneReserveMove();
    const canMoveSomething = super.atLeastOneMove();
    if (this.subTurn == 2) return canMoveSomething;
    return (canMoveSomething || atLeastOneReserveMove());
  }

  underCheck(color) {
    if (super.underCheck(color)) return true;
    // Aux func for piece attack on king (no pawn)
    const pieceAttackOn = (p, [x1, y1], [x2, y2]) => {
      const shift = [x2 - x1, y2 - y1];
      const absShift = shift.map(Math.abs);
      if (
        (
          p == V.KNIGHT &&
          (absShift[0] + absShift[1] != 3 || shift[0] == 0 || shift[1] == 0)
        ) ||
        (p == V.ROOK && shift[0] != 0 && shift[1] != 0) ||
        (p == V.BISHOP && absShift[0] != absShift[1]) ||
        (
          p == V.QUEEN &&
          shift[0] != 0 && shift[1] != 0 && absShift[0] != absShift[1]
        )
      ) {
        return false;
      }
      // Step is compatible with piece:
      const step = [
        shift[0] / Math.abs(shift[0]) || 0,
        shift[1] / Math.abs(shift[1]) || 0
      ];
      let [i, j] = [x1 + step[0], y1 + step[1]];
      while (i != x2 || j != y2) {
        if (!V.OnBoard(i, j) || this.board[i][j] != V.EMPTY) return false;
        i += step[0];
        j += step[1];
      }
      return true;
    };
    // Check potential specializations of undefined using reserve:
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == V.UNDEFINED
        ) {
          for (let p of V.RESERVE_PIECES) {
            if (
              this.reserve[oppCol][p] >= 1 &&
              pieceAttackOn(p, [i, j], this.kingPos[color])
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  getCheckSquares() {
    if (this.movesCount <= 2) return [];
    return super.getCheckSquares();
  }

  play(move) {
    move.turn = [this.turn, this.subTurn]; //easier undo (TODO?)
    const toNextPlayer = () => {
      V.PlayOnBoard(this.board, move);
      this.turn = V.GetOppCol(this.turn);
      this.subTurn =
        (move.vanish.length == 2 && move.vanish[1].p == V.UNDEFINED ? 0 : 1);
      this.movesCount++;
      this.postPlay(move);
    };
    if (this.movesCount <= 1) toNextPlayer();
    else if (move.vanish.length == 0) {
      // Removal (subTurn == 0 --> 1)
      this.reserve[this.turn][move.start.p]--;
      this.subTurn++;
    }
    else {
      const start = { x: move.vanish[0].x, y: move.vanish[0].y };
      const end = { x: move.appear[0].x, y: move.appear[0].y };
      if (start.x == end.x && start.y == end.y) {
        // Specialisation (subTurn == 1 before 2)
        this.reserve[this.turn][move.appear[0].p]--;
        V.PlayOnBoard(this.board, move);
        this.definitions.push(move.end);
        this.subTurn++;
      }
      else {
        // Normal move (subTurn 1 or 2: change turn)
        this.epSquares.push(this.getEpSquare(move));
        toNextPlayer();
      }
    }
  }

  postPlay(move) {
    const color = V.GetOppCol(this.turn);
    if (this.movesCount <= 2) this.kingPos[color] = [move.end.x, move.end.y];
    else {
      if (move.vanish.length == 2 && move.vanish[1].p == V.UNDEFINED)
        this.captureUndefined.push(move.end);
      else this.captureUndefined.push(null);
      if (move.appear[0].p == V.KING) super.postPlay(move);
      else {
        // If now all my pieces are defined, back to undefined state,
        // only if at least two different kind of pieces on board!
        // Store current state in move (cannot infer it after!)
        if (
          this.board.every(b => {
            return b.every(cell => {
              return (
                cell == V.EMPTY ||
                cell[0] != color ||
                cell[1] != V.UNDEFINED
              );
            });
          })
        ) {
          const piecesList = [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
          const oppCol = this.turn;
          let definedPieces = { w: {}, b: {} };
          for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
              if (this.board[i][j] != V.EMPTY) {
                const p = this.getPiece(i, j);
                const c = this.getColor(i, j);
                if (piecesList.includes(p)) {
                  definedPieces[c][p] =
                    (!definedPieces[c][p] ? 1 : definedPieces[c][p] + 1);
                }
              }
            }
          }
          const my_pk = Object.keys(definedPieces[color]);
          const opp_pk = Object.keys(definedPieces[oppCol]);
          const oppRevert = (
            opp_pk.length >= 2 ||
            (
              // Only one opponent's piece is defined, but
              // at least a different piece wait in reserve:
              opp_pk.length == 1 &&
              Object.keys(this.reserve[oppCol]).some(k => {
                return (k != opp_pk[0] && this.reserve[oppCol][k] >= 1);
              })
            )
          );
          if (my_pk.length >= 2 || oppRevert) {
            // NOTE: necessary HACK... because the move is played already.
            V.UndoOnBoard(this.board, move);
            move.position = this.getBaseFen();
            move.reserve = JSON.parse(JSON.stringify(this.reserve));
            V.PlayOnBoard(this.board, move);
            for (
              let cp of [{ c: color, pk: my_pk }, { c: oppCol, pk: opp_pk }]
            ) {
              if (cp.pk.length >= 2 || (cp.c == oppCol && oppRevert)) {
                for (let p of cp.pk)
                  this.reserve[cp.c][p] += definedPieces[cp.c][p];
                for (let i=0; i<8; i++) {
                  for (let j=0; j<8; j++) {
                    if (
                      this.board[i][j] != V.EMPTY &&
                      this.getColor(i, j) == cp.c &&
                      piecesList.includes(this.getPiece(i, j))
                    ) {
                      this.board[i][j] = cp.c + V.UNDEFINED;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  undo(move) {
    const toPrevPlayer = () => {
      V.UndoOnBoard(this.board, move);
      [this.turn, this.subTurn] = move.turn;
      this.movesCount--;
      this.postUndo(move);
    };
    if (this.movesCount <= 2 && move.appear[0].p == V.KING) toPrevPlayer();
    else if (move.vanish.length == 0) {
      this.reserve[this.turn][move.start.p]++;
      this.subTurn = move.turn[1];
    }
    else {
      const start = { x: move.vanish[0].x, y: move.vanish[0].y };
      const end = { x: move.appear[0].x, y: move.appear[0].y };
      if (start.x == end.x && start.y == end.y) {
        this.reserve[this.turn][move.appear[0].p]++;
        V.UndoOnBoard(this.board, move);
        this.definitions.pop();
        this.subTurn = move.turn[1];
      }
      else {
        this.epSquares.pop();
        toPrevPlayer();
      }
    }
  }

  postUndo(move) {
    const color = this.turn;
    if (this.movesCount <= 1) this.kingPos[color] = [-1, -1];
    else {
      this.captureUndefined.pop();
      if (move.appear[0].p == V.KING) super.postUndo(move);
      else {
        if (!!move.position) {
          this.board = V.GetBoard(move.position);
          this.reserve = move.reserve;
        }
      }
    }
  }

  getComputerMove() {
    let initMoves = this.getAllValidMoves();
    if (initMoves.length == 0) return null;
    // Loop until valid move is found (no un-specifiable piece...)
    const color = this.turn;
    while (true) {
      let moves = JSON.parse(JSON.stringify(initMoves));
      let mvArray = [];
      let mv = null;
      // Just play random moves (for now at least. TODO?)
      while (moves.length > 0) {
        mv = moves[randInt(moves.length)];
        mvArray.push(mv);
        this.play(mv);
        if (this.turn == color) {
          if (this.subTurn == 1) moves = this.getAllValidMoves();
          else {
            // subTurn == 2
            moves = this.filterValid(
              this.getPotentialMovesFrom([mv.end.x, mv.end.y]));
          }
        }
        else break;
      }
      const thisIsTheEnd = (this.turn != color);
      for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
      if (thisIsTheEnd) return (mvArray.length > 1 ? mvArray : mvArray[0]);
    }
    return null; //never reached
  }

  static get VALUES() {
    return Object.assign({ u: 0 }, ChessRules.VALUES);
  }

  // NOTE: evalPosition is wrong, but unused (random mover)

  getNotation(move) {
    const end = { x: move.end.x, y: move.end.y };
    const endSquare = V.CoordsToSquare(end);
    if (move.appear.length == 0)
      // Removal
      return move.start.p.toUpperCase() + endSquare + "X";
    if (move.vanish.length == 0) return "K@" + endSquare;
    const start = { x: move.vanish[0].x, y: move.vanish[0].y };
    if (start.x == end.x && start.y == end.y)
      // Something is specialized
      return move.appear[0].p.toUpperCase() + "@" + endSquare;
    // Normal move
    return super.getNotation(move);
  }

};
