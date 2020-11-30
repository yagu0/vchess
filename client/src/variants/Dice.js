import { ChessRules, Move } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class DiceRules extends ChessRules {

  static get CanAnalyze() {
    return false;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { toplay: fenParts[5] }
    );
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.p2play = [];
    const toplay = V.ParseFen(fen).toplay;
    if (toplay != "-") this.p2play.push(toplay);
  }

  getFen() {
    return super.getFen() + " " + this.getToplayFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getToplayFen();
  }

  getToplayFen() {
    const L = this.p2play.length;
    return (L > 0 ? this.p2play[L-1] : "-");
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness) + " -";
  }

  canMove(piece, color, [x, y]) {
    const oppCol = V.GetOppCol(color);
    if (piece == V.PAWN) {
      const forward = (color == 'w' ? -1 : 1);
      if (this.board[x + forward][y] == V.EMPTY) return true;
      for (let shift of [-1, 1]) {
        const [i, j] = [x + forward, y + shift];
        if (
          V.OnBoard(i, j) &&
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol
        ) {
          return true;
        }
      }
    }
    else {
      const steps =
        [V.KING, V.QUEEN].includes(piece)
          ? V.steps[V.ROOK].concat(V.steps[V.BISHOP])
          : V.steps[piece];
      for (let s of steps) {
        const [i, j] = [x + s[0], y + s[1]];
        if (
          V.OnBoard(i, j) &&
          (this.board[i][j] == V.EMPTY || this.getColor(i, j) == oppCol)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getRandPiece(color) {
    // Find pieces which can move and roll a dice
    let canMove = {};
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
          const piece = this.getPiece(i, j);
          if (!canMove[piece] && this.canMove(piece, color, [i, j]))
            canMove[piece] = [i, j];
        }
      }
    }
    const options = Object.keys(canMove);
    const randPiece = options[randInt(options.length)];
    return [randPiece, canMove[randPiece]];
  }

  getPotentialMovesFrom([x, y]) {
    const color = this.turn;
    let moves = undefined;
    if (this.movesCount == 0) moves = super.getPotentialMovesFrom([x, y]);
    else {
      const L = this.p2play.length; //L is >= 1
      const piece = this.getPiece(x, y);
      if (
        piece == V.PAWN &&
        this.p2play[L-1] != V.PAWN &&
        ((color == 'w' && x == 1) || (color == 'b' && x == 6))
      ) {
        // The piece is a pawn about to promote
        const destX = (color == 'w' ? 0 : 7);
        moves = [];
        if (this.board[destX][y] == V.EMPTY) {
          moves.push(
            this.getBasicMove(
              [x, y], [destX, y], { c: color, p: this.p2play[L-1] })
          );
        }
        for (let shift of [-1, 1]) {
          const [i, j] = [destX, y + shift];
          if (
            V.OnBoard(i, j) &&
            this.board[i][j] != V.EMPTY &&
            this.getColor(i, j) != color
          ) {
            moves.push(
              this.getBasicMove(
                [x, y], [i, j], { c: color, p: this.p2play[L-1] })
            );
          }
        }
      }
      else if (piece != this.p2play[L-1])
        // The piece type must match last p2play
        return [];
      else moves = super.getPotentialMovesFrom([x, y]);
    }
    // Decide which piece the opponent will play:
    const oppCol = V.GetOppCol(color);
    moves.forEach(m => {
      V.PlayOnBoard(this.board, m);
      const [piece, square] = this.getRandPiece(oppCol);
      m.start.toplay = square;
      m.end.p = piece;
      V.UndoOnBoard(this.board, m);
    });
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.kingPos[color][0] < 0) return (color == 'w' ? "0-1" : "1-0");
    return "*";
  }

  postPlay(move) {
    this.p2play.push(move.end.p);
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [-1, -1];
    // Castle flags for captured king won't be updated (not important...)
    super.postPlay(move);
  }

  postUndo(move) {
    this.p2play.pop();
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
    super.postUndo(move);
  }

  static get SEARCH_DEPTH() {
    return 1;
  }

  getNotation(move) {
    return super.getNotation(move) + "/" + move.end.p.toUpperCase();
  }

};
