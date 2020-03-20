import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, sample } from "@/utils/alea";

export class CoregalRules extends ChessRules {
  static IsGoodPosition(position) {
    if (!super.IsGoodPosition(position)) return false;
    const rows = position.split("/");
    // Check that at least one queen of each color is there:
    let queens = {};
    for (let row of rows) {
      for (let i = 0; i < row.length; i++)
        if (['Q','q'].includes(row[i])) queens[row[i]] = true;
    }
    if (Object.keys(queens).length != 2) return false;
    return true;
  }

  static IsGoodFlags(flags) {
    return !!flags.match(/^[a-z]{8,8}$/);
  }

  // Scanning king position for faster updates is still interesting,
  // but no need for INIT_COL_KING because it's given in castle flags.
  scanKings(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    const startRow = { 'w': V.size.x - 1, 'b': 0 };
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "k":
            this.kingPos["b"] = [i, k];
            break;
          case "K":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(fenRows[i].charAt(j));
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  getCheckSquares(color) {
    let squares = [];
    const oppCol = V.GetOppCol(color);
    if (this.isAttacked(this.kingPos[color], oppCol))
      squares.push(JSON.parse(JSON.stringify(this.kingPos[color])));
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.QUEEN &&
          this.isAttacked([i, j], oppCol)
        ) {
          squares.push([i, j]);
        }
      }
    }
    return squares;
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      // Castle flags here indicate pieces positions (if can castle)
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 adehadeh -";

    let pieces = { w: new Array(8), b: new Array(8) };
    let flags = "";
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      // Get random squares for king and queen between b and g files
      let randIndex = randInt(6) + 1;
      let kingPos = randIndex;
      randIndex = randInt(5) + 1;
      if (randIndex >= kingPos) randIndex++;
      let queenPos = randIndex;

      // Get random squares for rooks to the left and right of the queen
      // and king: not all squares of the same colors (for bishops).
      const minQR = Math.min(kingPos, queenPos);
      const maxQR = Math.max(kingPos, queenPos);
      let rook1Pos = randInt(minQR);
      let rook2Pos = 7 - randInt(7 - maxQR);

      // Now, if we are unlucky all these 4 pieces may be on the same color.
      const rem2 = [kingPos, queenPos, rook1Pos, rook2Pos].map(pos => pos % 2);
      if (rem2.every(r => r == 0) || rem2.every(r => r == 1)) {
        // Shift a random of these pieces to the left or right
        switch (randInt(4)) {
          case 0:
            if (rook1Pos == 0) rook1Pos++;
            else rook1Pos--;
            break;
          case 1:
            if (Math.random() < 0.5) kingPos++;
            else kingPos--;
            break;
          case 2:
            if (Math.random() < 0.5) queenPos++;
            else queenPos--;
            break;
          case 3:
            if (rook2Pos == 7) rook2Pos--;
            else rook2Pos++;
            break;
        }
      }
      let bishop1Options = { 0: true, 2: true, 4: true, 6: true };
      let bishop2Options = { 1: true, 3: true, 5: true, 7: true };
      [kingPos, queenPos, rook1Pos, rook2Pos].forEach(pos => {
        if (!!bishop1Options[pos]) delete bishop1Options[pos];
        else if (!!bishop2Options[pos]) delete bishop2Options[pos];
      });
      const bishop1Pos = parseInt(sample(Object.keys(bishop1Options), 1)[0]);
      const bishop2Pos = parseInt(sample(Object.keys(bishop2Options), 1)[0]);

      // Knights' positions are now determined
      const forbidden = [
        kingPos, queenPos, rook1Pos, rook2Pos, bishop1Pos, bishop2Pos
      ];
      const [knight1Pos, knight2Pos] =
        ArrayFun.range(8).filter(pos => !forbidden.includes(pos));

      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      flags +=
        [rook1Pos, queenPos, kingPos, rook2Pos].sort().map(V.CoordToColumn).join("");
    }
    // Add turn + flags + enpassant
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " -"
    );
  }

  setFlags(fenflags) {
    // white pieces positions, then black pieces positions
    this.castleFlags = { w: [...Array(4)], b: [...Array(4)] };
    for (let i = 0; i < 8; i++) {
      this.castleFlags[i < 4 ? "w" : "b"][i % 4] =
        V.ColumnToCoord(fenflags.charAt(i))
    }
  }

  getPotentialQueenMoves(sq) {
    return super.getPotentialQueenMoves(sq).concat(this.getCastleMoves(sq));
  }

  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);
    if (
      x != (c == "w" ? V.size.x - 1 : 0) ||
      !this.castleFlags[c].slice(1, 3).includes(y)
    ) {
      // x isn't first rank, or piece moved
      return [];
    }
    const castlingPiece = this.getPiece(x, y);

    // Relative position of the selected piece: left or right ?
    // If left: small castle left, large castle right.
    // If right: usual situation.
    const relPos = (this.castleFlags[c][1] == y ? "left" : "right");

    // Castling ?
    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // Castling piece, then rook:
    const finalSquares = {
      0: (relPos == "left" ? [1, 2] : [2, 3]),
      3: (relPos == "right" ? [6, 5] : [5, 4])
    };

    // Left, then right castle:
    castlingCheck: for (let castleSide of [0, 3]) {
      if (this.castleFlags[c][castleSide] >= 8) continue;

      // Rook and castling piece are on initial position
      const rookPos = this.castleFlags[c][castleSide];

      // Nothing on the path of the king ? (and no checks)
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          this.isAttacked([x, i], oppCol) ||
          (this.board[x][i] != V.EMPTY &&
            // NOTE: next check is enough, because of chessboard constraints
            (this.getColor(x, i) != c ||
              ![castlingPiece, V.ROOK].includes(this.getPiece(x, i))))
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);

      // Nothing on the path to the rook?
      step = castleSide == 0 ? -1 : 1;
      for (i = y + step; i != rookPos; i += step) {
        if (this.board[x][i] != V.EMPTY) continue castlingCheck;
      }

      // Nothing on final squares, except maybe castling piece and rook?
      for (i = 0; i < 2; i++) {
        if (
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          ![y, rookPos].includes(finalSquares[castleSide][i])
        ) {
          continue castlingCheck;
        }
      }

      // If this code is reached, castle is valid
      moves.push(
        new Move({
          appear: [
            new PiPo({ x: x, y: finalSquares[castleSide][0], p: castlingPiece, c: c }),
            new PiPo({ x: x, y: finalSquares[castleSide][1], p: V.ROOK, c: c })
          ],
          vanish: [
            new PiPo({ x: x, y: y, p: castlingPiece, c: c }),
            new PiPo({ x: x, y: rookPos, p: V.ROOK, c: c })
          ],
          // In this variant, always castle by playing onto the rook
          end: { x: x, y: rookPos }
        })
      );
    }

    return moves;
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    if (this.isAttacked(this.kingPos[color], oppCol)) return true;
    for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == V.QUEEN &&
          this.isAttacked([i, j], oppCol)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // "twoKings" arg for the similar Twokings variant.
  updateCastleFlags(move, piece, twoKings) {
    const c = V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    // Update castling flags if castling pieces moved or were captured
    const oppCol = V.GetOppCol(c);
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (move.start.x == firstRank) {
      if (piece == V.KING || (!twoKings && piece == V.QUEEN)) {
        if (this.castleFlags[c][1] == move.start.y)
          this.castleFlags[c][1] = 8;
        else if (this.castleFlags[c][2] == move.start.y)
          this.castleFlags[c][2] = 8;
        // Else: the flag is already turned off
      }
    }
    else if (
      move.start.x == firstRank && //our rook moves?
      [this.castleFlags[c][0], this.castleFlags[c][3]].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 3);
      this.castleFlags[c][flagIdx] = 8;
    } else if (
      move.end.x == oppFirstRank && //we took opponent rook?
      [this.castleFlags[oppCol][0], this.castleFlags[oppCol][3]].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 3);
      this.castleFlags[oppCol][flagIdx] = 8;
    }
  }

  // NOTE: do not set queen value to 1000 or so, because there may be several.

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    if (move.appear.length == 2) {
      // Castle: determine the right notation
      const color = move.appear[0].c;
      let symbol = (move.appear[0].p == V.QUEEN ? "Q" : "") + "0-0";
      if (
        (
          this.castleFlags[color][1] == move.vanish[0].y &&
          move.end.y > move.start.y
        )
        ||
        (
          this.castleFlags[color][2] == move.vanish[0].y &&
          move.end.y < move.start.y
        )
      ) {
        symbol += "-0";
      }
      return symbol;
    }
    return super.getNotation(move);
  }
};
