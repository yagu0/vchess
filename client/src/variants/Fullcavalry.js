import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";
import { ChessRules, PiPo, Move } from "@/base_rules";

export class FullcavalryRules extends ChessRules {

  static get LANCER() {
    return "l";
  }

  static get IMAGE_EXTENSION() {
    // Temporarily, for the time SVG pieces are being designed:
    return ".png";
  }

  // Lancer directions *from white perspective*
  static get LANCER_DIRS() {
    return {
      'c': [-1, 0], //north
      'd': [-1, 1], //N-E
      'e': [0, 1], //east
      'f': [1, 1], //S-E
      'g': [1, 0], //south
      'h': [1, -1], //S-W
      'm': [0, -1], //west
      'o': [-1, -1] //N-W
    };
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(Object.keys(V.LANCER_DIRS));
  }

  getPiece(i, j) {
    const piece = this.board[i][j].charAt(1);
    // Special lancer case: 8 possible orientations
    if (Object.keys(V.LANCER_DIRS).includes(piece)) return V.LANCER;
    return piece;
  }

  getPpath(b, color, score, orientation) {
    if (Object.keys(V.LANCER_DIRS).includes(b[1])) {
      if (orientation == 'w') return "Eightpieces/tmp_png/" + b;
      // Find opposite direction for adequate display:
      let oppDir = '';
      switch (b[1]) {
        case 'c':
          oppDir = 'g';
          break;
        case 'g':
          oppDir = 'c';
          break;
        case 'd':
          oppDir = 'h';
          break;
        case 'h':
          oppDir = 'd';
          break;
        case 'e':
          oppDir = 'm';
          break;
        case 'm':
          oppDir = 'e';
          break;
        case 'f':
          oppDir = 'o';
          break;
        case 'o':
          oppDir = 'f';
          break;
      }
      return "Eightpieces/tmp_png/" + b[0] + oppDir;
    }
    // TODO: after we have SVG pieces, remove the folder and next prefix:
    return "Eightpieces/tmp_png/" + b;
  }

  getPPpath(m, orientation) {
    // If castle, show choices on m.appear[1]:
    const index = (m.appear.length == 2 ? 1 : 0);
    return (
      this.getPpath(
        m.appear[index].c + m.appear[index].p,
        null,
        null,
        orientation
      )
    );
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      // Deterministic:
      return "enbqkbnm/pppppppp/8/8/8/8/PPPPPPPP/ENBQKBNM w 0 ahah -";

    const baseFen = ChessRules.GenRandInitFen(options);
    // Replace rooks by lancers with expected orientation:
    const firstBlackRook = baseFen.indexOf('r'),
          lastBlackRook = baseFen.lastIndexOf('r'),
          firstWhiteRook = baseFen.indexOf('R'),
          lastWhiteRook = baseFen.lastIndexOf('R');
    return (
      baseFen.substring(0, firstBlackRook) +
        (firstBlackRook <= 3 ? 'e' : 'm') +
      baseFen.substring(firstBlackRook + 1, lastBlackRook) +
        (lastBlackRook >= 5 ? 'm' : 'e') +
      // Subtract 35 = total number of characters before last FEN row:
      // 8x3 (full rows) + 4 (empty rows) + 7 (separators)
      baseFen.substring(lastBlackRook + 1, firstWhiteRook) +
        (firstWhiteRook - 35 <= 3 ? 'E' : 'M') +
      baseFen.substring(firstWhiteRook + 1, lastWhiteRook) +
        (lastWhiteRook - 35 >= 5 ? 'M' : 'E') +
      baseFen.substring(lastWhiteRook + 1)
    );
  }

  getPotentialMovesFrom([x, y]) {
    if (this.getPiece(x, y) == V.LANCER)
      return this.getPotentialLancerMoves([x, y]);
    return super.getPotentialMovesFrom([x, y]);
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.getColor(x, y);
    let shiftX = (color == "w" ? -1 : 1);
    const lastRank = (color == "w" ? 0 : 7);
    let finalPieces = [V.PAWN];
    if (x + shiftX == lastRank) {
      // Only allow direction facing inside board:
      const allowedLancerDirs =
        lastRank == 0
          ? ['e', 'f', 'g', 'h', 'm']
          : ['c', 'd', 'e', 'm', 'o'];
      finalPieces = allowedLancerDirs.concat([V.KNIGHT, V.BISHOP, V.QUEEN]);
    }
    return super.getPotentialPawnMoves([x, y], finalPieces);
  }

  // Obtain all lancer moves in "step" direction
  getPotentialLancerMoves_aux([x, y], step, tr) {
    let moves = [];
    // Add all moves to vacant squares until opponent is met:
    const color = this.getColor(x, y);
    const oppCol = V.GetOppCol(color)
    let sq = [x + step[0], y + step[1]];
    while (V.OnBoard(sq[0], sq[1]) && this.getColor(sq[0], sq[1]) != oppCol) {
      if (this.board[sq[0]][sq[1]] == V.EMPTY)
        moves.push(this.getBasicMove([x, y], sq, tr));
      sq[0] += step[0];
      sq[1] += step[1];
    }
    if (V.OnBoard(sq[0], sq[1]))
      // Add capturing move
      moves.push(this.getBasicMove([x, y], sq, tr));
    return moves;
  }

