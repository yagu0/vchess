import { ChessRules } from "@/base_rules";

export class SpartanRules extends ChessRules {

  static get HasEnpassant() {
    return false;
  }

  static IsGoodFlags(flags) {
    // Only white can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  getPpath(b) {
    if (b[0] == 'b' && b[1] != 'k') return "Spartan/" + b;
    return b;
  }

  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "lgkcckwl/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 ah";

    // Mapping white --> black (first knight --> general; TODO):
    const piecesMap = {
      'r': 'c',
      'n': 'w',
      'b': 'l',
      'q': 'k',
      'k': 'k',
      'g': 'g'
    };

    const baseFen = ChessRules.GenRandInitFen(options).replace('n', 'g');
    return (
      baseFen.substr(0, 8).split('').map(p => piecesMap[p]).join('') +
      baseFen.substr(8)
    );
  }

  getFlagsFen() {
    return this.castleFlags['w'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'w': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['w'][i] = V.ColumnToCoord(fenflags.charAt(i));
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
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num) || num <= 0) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    // Both kings should be on board. One for white, 1 or 2 for black.
    if (kings['K'] != 1 || ![1, 2].includes(kings['k'])) return false;
    return true;
  }

  scanKings(fen) {
    // Scan white king only:
    this.kingPos = { w: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        switch (fenRows[i].charAt(j)) {
          case "K":
            this.kingPos["w"] = [i, k];
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

  static get LIEUTENANT() {
    return 'l';
  }
  static get GENERAL() {
    return 'g';
  }
  static get CAPTAIN() {
    return 'c';
  }
  static get WARLORD() {
    return 'w';
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat([V.LIEUTENANT, V.GENERAL, V.CAPTAIN, V.WARLORD])
    );
  }

  getPotentialMovesFrom([x, y]) {
    if (this.getColor(x, y) == 'w') return super.getPotentialMovesFrom([x, y]);
    switch (this.getPiece(x, y)) {
      case V.PAWN: {
        const kings = this.getKingsPos();
        const moves = this.getPotentialHopliteMoves([x, y]);
        if (kings.length == 1) return moves;
        return moves.filter(m => m.appear[0].p != V.KING);
      }
      case V.KING: return this.getPotentialSpartanKingMoves([x, y]);
      case V.LIEUTENANT: return this.getPotentialLieutenantMoves([x, y]);
      case V.GENERAL: return this.getPotentialGeneralMoves([x, y]);
      case V.CAPTAIN: return this.getPotentialCaptainMoves([x, y]);
      case V.WARLORD: return this.getPotentialWarlordMoves([x, y]);
    }
    return [];
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        // Dabbabah
        'd': [
          [-2, 0],
          [0, -2],
          [2, 0],
          [0, 2]
        ],
        // Alfil
        'a': [
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2]
        ]
      }
    );
  }

  getPotentialSpartanKingMoves(sq) {
    // No castle:
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    return super.getSlideNJumpMoves(sq, steps, 1);
  }

  getPotentialHopliteMoves([x, y]) {
    // Berolina pawn, with initial jumping option
    let moves = [];
    if (x == 6) {
      const finalPieces =
        [V.LIEUTENANT, V.GENERAL, V.CAPTAIN, V.KING, V.WARLORD];
      for (let shiftY of [-1, 0, 1]) {
        const [i, j] = [7, y + shiftY];
        if (
          V.OnBoard(i, j) &&
          (
            (shiftY != 0 && this.board[i][j] == V.EMPTY) ||
            (shiftY == 0 && this.getColor(i, j) == 'w')
          )
        ) {
          for (let p of finalPieces)
            moves.push(this.getBasicMove([x, y], [i, j], { c: 'b', p: p }));
        }
      }
    }
    else {
      for (let shiftY of [-1, 0, 1]) {
        const [i, j] = [x + 1, y + shiftY];
        if (
          V.OnBoard(i, j) &&
          (
            (shiftY != 0 && this.board[i][j] == V.EMPTY) ||
            (shiftY == 0 && this.getColor(i, j) == 'w')
          )
        ) {
          moves.push(this.getBasicMove([x, y], [i, j]));
        }
      }
      // Add initial 2 squares jumps:
      if (x == 1) {
        for (let shiftY of [-2, 2]) {
          const [i, j] = [3, y + shiftY];
          if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY)
            moves.push(this.getBasicMove([x, y], [i, j]));
        }
      }
    }
    return moves;
  }

  getPotentialLieutenantMoves([x, y]) {
    let moves = [];
    for (let shiftY of [-1, 1]) {
      const [i, j] = [x, y + shiftY];
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    const steps = V.steps[V.BISHOP].concat(V.steps['a']);
    Array.prototype.push.apply(
      moves,
      super.getSlideNJumpMoves([x, y], steps, 1)
    );
    return moves;
  }

  getPotentialCaptainMoves([x, y]) {
    const steps = V.steps[V.ROOK].concat(V.steps['d']);
    return super.getSlideNJumpMoves([x, y], steps, 1)
  }

  getPotentialGeneralMoves([x, y]) {
    return (
      super.getSlideNJumpMoves([x, y], V.steps[V.BISHOP], 1)
      .concat(super.getSlideNJumpMoves([x, y], V.steps[V.ROOK]))
    );
  }

  getPotentialWarlordMoves([x, y]) {
    return (
      super.getSlideNJumpMoves([x, y], V.steps[V.KNIGHT], 1)
      .concat(super.getSlideNJumpMoves([x, y], V.steps[V.BISHOP]))
    );
  }

  isAttacked(sq, color) {
    if (color == 'w') return super.isAttacked(sq, 'w');
    return (
      this.isAttackedByHoplite(sq) ||
      super.isAttackedByKing(sq, 'b') ||
      this.isAttackedByLieutenant(sq) ||
      this.isAttackedByGeneral(sq) ||
      this.isAttackedByCaptain(sq) ||
      this.isAttackedByWarlord(sq)
    );
  }

  isAttackedByHoplite(sq) {
    return super.isAttackedBySlideNJump(sq, 'b', V.PAWN, [[-1,0]], 1);
  }

  isAttackedByLieutenant(sq) {
    const steps = V.steps[V.BISHOP].concat(V.steps['a']);
    return (
      super.isAttackedBySlideNJump(sq, 'b', V.LIEUTENANT, steps, 1)
    );
  }

  isAttackedByCaptain(sq) {
    const steps = V.steps[V.ROOK].concat(V.steps['d']);
    return super.isAttackedBySlideNJump(sq, 'b', V.CAPTAIN, steps, 1);
  }

  isAttackedByGeneral(sq) {
    return (
      super.isAttackedBySlideNJump(
        sq, 'b', V.GENERAL, V.steps[V.BISHOP], 1) ||
      super.isAttackedBySlideNJump(sq, 'b', V.GENERAL, V.steps[V.ROOK])
    );
  }

  isAttackedByWarlord(sq) {
    return (
      super.isAttackedBySlideNJump(
        sq, 'b', V.WARLORD, V.steps[V.KNIGHT], 1) ||
      super.isAttackedBySlideNJump(sq, 'b', V.WARLORD, V.steps[V.BISHOP])
    );
  }

  updateCastleFlags(move, piece) {
    // Only white can castle:
    const firstRank = 7;
    if (piece == V.KING && move.appear[0].c == 'w')
      this.castleFlags['w'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['w'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['w'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['w'][0] ? 0 : 1);
      this.castleFlags['w'][flagIdx] = 8;
    }
  }

  postPlay(move) {
    if (move.vanish[0].c == 'w') super.postPlay(move);
  }

  postUndo(move) {
    if (move.vanish[0].c == 'w') super.postUndo(move);
  }

  getKingsPos() {
    let kings = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == 'b' &&
          this.getPiece(i, j) == V.KING
        ) {
          kings.push({ x: i, y: j });
        }
      }
    }
    return kings;
  }

  getCheckSquares() {
    if (this.turn == 'w') return super.getCheckSquares();
    const kings = this.getKingsPos();
    let res = [];
    for (let i of [0, 1]) {
      if (
        kings.length >= i+1 &&
        super.isAttacked([kings[i].x, kings[i].y], 'w')
      ) {
        res.push([kings[i].x, kings[i].y]);
      }
    }
    return res;
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = moves[0].vanish[0].c;
    if (color == 'w') return super.filterValid(moves);
    // Black moves: check if both kings under attack
    // If yes, moves must remove at least one attack.
    const kings = this.getKingsPos();
    return moves.filter(m => {
      this.play(m);
      let attacks = 0;
      for (let k of kings) {
        const curKingPos =
          this.board[k.x][k.y] == V.EMPTY
            ? [m.appear[0].x, m.appear[0].y] //king moved
            : [k.x, k.y]
        if (super.isAttacked(curKingPos, 'w')) attacks++;
        else break; //no need to check further
      }
      this.undo(m);
      return (
        (kings.length == 2 && attacks <= 1) ||
        (kings.length == 1 && attacks == 0)
      );
    });
  }

  getCurrentScore() {
    if (this.turn == 'w') return super.getCurrentScore();
    if (super.atLeastOneMove()) return "*";
    // Count kings on board
    const kings = this.getKingsPos();
    if (
      super.isAttacked([kings[0].x, kings[0].y], 'w') ||
      (kings.length == 2 && super.isAttacked([kings[1].x, kings[1].y], 'w'))
    ) {
      return "1-0";
    }
    return "1/2"; //stalemate
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        l: 3,
        g: 7,
        c: 3,
        w: 7
      }
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      const finalSquare = V.CoordsToSquare(move.end);
      let notation = "";
      if (move.vanish.length == 2)
        // Capture
        notation = "Px" + finalSquare;
      else {
        // No capture: indicate the initial square for potential ambiguity
        const startSquare = V.CoordsToSquare(move.start);
        notation = startSquare + finalSquare;
      }
      if (move.appear[0].p != V.PAWN)
        // Promotion
        notation += "=" + move.appear[0].p.toUpperCase();
      return notation;
    }
    return super.getNotation(move); //OK for all other pieces
  }

};
