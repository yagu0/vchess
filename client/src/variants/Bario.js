import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

// TODO: issue with undo of specialisation to cover check, subTurn decremented to 0

export class BarioRules extends ChessRules {

  // Does not really seem necessary (although the author mention it)
  // Instead, first move = pick a square for the king.
  static get HasCastle() {
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

  hoverHighlight(x, y) {
    const c = this.turn;
    return (
      this.movesCount <= 1 &&
      (
        (c == 'w' && x == 7) ||
        (c == 'b' && x == 0)
      )
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
      vanish: [],
      start: { x: -1, y: -1 },
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
      counts[i] = this.reserve["w"][V.PIECES[i]];
      counts[4 + i] = this.reserve["b"][V.PIECES[i]];
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
    return "8/pppppppp/8/8/8/8/PPPPPPPP/8 w 0 - 22212221 -";
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
      return (
        new Move({
          appear: [
            new PiPo({ x: cu.x, y: cu.y, c: color, p: p })
          ],
          vanish: [
            new PiPo({ x: cu.x, y: cu.y, c: color, p: V.UNDEFINED })
          ],
          start: { x: x, y: y }
        })
      );
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

  getAllValidMoves() {
    const getAllReserveMoves = () => {
      let moves = [];
      const color = this.turn;
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
    const color = this.turn;
    return moves.filter(m => {
      if (m.vanish.length == 0) return true;
      const start = { x: m.vanish[0].x, y: m.vanish[0].y };
      const end = { x: m.appear[0].x, y: m.appear[0].y };
      if (start.x == end.x && start.y == end.y) return true; //unfinished turn
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
    if (this.subTurn == 0) return true; //always one reserve for an undefined
    if (!super.atLeastOneMove()) return atLeastOneReserveMove();
    return true;
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
        if (this.board[i][j] != V.EMPTY) return false;
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

  play(move) {
    const toNextPlayer = () => {
      V.PlayOnBoard(this.board, move);
      this.turn = V.GetOppCol(this.turn);
      this.subTurn =
        (move.vanish.length == 2 && move.vanish[1].p == V.UNDEFINED ? 0 : 1);
      this.movesCount++;
      this.postPlay(move);
    };
    if (move.vanish.length == 0) {
      toNextPlayer();
      return;
    }
    const start = { x: move.vanish[0].x, y: move.vanish[0].y };
    const end = { x: move.appear[0].x, y: move.appear[0].y };
    if (start.x == end.x && start.y == end.y) {
      // Specialisation (subTurn == 1 before 2), or Removal (subTurn == 0).
      // In both cases, turn not over, and a piece removed from reserve
      this.reserve[this.turn][move.appear[0].p]--;
      if (move.appear[0].c == move.vanish[0].c) {
        // Specialisation: play "move" on board
        V.PlayOnBoard(this.board, move);
        this.definitions.push(move.end);
      }
      this.subTurn++;
    }
    else {
      // Normal move (subTurn 1 or 2: change turn)
      this.epSquares.push(this.getEpSquare(move));
      toNextPlayer();
    }
  }

  postPlay(move) {
    const color = V.GetOppCol(this.turn);
    if (move.vanish.length == 0) {
      this.kingPos[color] = [move.end.x, move.end.y];
      const firstRank = (color == 'w' ? 7 : 0);
      for (let j = 0; j < 8; j++) {
        if (j != move.end.y) this.board[firstRank][j] = color + V.UNDEFINED;
      }
    }
    else {
      if (move.vanish.length == 2 && move.vanish[1].p == V.UNDEFINED)
        this.captureUndefined.push(move.end);
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
          let myPieces = {};
          for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
              if (
                this.board[i][j] != V.EMPTY &&
                this.getColor(i, j) == color
              ) {
                const p = this.getPiece(i, j);
                if (piecesList.includes(p))
                  myPieces[p] = (!myPieces[p] ? 1 : myPieces[p] + 1);
              }
            }
          }
          const pk = Object.keys(myPieces);
          if (pk.length >= 2) {
            move.position = this.getBaseFen();
            for (let p of pk) this.reserve[color][p] = myPieces[p];
            for (let i=0; i<8; i++) {
              for (let j=0; j<8; j++) {
                if (
                  this.board[i][j] != V.EMPTY &&
                  this.getColor(i, j) == color &&
                  piecesList.includes(this.getPiece(i, j))
                ) {
                  this.board[i][j] = color + V.UNDEFINED;
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
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
      this.postUndo(move);
    };
    if (move.vanish.length == 0) {
      toPrevPlayer();
      return;
    }
    const start = { x: move.vanish[0].x, y: move.vanish[0].y };
    const end = { x: move.appear[0].x, y: move.appear[0].y };
    if (start.x == end.x && start.y == end.y) {
      this.reserve[this.turn][move.appear[0].p]++;
      if (move.appear[0].c == move.vanish[0].c) {
        V.UndoOnBoard(this.board, move);
        this.definitions.pop();
      }
      this.subTurn--;
    }
    else {
      this.epSquares.pop();
      toPrevPlayer();
    }
  }

  postUndo(move) {
    const color = this.turn;
    if (move.vanish.length == 0) {
      this.kingPos[color] = [-1, -1];
      const firstRank = (color == 'w' ? 7 : 0);
      for (let j = 0; j < 8; j++) this.board[firstRank][j] = "";
    }
    else {
      if (move.vanish.length == 2 && move.vanish[1].p == V.UNDEFINED)
        this.captureUndefined.pop();
      if (move.appear[0].p == V.KING) super.postUndo(move);
      else {
        if (!!move.position) {
          this.board = V.GetBoard(move.position);
          this.reserve[color] = {
            [V.ROOK]: 0,
            [V.KNIGHT]: 0,
            [V.BISHOP]: 0,
            [V.QUEEN]: 0
          }
        }
      }
    }
  }

  getComputerMove() {
    const color = this.turn;
    // Just play at random for now...
    let mvArray = [];
    while (this.turn == color) {
      const moves = this.getAllValidMoves();
      const choice = moves[randInt(moves.length)];
      mvArray.push(choice);
      this.play(choice);
    }
    for (let i = mvArray.length - 1; i >= 0; i--) this.undo(mvArray[i]);
    return (mvArray.length == 1? mvArray[0] : mvArray);
  }

  static get VALUES() {
    return Object.assign({ u: 0 }, ChessRules.VALUES);
  }

  // NOTE: evalPosition is wrong, but unused (random mover)

  getNotation(move) {
    const end = { x: move.appear[0].x, y: move.appear[0].y };
    const endSquare = V.CoordsToSquare(end);
    if (move.vanish.length == 0) return "K@" + endSquare;
    const start = { x: move.vanish[0].x, y: move.vanish[0].y };
    if (start.x == end.x && start.y == end.y) {
      // Something is specialized, or removed
      const symbol = move.appear[0].p.toUpperCase();
      if (move.appear[0].c == move.vanish[0].c)
        // Specialisation
        return symbol + "@" + endSquare;
      // Removal:
      return symbol + endSquare + "X";
    }
    // Normal move
    return super.getNotation(move);
  }

};
