import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class AvalancheRules extends ChessRules {

  static get PawnSpecs() {
    return (
      Object.assign(
        { promotions: [V.PAWN] },
        ChessRules.PawnSpecs
      )
    );
  }

  static get HasEnpassant() {
    return false;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 5) return false;
    if (!fenParts[4].match(/^[0-8]$/)) return false;
    return true;
  }

  canIplay(side, [x, y]) {
    if (this.subTurn == 0) return (x >= V.size.x);
    const c = this.getColor(x, y);
    return (
      (this.subTurn == 1 && c == side) ||
      (this.subTurn == 2 && c != side && this.getPiece(x, y) == V.PAWN)
    );
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { promoteFile: fenParts[4] }
    );
  }

  getPromoteFen() {
    const L = this.promoteFile.length;
    return (this.promoteFile[L-1] + 1);
  }

  getFen() {
    return super.getFen() + " " + this.getPromoteFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getPromoteFen();
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness).slice(0, -1) + "0";
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  static get RESERVE_PIECES() {
    // Promotion pieces
    return [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const fenPromoteFile = V.ParseFen(fen).promoteFile;
    this.promoteFile = [parseInt(fenPromoteFile, 10) - 1];
    this.reserve = { 'w': null, 'b': null };
    if (this.promoteFile[0] >= 0) {
      this.reserve = {
        [this.turn]: {
          [V.ROOK]: 1,
          [V.KNIGHT]: 1,
          [V.BISHOP]: 1,
          [V.QUEEN]: 1
        }
      };
      this.subTurn = 0;
    }
    else this.subTurn = 1;
  }

  getReservePpath(index, color) {
    return color + V.RESERVE_PIECES[index];
  }

  getReserveMove(y) {
    // Send a new piece piece to our first rank
    const color = this.turn;
    const L = this.promoteFile.length;
    const [rank, file] = [color == 'w' ? 0 : 7, this.promoteFile[L-1]];
    return new Move({
      appear: [
        new PiPo({ x: rank, y: file, c: color, p: V.RESERVE_PIECES[y] })
      ],
      vanish: [
        new PiPo({ x: rank, y: file, c: color, p: V.PAWN })
      ],
      start: { x: 8, y: y },
      end: { x: rank, y: file }
    });
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 0)
      // Reserves, outside of board: x == sizeX(+1)
      return (x >= 8 ? [this.getReserveMove(y)] : []);
    if (this.subTurn == 1)
      // Usual case:
      return super.getPotentialMovesFrom([x, y]);
    // subTurn == 2: only allowed to push an opponent's pawn (if possible)
    const oppPawnShift = (this.turn == 'w' ? 1 : -1);
    if (
      V.OnBoard(x + oppPawnShift, y) &&
      this.board[x + oppPawnShift][y] == V.EMPTY
    ) {
      return [this.getBasicMove([x, y], [x + oppPawnShift, y])];
    }
    return [];
  }

  getAllValidMoves() {
    if (this.subTurn == 0) {
      let moves = [];
      for (let y = 0; y < V.RESERVE_PIECES.length; y++)
        moves.push(this.getReserveMove(y));
      return moves;
    }
    if (this.subTurn == 1)
      return this.filterValid(super.getAllPotentialMoves());
    // subTurn == 2: move opponent's pawn only
    let moves = [];
    const oppCol = V.GetOppCol(this.turn);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == V.PAWN
        ) {
          Array.prototype.push.apply(
            moves, this.getPotentialMovesFrom([i, j]));
        }
      }
    }
    return moves;
  }

  filterValid(moves) {
    if (this.subTurn != 1) return moves; //self-checks by pawns are allowed
    return super.filterValid(moves);
  }

  atLeastOneMove() {
    if (this.subTurn == 0) return true; //TODO: never called in this situation
    if (this.subTurn == 1) {
      // Cannot use super method: infinite recursive calls
      const color = this.turn;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
            const moves = this.getPotentialMovesFrom([i, j]);
            if (moves.length > 0) {
              for (let k = 0; k < moves.length; k++) {
                const piece = moves[k].vanish[0].p;
                if (piece == V.KING) {
                  this.kingPos[color] =
                    [moves[k].appear[0].x, moves[k].appear[0].y];
                }
                V.PlayOnBoard(this.board, moves[k]);
                const res = !this.underCheck(color);
                V.UndoOnBoard(this.board, moves[k]);
                if (piece == V.KING) {
                  this.kingPos[color] =
                    [moves[k].vanish[0].x, moves[k].vanish[0].y];
                }
                if (res) return true;
              }
            }
          }
        }
      }
      return false;
    }
    // subTurn == 2: need to find an enemy pawn which can advance
    const oppCol = V.GetOppCol(this.turn);
    const oppPawnShift = (oppCol == 'w' ? -1 : 1);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == V.PAWN &&
          V.OnBoard(i + oppPawnShift, j) &&
          this.board[i + oppPawnShift][j] == V.EMPTY
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getCheckSquares() {
    if (this.kingPos[this.turn][0] < 0) return [];
    return super.getCheckSquares();
  }

  getCurrentScore() {
    // If my king disappeared: I lost!
    const c = this.turn;
    if (this.kingPos[c][0] < 0) return (c == 'w' ? "0-1" : "1-0");
    return super.getCurrentScore();
  }

  prePlay(move) {
    if (this.subTurn != 1) return;
    const c = move.vanish[0].c;
    const piece = move.vanish[0].p;
    const firstRank = c == "w" ? V.size.x - 1 : 0;
    if (piece == V.KING) {
      this.kingPos[c] = [move.appear[0].x, move.appear[0].y];
      this.castleFlags[c] = [V.size.y, V.size.y];
      return;
    }
    const oppCol = V.GetOppCol(c);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING) {
      // Opponent's king is captured, game over
      this.kingPos[oppCol] = [-1, -1];
      move.captureKing = true;
    }
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (
      move.start.x == firstRank && //our rook moves?
      this.castleFlags[c].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 1);
      this.castleFlags[c][flagIdx] = V.size.y;
    }
    if (
      move.end.x == oppFirstRank && //we took opponent rook?
      this.castleFlags[oppCol].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 1);
      this.castleFlags[oppCol][flagIdx] = V.size.y;
    }
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    this.prePlay(move);
    V.PlayOnBoard(this.board, move);
    const c = this.turn;
    move.turn = [c, this.subTurn];
    const oppCol = V.GetOppCol(c);
    const oppLastRank = (c == 'w' ? 7 : 0);
    if (this.subTurn <= 1) this.reserve[oppCol] = null;
    if (this.subTurn == 0) {
      this.subTurn++;
      this.reserve[c] = null;
    }
    else if (this.subTurn == 1) {
      this.subTurn++;
      if (
        this.movesCount == 0 ||
        !!move.captureKing ||
        !this.atLeastOneMove()
      ) {
        this.turn = oppCol;
        this.movesCount++;
        this.subTurn = 1;
        this.promoteFile.push(-1);
        move.pushPromote = true;
      }
    }
    else {
      // subTurn == 2
      this.turn = oppCol;
      if (move.end.x == oppLastRank) {
        this.promoteFile.push(move.end.y);
        this.reserve[oppCol] = {
          [V.ROOK]: 1,
          [V.KNIGHT]: 1,
          [V.BISHOP]: 1,
          [V.QUEEN]: 1
        };
        this.subTurn = 0;
      }
      else {
        this.subTurn = 1;
        this.promoteFile.push(-1);
      }
      move.pushPromote = true;
      this.movesCount++;
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    const changeTurn = (this.turn != move.turn[0]);
    this.turn = move.turn[0];
    this.subTurn = move.turn[1];
    if (!!move.pushPromote) {
      const promoteFile = this.promoteFile.pop();
      if (promoteFile >= 0) this.reserve[V.GetOppCol(this.turn)] = null;
    }
    else if (this.subTurn == 0) {
      this.reserve[this.turn] = {
        [V.ROOK]: 1,
        [V.KNIGHT]: 1,
        [V.BISHOP]: 1,
        [V.QUEEN]: 1
      };
    }
    if (changeTurn) this.movesCount--;
    this.postUndo(move);
  }

  postUndo(move) {
    if (this.subTurn != 1) return;
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      // Opponent's king was captured
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
    super.postUndo(move);
  }

  getComputerMove() {
    // Just try to capture as much material as possible (1-half move)
    const moves = this.getAllValidMoves();
    if (this.subTurn == 0) {
      this.play(moves[3]); //HACK... 3 = queen index
      const res = this.getComputerMove();
      this.undo(moves[3]);
      return [moves[3], res];
    }
    // subTurn == 1 (necessarily)
    let candidates = [];
    let maxValue = -V.INFINITY;
    for (let m of moves) {
      let value = 0;
      if (m.vanish.length == 2) {
        // Compute delta value, to not give all material on pawns... (TODO)
        // 0.5 to favor captures (if same type of piece).
        value = 0.5 +
          ChessRules.VALUES[m.vanish[1].p] - ChessRules.VALUES[m.vanish[0].p];
      }
      if (value > maxValue) {
        candidates = [m];
        maxValue = value;
      }
      else if (value == maxValue) candidates.push(m);
    }
    const m1 = candidates[randInt(candidates.length)];
    this.play(m1);
    let m2 = null;
    if (this.subTurn == 2) {
      // Just pick a pawn at random
      const moves2 = this.getAllValidMoves();
      m2 = moves2[randInt(moves2.length)];
    }
    this.undo(m1);
    if (!m2) return m1;
    return [m1, m2];
  }

  getNotation(move) {
    if (this.subTurn == 0)
      return move.appear[0].p.toUpperCase() + "@" + V.CoordsToSquare(move.end);
    if (this.subTurn == 1) return super.getNotation(move);
    // subTurn == 2: just indicate final square
    return V.CoordsToSquare(move.end);
  }

};
