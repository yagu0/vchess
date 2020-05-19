import { ChessRules, PiPo } from "@/base_rules";

export class KoopaRules extends ChessRules {
  static get HasEnpassant() {
    return false;
  }

  static get STUNNED() {
    return ['s', 'u', 'o', 'c', 't', 'l'];
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.STUNNED);
  }

  static ParseFen(fen) {
    let res = ChessRules.ParseFen(fen);
    const fenParts = fen.split(" ");
    res.stunned = fenParts[4];
    return res;
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check "stunned"
    if (
      !fenParsed.stunned ||
      (
        fenParsed.stunned != "-" &&
        !fenParsed.stunned.match(/^([a-h][1-8][1-4],?)*$/)
      )
    ) {
      return false;
    }
    return true;
  }

  getPpath(b) {
    return (V.STUNNED.includes(b[1]) ? "Koopa/" : "") + b;
  }

  getFen() {
    return super.getFen() + " " + this.getStunnedFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getStunnedFen();
  }

  getStunnedFen() {
    const squares = Object.keys(this.stunned);
    if (squares.length == 0) return "-";
    return squares.map(square => square + this.stunned[square]).join(",");
  }

  // Base GenRandInitFen() is fine because en-passant indicator will
  // stand for stunned indicator.

  scanKings(fen) {
    this.INIT_COL_KING = { w: -1, b: -1 };
    // Squares of white and black king:
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
          case "l":
            this.kingPos["b"] = [i, k];
            this.INIT_COL_KING["b"] = k;
            break;
          case "K":
          case "L":
            this.kingPos["w"] = [i, k];
            this.INIT_COL_KING["w"] = k;
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    let stunnedArray = [];
    const stunnedFen = V.ParseFen(fen).stunned;
    if (stunnedFen != "-") {
      stunnedArray =
        stunnedFen
        .split(",")
        .map(s => {
          return {
            square: s.substr(0, 2),
            state: parseInt(s[2], 10)
          };
        });
    }
    this.stunned = {};
    stunnedArray.forEach(s => {
      this.stunned[s.square] = s.state;
    });
  }

  getNormalizedStep(step) {
    const [deltaX, deltaY] = [Math.abs(step[0]), Math.abs(step[1])];
    if (deltaX == 0 || deltaY == 0 || deltaX == deltaY)
      return [step[0] / deltaX || 0, step[1] / deltaY || 0];
    // Knight:
    const divisor = Math.min(deltaX, deltaY)
    return [step[0] / divisor, step[1] / divisor];
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    // Complete moves: stuns & kicks
    let promoteAfterStun = [];
    const color = this.turn;
    moves.forEach(m => {
      if (m.vanish.length == 2 && m.appear.length == 1) {
        const step =
          this.getNormalizedStep([m.end.x - m.start.x, m.end.y - m.start.y]);
        // "Capture" something: is target stunned?
        if (V.STUNNED.includes(m.vanish[1].p)) {
          // Kick it: continue movement in the same direction,
          // destroying all on its path.
          let [i, j] = [m.end.x + step[0], m.end.y + step[1]];
          while (V.OnBoard(i, j)) {
            if (this.board[i][j] != V.EMPTY) {
              m.vanish.push(
                new PiPo({
                  x: i,
                  y: j,
                  c: this.getColor(i, j),
                  p: this.getPiece(i, j)
                })
              );
            }
            i += step[0];
            j += step[1];
          }
        }
        else {
          // The piece is now stunned
          m.appear.push(JSON.parse(JSON.stringify(m.vanish[1])));
          const pIdx = ChessRules.PIECES.findIndex(p => p == m.appear[1].p);
          m.appear[1].p = V.STUNNED[pIdx];
          // And the capturer continue in the same direction until an empty
          // square or the edge of the board, maybe stunning other pieces.
          let [i, j] = [m.end.x + step[0], m.end.y + step[1]];
          while (V.OnBoard(i, j) && this.board[i][j] != V.EMPTY) {
            const colIJ = this.getColor(i, j);
            const pieceIJ = this.getPiece(i, j);
            let pIdx = ChessRules.PIECES.findIndex(p => p == pieceIJ);
            if (pIdx >= 0) {
              // The piece isn't already stunned
              m.vanish.push(
                new PiPo({
                  x: i,
                  y: j,
                  c: colIJ,
                  p: pieceIJ
                })
              );
              m.appear.push(
                new PiPo({
                  x: i,
                  y: j,
                  c: colIJ,
                  p: V.STUNNED[pIdx]
                })
              );
            }
            i += step[0];
            j += step[1];
          }
          if (V.OnBoard(i, j)) {
            m.appear[0].x = i;
            m.appear[0].y = j;
            // Is it a pawn on last rank?
            if ((color == 'w' && i == 0) || (color == 'b' && i == 7)) {
              m.appear[0].p = V.ROOK;
              for (let ppiece of [V.KNIGHT, V.BISHOP, V.QUEEN]) {
                let mp = JSON.parse(JSON.stringify(m));
                mp.appear[0].p = ppiece;
                promoteAfterStun.push(mp);
              }
            }
          }
          else
            // The piece is out
            m.appear.shift();
        }
      }
    });
    return moves.concat(promoteAfterStun);
  }

  filterValid(moves) {
    // Forbid kicking own king out
    const color = this.turn;
    return moves.filter(m => {
      const kingAppear = m.appear.some(a => a.c == color && a.p == V.KING);
      return m.vanish.every(v => {
        return (
          v.c != color ||
          !["k", "l"].includes(v.p) ||
          (v.p == "k" && kingAppear)
        );
      });
    });
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    if (this.kingPos['w'][0] < 0) return "0-1";
    if (this.kingPos['b'][0] < 0) return "1-0";
    if (!this.atLeastOneMove()) return "1/2";
    return "*";
  }

  postPlay(move) {
    // Base method is fine because a stunned king (which won't be detected)
    // can still castle after going back to normal.
    super.postPlay(move);
    const kIdx = move.vanish.findIndex(v => v.p == "l");
    if (kIdx >= 0)
      // A stunned king vanish (game over)
      this.kingPos[move.vanish[kIdx].c] = [-1, -1];
    move.stunned = JSON.stringify(this.stunned);
    // Array of stunned stage 1 pieces (just back to normal then)
    Object.keys(this.stunned).forEach(square => {
      // All (formerly) stunned pieces progress by 1 level, if still on board
      const coords = V.SquareToCoords(square);
      const [x, y] = [coords.x, coords.y];
      if (V.STUNNED.includes(this.board[x][y][1])) {
        // Stunned piece still on board
        this.stunned[square]--;
        if (this.stunned[square] == 0) {
          delete this.stunned[square];
          const color = this.getColor(x, y);
          const piece = this.getPiece(x, y);
          const pIdx = V.STUNNED.findIndex(p => p == piece);
          this.board[x][y] = color + ChessRules.PIECES[pIdx];
        }
      }
      else delete this.stunned[square];
    });
    // Any new stunned pieces?
    move.appear.forEach(a => {
      if (V.STUNNED.includes(a.p))
        // Set to maximum stun level:
        this.stunned[V.CoordsToSquare({ x: a.x, y: a.y })] = 4;
    });
  }

  postUndo(move) {
    super.postUndo(move);
    const kIdx = move.vanish.findIndex(v => v.p == "l");
    if (kIdx >= 0) {
      // A stunned king vanished
      this.kingPos[move.vanish[kIdx].c] =
        [move.vanish[kIdx].x, move.vanish[kIdx].y];
    }
    this.stunned = JSON.parse(move.stunned);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        const square = V.CoordsToSquare({ x: i, y: j });
        const pieceIJ = this.getPiece(i, j);
        if (!this.stunned[square]) {
          const pIdx = V.STUNNED.findIndex(p => p == pieceIJ);
          if (pIdx >= 0)
            this.board[i][j] = this.getColor(i, j) + ChessRules.PIECES[pIdx];
        }
        else {
          const pIdx = ChessRules.PIECES.findIndex(p => p == pieceIJ);
          if (pIdx >= 0)
            this.board[i][j] = this.getColor(i, j) + V.STUNNED[pIdx];
        }
      }
    }
  }

  static get VALUES() {
    return Object.assign(
      {
        s: 1,
        u: 5,
        o: 3,
        c: 3,
        t: 9,
        l: 1000
      },
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    if (
      move.appear.length == 2 &&
      move.vanish.length == 2 &&
      move.appear.concat(move.vanish).every(
        av => ChessRules.PIECES.includes(av.p)) &&
      move.appear[0].p == V.KING
    ) {
      if (move.end.y < move.start.y) return "0-0-0";
      return "0-0";
    }
    const finalSquare = V.CoordsToSquare(move.end);
    const piece = this.getPiece(move.start.x, move.start.y);
    const captureMark = move.vanish.length >= 2 ? "x" : "";
    let pawnMark = "";
    if (piece == 'p' && captureMark.length == 1)
      pawnMark = V.CoordToColumn(move.start.y); //start column
    // Piece or pawn movement
    let notation =
      (piece == V.PAWN ? pawnMark : piece.toUpperCase()) +
      captureMark + finalSquare;
    if (
      piece == 'p' &&
      move.appear[0].c == move.vanish[0].c &&
      move.appear[0].p != 'p'
    ) {
      // Promotion
      notation += "=" + move.appear[0].p.toUpperCase();
    }
    return notation;
  }
};
