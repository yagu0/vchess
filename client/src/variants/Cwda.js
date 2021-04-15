import { ChessRules } from "@/base_rules";

export class CwdaRules extends ChessRules {

  static get Options() {
    return {
      select: ChessRules.Options.select.concat([
        {
          label: "Army 1",
          variable: "army1",
          defaut: 'C',
          options: [
            { label: "Colorbound Clobberers", value: 'C' },
            { label: "Nutty Knights", value: 'N' },
            { label: "Remarkable Rookies", value: 'R' },
            { label: "Fide", value: 'F' }
          ]
        },
        {
          label: "Army 2",
          variable: "army2",
          defaut: 'C',
          options: [
            { label: "Colorbound Clobberers", value: 'C' },
            { label: "Nutty Knights", value: 'N' },
            { label: "Remarkable Rookies", value: 'R' },
            { label: "Fide", value: 'F' }
          ]
        }
      ])
    };
  }

  static AbbreviateOptions(opts) {
    return opts["army1"] + opts["army2"];
  }

  static IsValidOptions(opts) {
    // Both armies filled, avoid Fide vs Fide
    return (
      opts.army1 && opts.army2 &&
      (opts.army1 != 'F' || opts.army2 != 'F')
    );
  }

  getPpath(b) {
    return (ChessRules.PIECES.includes(b[1]) ? "" : "Cwda/") + b;
  }

  static get PiecesMap() {
    return {
      // Colorbound Clobberers
      'C': {
        'r': 'd',
        'n': 'w',
        'b': 'f',
        'q': 'c',
        'k': 'k',
        'p': 'p'
      },
      // Nutty Knights
      'N': {
        'r': 'g',
        'n': 'i',
        'b': 't',
        'q': 'l',
        'k': 'k', //TODO: e
        'p': 'p' //TODO: v
      },
      // Remarkable Rookies
      'R': {
        'r': 's',
        'n': 'y',
        'b': 'h',
        'q': 'o',
        'k': 'a',
        'p': 'u'
      }
    };
  }

  static GenRandInitFen(options) {
    const baseFen = ChessRules.GenRandInitFen(options.randomness);
    let blackLine = baseFen.substr(0, 8), blackPawns = "pppppppp";
    if (options.army2 != 'F') {
      blackLine = blackLine.split('')
        .map(p => V.PiecesMap[options.army2][p]).join('');
      blackPawns = V.PiecesMap[options.army2]['p'].repeat(8);
    }
    let whiteLine = baseFen.substr(35, 8), whitePawns = "PPPPPPPP";
    if (options.army1 != 'F') {
      whiteLine = whiteLine.split('')
        .map(p => V.PiecesMap[options.army1][p.toLowerCase()])
        .join('').toUpperCase();
      whitePawns = V.PiecesMap[options.army1]['p'].toUpperCase().repeat(8);
    }
    return (
      blackLine + "/" + blackPawns +
      baseFen.substring(17, 26) +
      whitePawns + "/" + whiteLine +
      baseFen.substr(43) + " " + options.army1 + options.army2
    );
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const armies = V.ParseFen(fen).armies;
    this.army1 = armies.charAt(0);
    this.army2 = armies.charAt(1);
  }

  scanKings(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenRows = V.ParseFen(fen).position.split("/");
    for (let i = 0; i < fenRows.length; i++) {
      let k = 0;
      for (let j = 0; j < fenRows[i].length; j++) {
        const newChar = fenRows[i].charAt(j);
        if (['a', 'e', 'k'].includes(newChar)) this.kingPos["b"] = [i, k];
        else if (['A', 'E', 'K'].includes(newChar)) this.kingPos["w"] = [i, k];
        else {
          const num = parseInt(fenRows[i].charAt(j), 10);
          if (!isNaN(num)) k += num - 1;
        }
        k++;
      }
    }
  }