  getPotentialLancerMoves([x, y]) {
    let moves = [];
    // Add all lancer possible orientations, similar to pawn promotions.
    const color = this.getColor(x, y);
    const dirCode = this.board[x][y][1];
    const curDir = V.LANCER_DIRS[dirCode];
    const monodirMoves =
      this.getPotentialLancerMoves_aux([x, y], V.LANCER_DIRS[dirCode]);
    monodirMoves.forEach(m => {
      Object.keys(V.LANCER_DIRS).forEach(k => {
        const newDir = V.LANCER_DIRS[k];
        // Prevent orientations toward outer board:
        if (V.OnBoard(m.end.x + newDir[0], m.end.y + newDir[1])) {
          let mk = JSON.parse(JSON.stringify(m));
          mk.appear[0].p = k;
          moves.push(mk);
        }
      });
    });
    return moves;
  }

  getCastleMoves([x, y]) {
    const c = this.getColor(x, y);

    // Castling ?
    const oppCol = V.GetOppCol(c);
    let moves = [];
    let i = 0;
    // King, then lancer:
    const finalSquares = [ [2, 3], [V.size.y - 2, V.size.y - 3] ];
    castlingCheck: for (
      let castleSide = 0;
      castleSide < 2;
      castleSide++ //large, then small
    ) {
      if (this.castleFlags[c][castleSide] >= V.size.y) continue;
      // If this code is reached, lancer and king are on initial position

      const lancerPos = this.castleFlags[c][castleSide];
      const castlingPiece = this.board[x][lancerPos].charAt(1);

      // Nothing on the path of the king ? (and no checks)
      const finDist = finalSquares[castleSide][0] - y;
      let step = finDist / Math.max(1, Math.abs(finDist));
      i = y;
      do {
        if (
          (this.isAttacked([x, i], oppCol)) ||
          (
            this.board[x][i] != V.EMPTY &&
            // NOTE: next check is enough, because of chessboard constraints
            (this.getColor(x, i) != c || ![y, lancerPos].includes(i))
          )
        ) {
          continue castlingCheck;
        }
        i += step;
      } while (i != finalSquares[castleSide][0]);

      // Nothing on final squares, except maybe king and castling lancer?
      for (i = 0; i < 2; i++) {
        if (
          finalSquares[castleSide][i] != lancerPos &&
          this.board[x][finalSquares[castleSide][i]] != V.EMPTY &&
          (
            finalSquares[castleSide][i] != y ||
            this.getColor(x, finalSquares[castleSide][i]) != c
          )
        ) {
          continue castlingCheck;
        }
      }

      // If this code is reached, castle is valid
      let allowedLancerDirs = [castlingPiece];
      if (finalSquares[castleSide][1] != lancerPos) {
        // It moved: allow reorientation
        allowedLancerDirs =
          x == 0
            ? ['e', 'f', 'g', 'h', 'm']
            : ['c', 'd', 'e', 'm', 'o'];
      }
      allowedLancerDirs.forEach(dir => {
        moves.push(
          new Move({
            appear: [
              new PiPo({
                x: x,
                y: finalSquares[castleSide][0],
                p: V.KING,
                c: c
              }),
              new PiPo({
                x: x,
                y: finalSquares[castleSide][1],
                p: dir,
                c: c
              })
            ],
            vanish: [
              new PiPo({ x: x, y: y, p: V.KING, c: c }),
              new PiPo({ x: x, y: lancerPos, p: castlingPiece, c: c })
            ],
            end:
              Math.abs(y - lancerPos) <= 2
                ? { x: x, y: lancerPos }
                : { x: x, y: y + 2 * (castleSide == 0 ? -1 : 1) }
          })
        );
      });
    }

    return moves;
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByLancer(sq, color)
    );
  }

  isAttackedByLancer([x, y], color) {
    for (let step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
      // If in this direction there are only enemy pieces and empty squares,
      // and we meet a lancer: can he reach us?
      // NOTE: do not stop at first lancer, there might be several!
      let coord = { x: x + step[0], y: y + step[1] };
      let lancerPos = [];
      while (
        V.OnBoard(coord.x, coord.y) &&
        (
          this.board[coord.x][coord.y] == V.EMPTY ||
          this.getColor(coord.x, coord.y) == color
        )
      ) {
        if (this.getPiece(coord.x, coord.y) == V.LANCER)
          lancerPos.push({x: coord.x, y: coord.y});
        coord.x += step[0];
        coord.y += step[1];
      }
      for (let xy of lancerPos) {
        const dir = V.LANCER_DIRS[this.board[xy.x][xy.y].charAt(1)];
        if (dir[0] == -step[0] && dir[1] == -step[1]) return true;
      }
    }
    return false;
  }

  static get VALUES() {
    return Object.assign(
      { l: 4.8 }, //Jeff K. estimation (for Eightpieces)
      ChessRules.VALUES
    );
  }

  // For moves notation:
  static get LANCER_DIRNAMES() {
    return {
      'c': "N",
      'd': "NE",
      'e': "E",
      'f': "SE",
      'g': "S",
      'h': "SW",
      'm': "W",
      'o': "NW"
    };
  }

  filterValid(moves) {
    // At move 1, forbid captures (in case of...):
    if (this.movesCount >= 2) return super.filterValid(moves);
    return moves.filter(m => m.vanish.length == 1);
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    if (Object.keys(V.LANCER_DIRNAMES).includes(move.vanish[0].p))
      // Lancer: add direction info
      notation += "=" + V.LANCER_DIRNAMES[move.appear[0].p];
    else if (move.appear.length == 2 && move.vanish[1].p != move.appear[1].p)
      // Same after castle:
      notation += "+L:" + V.LANCER_DIRNAMES[move.appear[1].p];
    else if (
      move.vanish[0].p == V.PAWN &&
      Object.keys(V.LANCER_DIRNAMES).includes(move.appear[0].p)
    ) {
      // Fix promotions in lancer:
      notation = notation.slice(0, -1) +
        "L:" + V.LANCER_DIRNAMES[move.appear[0].p];
    }
    return notation;
  }

};
