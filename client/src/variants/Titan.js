import { ChessRules, Move, PiPo } from "@/base_rules";

export class TitanRules extends ChessRules {

  static get IMAGE_EXTENSION() {
    // Temporarily, for the time SVG pieces are being designed:
    return ".png";
  }

  // Decode if normal piece, or + bishop or knight
  getPiece(x, y) {
    const piece = this.board[x][y].charAt(1);
    if (ChessRules.PIECES.includes(piece)) return piece;
    // Augmented piece:
    switch (piece) {
      case 'a':
      case 'c':
        return 'b';
      case 'j':
      case 'l':
        return 'k';
      case 'm':
      case 'o':
        return 'n';
      case 's':
      case 't':
        return 'q';
      case 'u':
      case 'v':
        return 'r';
    }
  }

  // Code: a/c = bishop + knight/bishop j/l for king,
  // m/o for knight, s/t for queen, u/v for rook
  static get AUGMENTED_PIECES() {
    return [
      'a',
      'c',
      'j',
      'l',
      'm',
      'o',
      's',
      't',
      'u',
      'v'
    ];
  }

  getPpath(b) {
    return "Titan/" + b;
  }

  // Decode above notation into additional piece
  getExtraPiece(symbol) {
    if (['a','j','m','s','u'].includes(symbol))
      return 'n';
    return 'b';
  }