  static ParseFen(fen) {
    return Object.assign(
      { armies: fen.split(" ")[5] },
      ChessRules.ParseFen(fen)
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const armies = V.ParseFen(fen).armies;
    return (!!armies && armies.match(/^[CNRF]{2,2}$/));
  }

  getFen() {
    return super.getFen() + " " + this.army1 + this.army2;
  }

  static get C_ROOK() {
    return 'd';
  }
  static get C_KNIGHT() {
    return 'w';
  }
  static get C_BISHOP() {
    return 'f';
  }
  static get C_QUEEN() {
    return 'c';
  }
  static get N_ROOK() {
    return 'g';
  }
  static get N_KNIGHT() {
    return 'i';
  }
  static get N_BISHOP() {
    return 't';
  }
  static get N_QUEEN() {
    return 'l';
  }
  static get N_KING() {
    return 'e';
  }
  static get N_PAWN() {
    return 'v';
  }
  static get R_ROOK() {
    return 's';
  }
  static get R_KNIGHT() {
    return 'y';
  }
  static get R_BISHOP() {
    return 'h';
  }
  static get R_QUEEN() {
    return 'o';
  }
  static get R_KING() {
    return 'a';
  }
  static get R_PAWN() {
    return 'u';
  }

  getPiece(x, y) {
    const p = this.board[x][y][1];
    if (['u', 'v'].includes(p)) return 'p';
    if (['a', 'e'].includes(p)) return 'k';
    return p;
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(
      [
        V.C_ROOK, V.C_KNIGHT, V.C_BISHOP, V.C_QUEEN,
        V.N_ROOK, V.N_KNIGHT, V.N_BISHOP, V.N_QUEEN, V.N_KING, V.N_PAWN,
        V.R_ROOK, V.R_KNIGHT, V.R_BISHOP, V.R_QUEEN, V.R_KING, V.R_PAWN
      ]
    );
  }

  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined; //TODO: necessary line?!
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      return V.SquareToCoords(square);
    }
    // Argument is a move:
    const move = moveOrSquare;
    const s = move.start,
          e = move.end;
    if (
      s.y == e.y &&
      Math.abs(s.x - e.x) == 2 &&
      ['p', 'u', 'v'].includes(move.appear[0].p)
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined; //default
  }

  getPotentialMovesFrom(sq) {
    switch (this.getPiece(sq[0], sq[1])) {
      case V.C_ROOK: return this.getPotentialC_rookMoves(sq);
      case V.C_KNIGHT: return this.getPotentialC_knightMoves(sq);
      case V.C_BISHOP: return this.getPotentialC_bishopMoves(sq);
      case V.C_QUEEN: return this.getPotentialC_queenMoves(sq);
      case V.N_ROOK: return this.getPotentialN_rookMoves(sq);
      case V.N_KNIGHT: return this.getPotentialN_knightMoves(sq);
      case V.N_BISHOP: return this.getPotentialN_bishopMoves(sq);
      case V.N_QUEEN: return this.getPotentialN_queenMoves(sq);
      case V.R_ROOK: return this.getPotentialR_rookMoves(sq);
      case V.R_KNIGHT: return this.getPotentialR_knightMoves(sq);
      case V.R_BISHOP: return this.getPotentialR_bishopMoves(sq);
      case V.R_QUEEN: return this.getPotentialR_queenMoves(sq);
      case V.PAWN: {
        // Can promote in anything from the two current armies
        let promotions = [];
        for (let army of ["army1", "army2"]) {
          if (army == "army2" && this.army2 == this.army1) break;
          switch (this[army]) {
            case 'C': {
              Array.prototype.push.apply(promotions,
                [V.C_ROOK, V.C_KNIGHT, V.C_BISHOP, V.C_QUEEN]);
              break;
            }
            case 'N': {
              Array.prototype.push.apply(promotions,
                [V.N_ROOK, V.N_KNIGHT, V.N_BISHOP, V.N_QUEEN]);
              break;
            }
            case 'R': {
              Array.prototype.push.apply(promotions,
                [V.R_ROOK, V.R_KNIGHT, V.R_BISHOP, V.R_QUEEN]);
              break;
            }
            case 'F': {
              Array.prototype.push.apply(promotions,
                [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]);
              break;
            }
          }
        }
        return super.getPotentialPawnMoves(sq, promotions);
      }
      default: return super.getPotentialMovesFrom(sq);
    }
    return [];
  }

