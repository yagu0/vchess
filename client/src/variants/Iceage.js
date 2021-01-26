import { ChessRules } from "@/base_rules";

export class IceageRules extends ChessRules {

  static get IgnoreRepetition() {
    return true;
  }

  static get ICECUBE() {
    return "cc";
  }

  static board2fen(b) {
    if (b[0] == 'c') return 'c';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'c') return V.ICECUBE;
    return ChessRules.fen2board(f);
  }

  getPpath(b) {
    if (b[0] == 'c') return "Iceage/icecube";
    return b;
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (['c'].concat(V.PIECES).includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness).replace(/8/g, "cccccccc");
  }

  play(move) {
    const iceAgeAfterMove = (this.movesCount % 40 == 39);
    if (iceAgeAfterMove)
      // Next ice age after this move:
      move.state = JSON.stringify(this.board);
    super.play(move);
    if (iceAgeAfterMove) {
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.board[i][j] == V.EMPTY) {
            const surrounded = V.steps[V.ROOK].every(s => {
              const [ii, jj] = [i + s[0], j + s[1]];
              return (
                !V.OnBoard(ii, jj) ||
                ![V.EMPTY, V.ICECUBE].includes(this.board[ii][jj])
              );
            });
            if (!surrounded) this.board[i][j] = V.ICECUBE;
          }
          else if (this.board[i][j] != V.ICECUBE) {
            const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
            const connected = steps.some(s => {
              const [ii, jj] = [i + s[0], j + s[1]];
              return (
                V.OnBoard(ii, jj) &&
                ![V.EMPTY, V.ICECUBE].includes(this.board[ii][jj])
              );
            });
            if (!connected) this.board[i][j] = V.ICECUBE;
          }
        }
      }
      // Update king position (no need to update flags: game over)
      const kp = this.kingPos;
      if (this.getPiece(kp['w'][0], kp['w'][1]) != V.KING)
        this.kingPos['w'] = [-1, -1];
      if (this.getPiece(kp['b'][0], kp['b'][1]) != V.KING)
        this.kingPos['b'] = [-1, -1];
    }
  }

  undo(move) {
    super.undo(move);
    if (!!move.state) {
      this.board = JSON.parse(move.state);
      if (this.kingPos['w'][0] < 0 || this.kingPos['b'][0] < 0) {
        for (let i=0; i<8; i++) {
          for (let j=0; j<8; j++) {
            if (this.board[i][j] != V.EMPTY && this.getPiece(i, j) == V.KING)
              this.kingPos[this.getColor(i, j)] = [i, j];
          }
        }
      }
    }
  }

  getCheckSquares() {
    if (this.kingPos[this.turn][0] < 0) return [];
    return super.getCheckSquares();
  }

  getCurrentScore() {
    const kingDisappear = {
      w: this.kingPos['w'][0] < 0,
      b: this.kingPos['b'][0] < 0
    };
    if (kingDisappear['w'] && kingDisappear['b']) return "1/2";
    if (kingDisappear['w']) return "0-1";
    if (kingDisappear['b']) return "1-0";
    return super.getCurrentScore();
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (![V.EMPTY,V.ICECUBE].includes(this.board[i][j])) {
          const sign = this.getColor(i, j) == "w" ? 1 : -1;
          evaluation += sign * V.VALUES[this.getPiece(i, j)];
        }
      }
    }
    return evaluation;
  }

};