  // Inverse operation: augment piece
  getAugmented(piece) {
    const knight = this.movesCount <= 1;
    switch (piece) {
      case V.ROOK: return (knight ? 'u' : 'v');
      case V.KNIGHT: return (knight ? 'm' : 'o');
      case V.BISHOP: return (knight ? 'a' : 'c');
      case V.QUEEN: return (knight ? 's' : 't');
      case V.KING: return (knight ? 'j' : 'l');
    }
    return '_'; //never reached
  }

  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "w": 0, "b": 0 };
    const allPiecesCodes = V.PIECES.concat(V.AUGMENTED_PIECES);
    const kingBlackCodes = ['j','k','l'];
    const kingWhiteCodes = ['J','K','L'];
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (kingBlackCodes.includes(row[i])) kings['b']++;
        else if (kingWhiteCodes.includes(row[i])) kings['w']++;
        if (allPiecesCodes.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board, only one of each color:
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  // Kings may be augmented:
  scanKings(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const rows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < rows.length; i++) {
      let k = 0; //column index on board
      for (let j = 0; j < rows[i].length; j++) {
        const piece = rows[i].charAt(j);
        if (['j','k','l'].includes(piece.toLowerCase())) {
          const color = (piece.charCodeAt(0) <= 90 ? 'w' : 'b');
          this.kingPos[color] = [i, k];
        }
        else {
          const num = parseInt(rows[i].charAt(j), 10);
          if (!isNaN(num)) k += num - 1;
        }
        k++;
      }
    }
  }

  canIplay(side, [x, y]) {
    if (this.movesCount >= 4) return super.canIplay(side, [x, y]);
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
      this.movesCount <= 3 &&
      ((c == 'w' && x == 7) || (c == 'b' && x == 0))
    );
  }

  onlyClick([x, y]) {
    return (
      this.movesCount <= 3 ||
      // TODO: next line theoretically shouldn't be required...
      (this.movesCount == 4 && this.getColor(x, y) != this.turn)
    );
  }

  // Special case of move 1 = choose squares, knight first, then bishop
  doClick(square) {
    if (this.movesCount >= 4) return null;
    const color = this.turn;
    const [x, y] = [square[0], square[1]];
    if ((color == 'w' && x != 7) || (color == 'b' && x != 0)) return null;
    const selectedPiece = this.board[x][y][1];
    return new Move({
      appear: [
        new PiPo({
          x: x,
          y: y,
          c: color,
          p: this.getAugmented(selectedPiece)
        })
      ],
      vanish: [
        new PiPo({
          x: x,
          y: y,
          c: color,
          p: selectedPiece
        })
      ],
      start: { x: x, y: y },
      end: { x: x, y: y }
    });
  }

  // If piece not in usual list, bishop or knight appears.
  getPotentialMovesFrom([x, y]) {
    if (this.movesCount <= 3) {
      // Setup stage
      const move = this.doClick([x, y]);
      return (!move ? [] : [move]);
    }
    let moves = super.getPotentialMovesFrom([x, y]);
    const initialPiece = this.getPiece(x, y);
    const color = this.turn;
    if (
      ((color == 'w' && x == 7) || (color == "b" && x == 0)) &&
      V.AUGMENTED_PIECES.includes(this.board[x][y][1])
    ) {
      const newPiece = this.getExtraPiece(this.board[x][y][1]);
      moves.forEach(m => {
        m.appear[0].p = initialPiece;
        m.appear.push(
          new PiPo({
            p: newPiece,
            c: color,
            x: x,
            y: y
          })
        );
      });
      moves.forEach(m => {
        if (m.vanish.length <= 1) return;
        const [vx, vy] = [m.vanish[1].x, m.vanish[1].y];
        if (
          m.appear.length >= 2 && //3 if the king was also augmented
          m.vanish.length == 2 &&
          m.vanish[1].c == color &&
          V.AUGMENTED_PIECES.includes(this.board[vx][vy][1])
        ) {
          // Castle, rook is an "augmented piece"
          m.appear[1].p = V.ROOK;
          m.appear.push(
            new PiPo({
              p: this.getExtraPiece(this.board[vx][vy][1]),
              c: color,
              x: vx,
              y: vy
            })
          );
        }
      });
    }
    return moves;
  }

  postPlay(move) {
    if (this.movesCount > 4) {
      let piece = move.vanish[0].p;
      if (['j', 'l'].includes(piece)) piece = V.KING;
      if (piece == V.KING)
        this.kingPos[move.appear[0].c] = [move.appear[0].x, move.appear[0].y];
      this.updateCastleFlags(move, piece);
    }
  }

  postUndo(move) {
    if (this.movesCount >= 4) {
      if (['j', 'k', 'l'].includes(this.getPiece(move.start.x, move.start.y)))
        this.kingPos[move.vanish[0].c] = [move.start.x, move.start.y];
    }
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const sign = this.getColor(i, j) == "w" ? 1 : -1;
          const piece = this.getPiece(i, j);
          evaluation += sign * V.VALUES[piece];
          const symbol = this.board[i][j][1];
          if (V.AUGMENTED_PIECES.includes(symbol)) {
            const extraPiece = this.getExtraPiece(symbol);
            evaluation += sign * V.VALUES[extraPiece]
          }
        }
      }
    }
    return evaluation;
  }

  getNotation(move) {
    if (
      move.appear[0].x != move.vanish[0].x ||
      move.appear[0].y != move.vanish[0].y
    ) {
      if (
        V.AUGMENTED_PIECES.includes(move.vanish[0].p) ||
        (
          move.appear.length >= 2 &&
          move.vanish.length >= 2 &&
          V.AUGMENTED_PIECES.includes(move.vanish[1].p)
        )
      ) {
        // Simplify move before calling super.getNotation()
        let smove = JSON.parse(JSON.stringify(move));
        if (ChessRules.PIECES.includes(move.vanish[0].p)) {
          // Castle with an augmented rook
          smove.appear.pop();
          smove.vanish[1].p = smove.appear[1].p;
        }
        else {
          // Moving an augmented piece
          smove.appear.pop();
          smove.vanish[0].p = smove.appear[0].p;
          if (
            smove.vanish.length == 2 &&
            smove.vanish[0].c == smove.vanish[1].c &&
            V.AUGMENTED_PIECES.includes(move.vanish[1].p)
          ) {
            // Castle with an augmented rook
            smove.appear.pop();
            smove.vanish[1].p = smove.appear[1].p;
          }
        }
        return super.getNotation(smove);
      }
      // Else, more common case:
      return super.getNotation(move);
    }
    // First moves in game, placements:
    const square = V.CoordsToSquare(move.appear[0]);
    const reserve =
      (['a','j','m','s','u'].includes(move.appear[0].p) ? 'N' : 'B');
    return '+' + reserve + '@' + square;
  }

};
