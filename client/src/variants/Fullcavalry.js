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
    return (
      this.getPpath(
        m.appear[0].c + m.appear[0].p,
        null,
        null,
        orientation
      )
    );
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      // Deterministic:
      return "efbqkbnm/pppppppp/8/8/8/8/PPPPPPPP/EDBQKBNM w 0 ahah -";

    const baseFen = ChessRules.GenRandInitFen(randomness);
    // Replace black rooks by lancers oriented south,
    // and white rooks by lancers oriented north:
    return baseFen.replace(/r/g, 'g').replace(/R/g, 'C');
  }

  // Because of the lancers, getPiece() could be wrong:
  // use board[x][y][1] instead (always valid).
  // TODO: base implementation now uses this too (no?)
  getBasicMove([sx, sy], [ex, ey], tr) {
    const initColor = this.getColor(sx, sy);
    const initPiece = this.board[sx][sy].charAt(1);
    let mv = new Move({
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: tr ? tr.c : initColor,
          p: tr ? tr.p : initPiece
        })
      ],
      vanish: [
        new PiPo({
          x: sx,
          y: sy,
          c: initColor,
          p: initPiece
        })
      ]
    });

    // The opponent piece disappears if we take it
    if (this.board[ex][ey] != V.EMPTY) {
      mv.vanish.push(
        new PiPo({
          x: ex,
          y: ey,
          c: this.getColor(ex, ey),
          p: this.board[ex][ey].charAt(1)
        })
      );
    }

    return mv;
  }

  getPotentialMovesFrom([x, y]) {
    if (this.getPiece(x, y) == V.LANCER)
      return this.getPotentialLancerMoves([x, y]);
    return super.getPotentialMovesFrom([x, y]);
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
        if (
          this.getPiece(coord.x, coord.y) == V.LANCER &&
          !this.isImmobilized([coord.x, coord.y])
        ) {
          lancerPos.push({x: coord.x, y: coord.y});
        }
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
    if (this.movesCount >= 2) return moves;
    return moves.filter(m => m.vanish.length == 1);
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    if (Object.keys(V.LANCER_DIRNAMES).includes(move.vanish[0].p))
      // Lancer: add direction info
      notation += "=" + V.LANCER_DIRNAMES[move.appear[0].p];
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