  static get steps() {
    return Object.assign(
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
        ],
        // Ferz
        'f': [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1]
        ],
        // Wazir
        'w': [
          [-1, 0],
          [0, -1],
          [1, 0],
          [0, 1]
        ],
        // Threeleaper
        '$3': [
          [-3, 0],
          [0, -3],
          [3, 0],
          [0, 3]
        ],
        // Narrow knight
        '$n': [
          [-2, -1],
          [-2, 1],
          [2, -1],
          [2, 1]
        ]
      },
      ChessRules.steps,
    );
  }

  getPotentialC_rookMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.b).concat(
      this.getSlideNJumpMoves(sq, V.steps.d, 1))
    );
  }

  getPotentialC_knightMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.a, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.r, 1))
    );
  }

  getPotentialC_bishopMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.d, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.a, 1)).concat(
      this.getSlideNJumpMoves(sq, V.steps.b, 1))
    );
  }

  getPotentialC_queenMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.b).concat(
        this.getSlideNJumpMoves(sq, V.steps.n, 1))
    );
  }

  getPotentialN_rookMoves(sq) {
    const c = this.turn;
    const rookSteps = [ [0, -1], [0, 1], [c == 'w' ? -1 : 1, 0] ];
    const backward = (c == 'w' ? 1 : -1);
    const kingSteps = [ [backward, -1], [backward, 0], [backward, 1] ];
    return (
      this.getSlideNJumpMoves(sq, rookSteps).concat(
      this.getSlideNJumpMoves(sq, kingSteps, 1))
    );
  }

  getPotentialN_knightMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.$n, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.f, 1))
    );
  }

  getPotentialN_bishopMoves(sq) {
    const backward = (this.turn == 'w' ? 1 : -1);
    const kingSteps = [
      [0, -1], [0, 1], [backward, -1], [backward, 0], [backward, 1]
    ];
    const forward = -backward;
    const knightSteps = [
      [2*forward, -1], [2*forward, 1], [forward, -2], [forward, 2]
    ];
    return (
      this.getSlideNJumpMoves(sq, knightSteps, 1).concat(
      this.getSlideNJumpMoves(sq, kingSteps, 1))
    );
  }

  getPotentialN_queenMoves(sq) {
    const backward = (this.turn == 'w' ? 1 : -1);
    const forward = -backward;
    const kingSteps = [
      [forward, -1], [forward, 1],
      [backward, -1], [backward, 0], [backward, 1]
    ];
    const knightSteps = [
      [2*forward, -1], [2*forward, 1], [forward, -2], [forward, 2]
    ];
    const rookSteps = [ [0, -1], [0, 1], [forward, 0] ];
    return (
      this.getSlideNJumpMoves(sq, rookSteps).concat(
      this.getSlideNJumpMoves(sq, kingSteps, 1)).concat(
      this.getSlideNJumpMoves(sq, knightSteps, 1))
    );
  }

  getPotentialR_rookMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps.r, 4);
  }

  getPotentialR_knightMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.d, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.w, 1))
    );
  }

  getPotentialR_bishopMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.d, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.f, 1)).concat(
      this.getSlideNJumpMoves(sq, V.steps.$3, 1))
    );
  }

  getPotentialR_queenMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.r).concat(
      this.getSlideNJumpMoves(sq, V.steps.n, 1))
    );
  }

  getCastleMoves([x, y]) {
    const color = this.getColor(x, y);
    let finalSquares = [ [2, 3], [V.size.y - 2, V.size.y - 3] ];
    if (
      (color == 'w' && this.army1 == 'C') ||
      (color == 'b' && this.army2 == 'C')
    ) {
      // Colorbound castle long in an unusual way:
      finalSquares[0] = [1, 2];
    }
    return super.getCastleMoves([x, y], finalSquares);
  }

  isAttacked(sq, color) {
    if (super.isAttackedByPawn(sq, color) || super.isAttackedByKing(sq, color))
      return true;
    for (let army of ['C', 'N', 'R', 'F']) {
      if (
        [this.army1, this.army2].includes(army) &&
        (
          this["isAttackedBy" + army + "_rook"](sq, color) ||
          this["isAttackedBy" + army + "_knight"](sq, color) ||
          this["isAttackedBy" + army + "_bishop"](sq, color) ||
          this["isAttackedBy" + army + "_queen"](sq, color)
        )
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByC_rook(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.C_ROOK, V.steps.b) ||
      this.isAttackedBySlideNJump(sq, color, V.C_ROOK, V.steps.d, 1)
    );
  }

  isAttackedByC_knight(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.C_KNIGHT, V.steps.r, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.C_KNIGHT, V.steps.a, 1)
    );
  }

  isAttackedByC_bishop(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.C_BISHOP, V.steps.d, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.C_BISHOP, V.steps.a, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.C_BISHOP, V.steps.f, 1)
    );
  }

  isAttackedByC_queen(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.C_QUEEN, V.steps.b) ||
      this.isAttackedBySlideNJump(sq, color, V.C_QUEEN, V.steps.n, 1)
    );
  }

  isAttackedByN_rook(sq, color) {
    const rookSteps = [ [0, -1], [0, 1], [color == 'w' ? 1 : -1, 0] ];
    const backward = (color == 'w' ? -1 : 1);
    const kingSteps = [ [backward, -1], [backward, 0], [backward, 1] ];
    return (
      this.isAttackedBySlideNJump(sq, color, V.N_ROOK, rookSteps) ||
      this.isAttackedBySlideNJump(sq, color, V.N_ROOK, kingSteps, 1)
    );
  }

  isAttackedByN_knight(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.N_KNIGHT, V.steps.$n, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.N_KNIGHT, V.steps.f, 1)
    );
  }

  isAttackedByN_bishop(sq, color) {
    const backward = (color == 'w' ? -1 : 1);
    const kingSteps = [
      [0, -1], [0, 1], [backward, -1], [backward, 0], [backward, 1]
    ];
    const forward = -backward;
    const knightSteps = [
      [2*forward, -1], [2*forward, 1], [forward, -2], [forward, 2]
    ];
    return (
      this.isAttackedBySlideNJump(sq, color, V.N_BISHOP, knightSteps, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.N_BISHOP, kingSteps, 1)
    );
  }

  isAttackedByN_queen(sq, color) {
    const backward = (color == 'w' ? -1 : 1);
    const forward = -backward;
    const kingSteps = [
      [forward, -1], [forward, 1],
      [backward, -1], [backward, 0], [backward, 1]
    ];
    const knightSteps = [
      [2*forward, -1], [2*forward, 1], [forward, -2], [forward, 2]
    ];
    const rookSteps = [ [0, -1], [0, 1], [forward, 0] ];
    return (
      this.isAttackedBySlideNJump(sq, color, V.N_QUEEN, knightSteps, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.N_QUEEN, kingSteps, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.N_QUEEN, rookSteps)
    );
  }

  isAttackedByR_rook(sq, color) {
    return this.isAttackedBySlideNJump(sq, color, V.R_ROOK, V.steps.r, 4);
  }

  isAttackedByR_knight(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.R_KNIGHT, V.steps.d, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.R_KNIGHT, V.steps.w, 1)
    );
  }

  isAttackedByR_bishop(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.R_BISHOP, V.steps.d, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.R_BISHOP, V.steps.f, 1) ||
      this.isAttackedBySlideNJump(sq, color, V.R_BISHOP, V.steps.$3, 1)
    );
  }

  isAttackedByR_queen(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.R_QUEEN, V.steps.r) ||
      this.isAttackedBySlideNJump(sq, color, V.R_QUEEN, V.steps.n, 1)
    );
  }

  // [HACK] So that the function above works also on Fide army:
  isAttackedByF_rook(sq, color) {
    return super.isAttackedByRook(sq, color);
  }
  isAttackedByF_knight(sq, color) {
    return super.isAttackedByKnight(sq, color);
  }
  isAttackedByF_bishop(sq, color) {
    return super.isAttackedByBishop(sq, color);
  }
  isAttackedByF_queen(sq, color) {
    return super.isAttackedByQueen(sq, color);
  }

  postPlay(move) {
    const c = V.GetOppCol(this.turn);
    const piece = move.appear[0].p;
    // Update king position + flags
    if (['k', 'a', 'e'].includes(piece)) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
      this.castleFlags[c] = [V.size.y, V.size.y];
    }
    // Next call is still required because the king may eat an opponent's rook
    // TODO: castleFlags will be turned off twice then.
    super.updateCastleFlags(move, piece);
  }

  postUndo(move) {
    // (Potentially) Reset king position
    const c = this.getColor(move.start.x, move.start.y);
    const piece = move.appear[0].p;
    if (['k', 'a', 'e'].includes(piece))
      this.kingPos[c] = [move.start.x, move.start.y];
  }

  static get VALUES() {
    return Object.assign(
      {
        d: 4,
        w: 3,
        f: 5,
        c: 7,
        g: 4,
        i: 3,
        t: 4,
        l: 7,
        s: 4,
        y: 3,
        h: 4,
        o: 8
      },
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    if (['u', 'v'].includes(move.appear[0].p))
      notation = notation.slice(0, -2);
    return notation;
  }

};
