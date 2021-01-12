import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class MusketeerRules extends ChessRules {

  // Extra pieces get strange letters because many taken by combinations below
  static get LEOPARD() {
    return "d";
  }
  static get CANNON() {
    return "w";
  }
  static get UNICORN() {
    return "x";
  }
  static get ELEPHANT() {
    return "e";
  }
  static get HAWK() {
    return "h";
  }
  static get FORTRESS() {
    return "f";
  }
  static get SPIDER() {
    return "y";
  }

  static get RESERVE_PIECES() {
    return (
      [V.LEOPARD, V.CANNON, V.UNICORN, V.ELEPHANT,
      V.HAWK, V.FORTRESS, V.SPIDER]
    );
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.RESERVE_PIECES);
  }

  // Decode if normal piece, or + piece1 or piece2
  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    const piece = this.board[i][j].charAt(1);
    if (V.PIECES.includes(piece)) return piece;
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

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  // Code: a/c = bishop + piece1/piece2 j/l for king,
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
    return (ChessRules.PIECES.includes(b[1]) ? "" : "Musketeer/") + b;
  }

  getReservePpath(index, color) {
    return "Musketeer/" + color + V.RESERVE_PIECES[index];
  }

  // Decode above notation into additional piece
  getExtraPiece(symbol) {
    if (['a','j','m','s','u'].includes(symbol))
      return this.extraPieces[0];
    return this.extraPieces[1];
  }

  // Inverse operation: augment piece
  getAugmented(piece) {
    const p1 = [2, 3].includes(this.movesCount);
    switch (piece) {
      case V.ROOK: return (p1 ? 'u' : 'v');
      case V.KNIGHT: return (p1 ? 'm' : 'o');
      case V.BISHOP: return (p1 ? 'a' : 'c');
      case V.QUEEN: return (p1 ? 's' : 't');
      case V.KING: return (p1 ? 'j' : 'l');
    }
    return '_'; //never reached
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // 5) Check extra pieces
    if (!fenParsed.extraPieces) return false;
    // Not exact matching (would need to look at movesCount), but OK for now
    if (!fenParsed.extraPieces.match(/^[dwxejfy-]{2,2}$/)) return false;
    return true;
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

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { extraPieces: fenParts[5] }
    );
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness) + " --";
  }

  getFen() {
    return super.getFen() + " " + this.extraPieces.join("");
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Extra pieces may not be defined yet (thus '-')
    this.extraPieces = V.ParseFen(fen).extraPieces.split("");
    // At early stages, also init reserves
    if (this.movesCount <= 5) {
      const condShow = (piece) => {
        if (this.movesCount == 0) return true;
        if (this.movesCount == 1) return piece != this.extraPieces[0];
        if (this.movesCount <= 3) return this.extraPiece.includes(piece);
        return this.extraPiece[1] == piece;
      }
      this.reserve = { w : {}, b: {} };
      for (let c of ['w', 'b']) {
        V.RESERVE_PIECES.forEach(p =>
          this.reserve[c][p] = condShow(p) ? 1 : 0);
      }
    }
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

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (
      this.reserve[color][p] == 0 ||
      ([2, 3].includes(this.movesCount) && p != this.extraPieces[0]) ||
      ([4, 5].includes(this.movesCount) && p != this.extraPieces[1])
    ) {
      return [];
    }
    let moves = [];
    const iIdx =
      (this.movesCount <= 1 ? [2, 3, 4, 5] : [color == 'w' ? 7 : 0]);
    const mappingAppear = [ [3, 4], [3, 3], [4, 4], [4, 3] ];
    for (let i of iIdx) {
      for (let j = 0; j < V.size.y; j++) {
        if (
          (this.movesCount <= 1 && this.board[i][j] == V.EMPTY) ||
          (
            this.movesCount >= 2 &&
            ChessRules.PIECES.includes(this.board[i][j].charAt(1))
          )
        ) {
          const [appearX, appearY] =
            this.movesCount <= 1
              ? mappingAppear[this.movesCount]
              : [i, j];
          const pOnBoard =
            (this.movesCount >= 2 ? this.board[i][j].charAt(1) : '');
          let mv = new Move({
            appear: [
              new PiPo({
                x: appearX,
                y: appearY,
                c: color,
                p: (this.movesCount <= 1 ? p : this.getAugmented(pOnBoard))
              })
            ],
            vanish: [],
            start: { x: x, y: y }, //a bit artificial...
            end: { x: i, y: j }
          });
          if (this.movesCount >= 2)
            mv.vanish.push(new PiPo({ x: i, y: j, c: color, p: pOnBoard }))
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  // Assumption: movesCount >= 6
  getPotentialMovesFrom([x, y]) {
    // Standard moves. If piece not in usual list, new piece appears.
    const initialPiece = this.getPiece(x, y);
    if (V.RESERVE_PIECES.includes(initialPiece)) {
      switch (initialPiece) {
        case V.LEOPARD: return this.getPotentialLeopardMoves([x, y]);
        case V.CANNON: return this.getPotentialCannonMoves([x, y]);
        case V.UNICORN: return this.getPotentialUnicornMoves([x, y]);
        case V.ELEPHANT: return this.getPotentialElephantMoves([x, y]);
        case V.HAWK: return this.getPotentialHawkMoves([x, y]);
        case V.FORTRESS: return this.getPotentialFortressMoves([x, y]);
        case V.SPIDER: return this.getPotentialSpiderMoves([x, y]);
      }
      return []; //never reached
    }
    // Following is mostly copy-paste from Titan Chess (TODO?)
    let moves = [];
    if (initialPiece == V.PAWN) {
      const promotions =
        ChessRules.PawnSpecs.promotions.concat(this.extraPieces);
      moves = super.getPotentialPawnMoves([x, y], promotions);
    }
    else moves = super.getPotentialMovesFrom([x, y]);
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

  getSlideNJumpMoves([x, y], steps, nbSteps) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      let stepCounter = 1;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (
          !!nbSteps &&
          // Next condition to remain compatible with super method
          (isNaN(parseInt(nbSteps, 10)) || nbSteps >= stepCounter)
        ) {
          continue outerLoop;
        }
        i += step[0];
        j += step[1];
        stepCounter++;
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  // All types of leaps used here:
  static get Leap2Ortho() {
    return [ [-2, 0], [0, -2], [2, 0], [0, 2] ];
  }
  static get Leap2Diago() {
    return [ [-2, -2], [-2, 2], [2, -2], [2, 2] ];
  }
  static get Leap3Ortho() {
    return [ [-3, 0], [0, -3], [3, 0], [0, 3] ];
  }
  static get Leap3Diago() {
    return [ [-3, -3], [-3, 3], [3, -3], [3, 3] ];
  }
  static get CamelSteps() {
    return [
      [-3, -1], [-3, 1], [-1, -3], [-1, 3],
      [1, -3], [1, 3], [3, -1], [3, 1]
    ];
  }
  static get VerticalKnight() {
    return [ [-2, -1], [-2, 1], [2, -1], [2, 1] ];
  }
  static get HorizontalKnight() {
    return [ [-1, -2], [-1, 2], [1, -2], [1, 2] ];
  }

  getPotentialLeopardMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], 2)
      .concat(super.getPotentialKnightMoves(sq))
    );
  }

  getPotentialCannonMoves(sq) {
    const steps =
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
      .concat(V.Leap2Ortho).concat(V.HorizontalKnight);
    return super.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialUnicornMoves(sq) {
    return (
      super.getPotentialKnightMoves(sq)
      .concat(super.getSlideNJumpMoves(sq, V.CamelSteps, "oneStep"))
    );
  }

  getPotentialElephantMoves(sq) {
    const steps =
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
      .concat(V.Leap2Ortho)
      .concat(V.Leap2Diago);
    return super.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialHawkMoves(sq) {
    const steps =
      V.Leap2Ortho.concat(V.Leap2Diago)
      .concat(V.Leap3Ortho).concat(V.Leap3Diago);
    return super.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialFortressMoves(sq) {
    const steps = V.Leap2Ortho.concat(V.VerticalKnight)
    return (
      super.getSlideNJumpMoves(sq, steps, "oneStep")
      .concat(this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], 3))
    );
  }

  getPotentialSpiderMoves(sq) {
    const steps = V.Leap2Ortho.concat(V.steps[V.KNIGHT])
    return (
      super.getSlideNJumpMoves(sq, steps, "oneStep")
      .concat(this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], 2))
    );
  }

  getPossibleMovesFrom([x, y]) {
    if (this.movesCount <= 5)
      return (x >= V.size.x ? this.getReserveMoves([x, y]) : []);
    return super.getPossibleMovesFrom([x, y]);
  }

  getAllValidMoves() {
    if (this.movesCount >= 6) return super.getAllValidMoves();
    let moves = [];
    const color = this.turn;
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      moves = moves.concat(
        this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
      );
    }
    return moves;
  }

  atLeastOneMove() {
    if (this.movesCount <= 5) return true;
    return super.atLeastOneMove();
  }

  isAttacked(sq, color) {
    if (super.isAttacked(sq, color)) return true;
    if (
      this.extraPieces.includes(V.LEOPARD) &&
      this.isAttackedByLeopard(sq, color)
    ) {
      return true;
    }
    if (
      this.extraPieces.includes(V.CANNON) &&
      this.isAttackedByCannon(sq, color)
    ) {
      return true;
    }
    if (
      this.extraPieces.includes(V.UNICORN) &&
      this.isAttackedByUnicorn(sq, color)
    ) {
      return true;
    }
    if (
      this.extraPieces.includes(V.ELEPHANT) &&
      this.isAttackedByElephant(sq, color)
    ) {
      return true;
    }
    if (
      this.extraPieces.includes(V.HAWK) &&
      this.isAttackedByHawk(sq, color)
    ) {
      return true;
    }
    if (
      this.extraPieces.includes(V.FORTRESS) &&
      this.isAttackedByFortress(sq, color)
    ) {
      return true;
    }
    if (
      this.extraPieces.includes(V.SPIDER) &&
      this.isAttackedBySpider(sq, color)
    ) {
      return true;
    }
    return false;
  }

  // Modify because of the limiyted steps options of some of the pieces here
  isAttackedBySlideNJump([x, y], color, piece, steps, nbSteps) {
    if (!!nbSteps && isNaN(parseInt(nbSteps, 10))) nbSteps = 1;
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      let stepCounter = 1;
      while (
        V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY &&
        (!nbSteps || stepCounter < nbSteps)
      ) {
        rx += step[0];
        ry += step[1];
        stepCounter++;
      }
      if (
        V.OnBoard(rx, ry) &&
        this.board[rx][ry] != V.EMPTY &&
        this.getPiece(rx, ry) == piece &&
        this.getColor(rx, ry) == color
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByLeopard(sq, color) {
    return (
      super.isAttackedBySlideNJump(
        sq, color, V.LEOPARD, V.steps[V.KNIGHT], "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.LEOPARD, V.steps[V.BISHOP], 2)
    );
  }

  isAttackedByCannon(sq, color) {
    const steps =
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
      .concat(V.Leap2Ortho).concat(V.HorizontalKnight);
    return super.isAttackedBySlideNJump(sq, color, V.CANNON, steps, "oneStep");
  }

  isAttackedByUnicorn(sq, color) {
    const steps = V.steps[V.KNIGHT].concat(V.CamelSteps)
    return (
      super.isAttackedBySlideNJump(sq, color, V.UNICORN, steps, "oneStep")
    );
  }

  isAttackedByElephant(sq, color) {
    const steps =
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
      .concat(V.Leap2Ortho)
      .concat(V.Leap2Diago);
    return (
      super.isAttackedBySlideNJump(sq, color, V.ELEPHANT, steps, "oneStep")
    );
  }

  isAttackedByHawk(sq, color) {
    const steps =
      V.Leap2Ortho.concat(V.Leap2Diago)
      .concat(V.Leap3Ortho).concat(V.Leap3Diago);
    return super.isAttackedBySlideNJump(sq, color, V.HAWK, steps, "oneStep");
  }

  isAttackedByFortress(sq, color) {
    const steps = V.Leap2Ortho.concat(V.VerticalKnight)
    return (
      super.isAttackedBySlideNJump(sq, color, V.FORTRESS, steps, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.FORTRESS, V.steps[V.BISHOP], 3)
    );
  }

  isAttackedBySpider(sq, color) {
    const steps = V.Leap2Ortho.concat(V.steps[V.KNIGHT])
    return (
      super.isAttackedBySlideNJump(sq, color, V.SPIDER, steps, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.SPIDER, V.steps[V.BISHOP], 2)
    );
  }

  getCheckSquares() {
    if (this.movesCount <= 6) return [];
    return super.getCheckSquares();
  }

  // At movesCount == 0,1: show full reserves [minus chosen piece1]
  // At movesCount == 2,3: show reserve with only 2 selected pieces
  // At movesCount == 4,5: show reserve with only piece2
  // Then, no reserve.
  postPlay(move) {
    if (this.movesCount > 6) super.postPlay(move);
    else {
      switch (this.movesCount) {
        case 1:
          this.reserve['w'][move.appear[0].p]--;
          this.reserve['b'][move.appear[0].p]--;
          this.extraPieces[0] = move.appear[0].p;
          break;
        case 2:
          this.extraPieces[1] = move.appear[0].p;
          for (let p of V.RESERVE_PIECES) {
            const resVal = (this.extraPieces.includes(p) ? 1 : 0);
            this.reserve['w'][p] = resVal;
            this.reserve['b'][p] = resVal;
          }
          break;
        case 3:
          this.reserve['w'][this.extraPieces[0]]--;
          break;
        case 4:
          this.reserve['b'][this.extraPieces[0]]--;
          break;
        case 5:
          this.reserve['w'][this.extraPieces[1]]--;
          break;
        case 6:
          this.reserve = null;
          this.board[3][3] = "";
          this.board[3][4] = "";
          break;
      }
    }
  }

  postUndo(move) {
    if (this.movesCount >= 6) super.postUndo(move);
    else {
      switch (this.movesCount) {
        case 0:
          this.reserve['w'][move.appear[0].p]++;
          this.reserve['b'][move.appear[0].p]++;
          this.extraPieces[0] = '-';
          break;
        case 1:
          this.extraPieces[1] = '-';
          for (let p of V.RESERVE_PIECES) {
            const resVal = (p != this.extraPieces[0] ? 1 : 0);
            this.reserve['w'][p] = resVal;
            this.reserve['b'][p] = resVal;
          }
          break;
        case 2:
          this.reserve['w'][this.extraPieces[0]]++;
          break;
        case 3:
          this.reserve['b'][this.extraPieces[0]]++;
          break;
        case 4:
          this.reserve['w'][this.extraPieces[1]]++;
          break;
        case 5:
          this.reserve = { w: {}, b: {} };
          for (let c of ['w', 'b'])
            V.RESERVE_PIECES.forEach(p => this.reserve[c][p] = 0);
          this.reserve['b'][this.extraPieces[1]] = 1;
          this.board[3][3] = 'b' + this.extraPieces[1];
          this.board[3][4] = 'w' + this.extraPieces[0];
          break;
      }
    }
  }

  getComputerMove() {
    if (this.movesCount >= 6) return super.getComputerMove();
    // Choose a move at random
    const moves = this.getAllValidMoves();
    return moves[randInt(moves.length)];
  }

  static get SEARCH_DEPTH() {
    return 2;
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

  static get VALUES() {
    return Object.assign(
      {
        d: 6.7,
        w: 7.5,
        x: 5.6,
        e: 6.3,
        h: 5.5,
        f: 7.6,
        y: 8.15
      },
      ChessRules.VALUES
    );
  }

  static get ExtraDictionary() {
    return {
      [V.LEOPARD]: { prefix: 'L', name: "Leopard" },
      [V.CANNON]: { prefix: 'C', name: "Cannon" },
      [V.UNICORN]: { prefix: 'U', name: "Unicorn" },
      [V.ELEPHANT]: { prefix: 'E', name: "Elephant" },
      [V.HAWK]: { prefix: 'H', name: "Hawk" },
      [V.FORTRESS]: { prefix: 'F', name: "Fortress" },
      [V.SPIDER]: { prefix: 'S', name: "Spider" }
    }
  }

  getNotation(move) {
    if (this.movesCount <= 5) {
      if (this.movesCount <= 1)
        return V.ExtraDictionary[move.appear[0].p].name;
      // Put something on the board:
      return (
        V.ExtraDictionary[V.RESERVE_PIECES[move.start.y]].prefix +
        "@" + V.CoordsToSquare(move.end)
      );
    }
    let notation = "";
    if (
      V.AUGMENTED_PIECES.includes(move.vanish[0].p) ||
      (
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
      notation = super.getNotation(smove);
    }
    // Else, more common case:
    notation = super.getNotation(move);
    const pieceSymbol = notation.charAt(0).toLowerCase();
    if (move.vanish[0].p != V.PAWN && V.RESERVE_PIECES.includes(pieceSymbol))
      notation = V.ExtraDictionary[pieceSymbol].prefix + notation.substr(1);
    return notation;
  }

};
