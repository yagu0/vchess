import { ChessRules, Move, PiPo } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class ChakartRules extends ChessRules {
  static get PawnSpecs() {
    return SuicideRules.PawnSpecs;
  }

  static get HasCastle() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get CorrConfirm() {
    // Because of bonus effects
    return false;
  }

  static get CanAnalyze() {
    return true; //false;
  }

  static get SomeHiddenMoves() {
    return true;
  }

  hoverHighlight(x, y) {
    if (this.subTurn == 1) return false;
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (fm.end.effect != 0) return false;
    const deltaX = Math.abs(fm.appear[0].x - x);
    const deltaY = Math.abs(fm.appear[0].y - y);
    return (
      (this.board[x][y] == V.EMPTY || this.getColor(x, y) == 'a') &&
      (
        (fm.vanish[0].p == V.ROOK && deltaX == 1 && deltaY == 1) ||
        (fm.vanish[0].p == V.BISHOP && deltaX + deltaY == 1)
      )
    );
  }

  static get IMMOBILIZE_CODE() {
    return {
      'p': 's',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'q': 't',
      'k': 'l'
    };
  }

  static get IMMOBILIZE_DECODE() {
    return {
      's': 'p',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      't': 'q',
      'l': 'k'
    };
  }

  static get INVISIBLE_QUEEN() {
    return 'i';
  }

  // Fictive color 'a', bomb banana mushroom egg
  static get BOMB() {
    return 'w'; //"Wario"
  }
  static get BANANA() {
    return 'd'; //"Donkey"
  }
  static get EGG() {
    return 'e';
  }
  static get MUSHROOM() {
    return 'm';
  }

  static fen2board(f) {
    return (
      f.charCodeAt() <= 90
        ? "w" + f.toLowerCase()
        : (['w', 'd', 'e', 'm'].includes(f) ? "a" : "b") + f
    );
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat(
      Object.keys(V.IMMOBILIZE_DECODE)).concat(
      [V.BANANA, V.BOMB, V.EGG, V.MUSHROOM, V.INVISIBLE_QUEEN])
    );
  }

  getPpath(b) {
    let prefix = "";
    if (
      b[0] == 'a' ||
      b[1] == V.INVISIBLE_QUEEN ||
      Object.keys(V.IMMOBILIZE_DECODE).includes(b[1])
    ) {
      prefix = "Chakart/";
    }
    return prefix + b;
  }

  getPPpath(m) {
    let piece = m.appear[0].p;
    if (Object.keys(V.IMMOBILIZE_DECODE).includes(piece))
      piece = V.IMMOBILIZE_DECODE[piece];
    return this.getPpath(m.appear[0].c + piece);
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { captured: fenParts[4] }
    );
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const captured = V.ParseFen(fen).captured;
    if (!captured || !captured.match(/^[0-9]{12,12}$/)) return false;
    return true;
  }

  // King can be l or L (immobilized) --> similar to Alice variant
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0, 'l': 0, 'L': 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K', 'k', 'L', 'l'].includes(row[i])) kings[row[i]]++;
        if (V.PIECES.includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i]);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (kings['k'] + kings['l'] != 1 || kings['K'] + kings['L'] != 1)
      return false;
    return true;
  }

  static IsGoodFlags(flags) {
    // 4 for Peach + Mario w, b
    return !!flags.match(/^[01]{4,4}$/);
  }

  setFlags(fenflags) {
    // King can send shell? Queen can be invisible?
    this.powerFlags = {
      w: { 'k': false, 'q': false },
      b: { 'k': false, 'q': false }
    };
    for (let c of ["w", "b"]) {
      for (let p of ['k', 'q']) {
        this.powerFlags[c][p] =
          fenflags.charAt((c == "w" ? 0 : 2) + (p == 'k' ? 0 : 1)) == "1";
      }
    }
  }

  aggregateFlags() {
    return this.powerFlags;
  }

  disaggregateFlags(flags) {
    this.powerFlags = flags;
  }

  getFen() {
    return super.getFen() + " " + this.getCapturedFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getCapturedFen();
  }

  getCapturedFen() {
    let counts = [...Array(12).fill(0)];
    let i = 0;
    for (let p of V.RESERVE_PIECES) {
      counts[i] = this.captured["w"][p];
      counts[6 + i] = this.captured["b"][p];
      i++;
    }
    return counts.join("");
  }

  scanKings() {}

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    const fenParsed = V.ParseFen(fen);
    // Initialize captured pieces' counts from FEN
    this.captured = {
      w: {
        [V.ROOK]: parseInt(fenParsed.captured[0]),
        [V.KNIGHT]: parseInt(fenParsed.captured[1]),
        [V.BISHOP]: parseInt(fenParsed.captured[2]),
        [V.QUEEN]: parseInt(fenParsed.captured[3]),
        [V.KING]: parseInt(fenParsed.captured[4]),
        [V.PAWN]: parseInt(fenParsed.captured[5]),
      },
      b: {
        [V.ROOK]: parseInt(fenParsed.captured[6]),
        [V.KNIGHT]: parseInt(fenParsed.captured[7]),
        [V.BISHOP]: parseInt(fenParsed.captured[8]),
        [V.QUEEN]: parseInt(fenParsed.captured[9]),
        [V.KING]: parseInt(fenParsed.captured[10]),
        [V.PAWN]: parseInt(fenParsed.captured[11]),
      }
    };
    this.firstMove = [];
    this.subTurn = 1;
  }

  getFlagsFen() {
    let fen = "";
    // Add power flags
    for (let c of ["w", "b"])
      for (let p of ['k', 'q']) fen += (this.powerFlags[c][p] ? "1" : "0");
    return fen;
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  getReservePpath(index, color) {
    return color + V.RESERVE_PIECES[index];
  }

  static get RESERVE_PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.KING];
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    const start = (color == 'w' && p == V.PAWN ? 1 : 0);
    const end = (color == 'b' && p == V.PAWN ? 7 : 8);
    for (let i = start; i < end; i++) {
      for (let j = 0; j < V.size.y; j++) {
        const colIJ = this.getColor(i, j);
        if (this.board[i][j] == V.EMPTY || colIJ == 'a') {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: p
              })
            ],
            vanish: [],
            start: { x: x, y: y }, //a bit artificial...
            end: { x: i, y: j }
          });
          if (colIJ == 'a') {
            const pieceIJ = this.getPiece(i, j);
            mv.vanish.push(
              new PiPo({
                x: i,
                y: j,
                c: colIJ,
                p: pieceIJ
              })
            );
            if ([V.BANANA, V.BOMB].includes(pieceIJ)) {
              // Apply first effect, remove bonus from board, and then
              // relay to getBasicMove. Finally merge mv.appear/vanish and
              // put back the bonus on the board:
              const bSteps = V.steps[pieceIJ == V.BANANA ? V.ROOK : V.BISHOP];
              const sqEffect = this.getRandomSquare([i, j], bSteps);
              if (sqEffect[0] != i || sqEffect[1] != j) {
                this.board[i][j] = color + p;
                const bMove =
                  this.getBasicMove([i, j], [sqEffect[0], sqEffect[1]]);
                this.board[i][j] = 'a' + pieceIJ;
                mv.appear[0].x = bMove.appear[0].x;
                mv.appear[0].y = bMove.appear[0].y;
                for (let k = 1; k < bMove.vanish.length; k++)
                  mv.vanish.push(bMove.vanish[k]);
              }
            }
          }
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    if (this.subTurn == 1) {
      moves = super.getPotentialMovesFrom([x, y]);
      const finalPieces = V.PawnSpecs.promotions;
      const color = this.turn;
      const lastRank = (color == "w" ? 0 : 7);
      let pMoves = [];
      moves.forEach(m => {
        if (
          m.appear.length > 0 &&
          ['p', 's'].includes(m.appear[0].p) &&
          m.appear[0].x == lastRank
        ) {
          for (let i = 1; i < finalPieces.length; i++) {
            const piece = finalPieces[i];
            let otherM = JSON.parse(JSON.stringify(m));
            otherM.appear[0].p =
              m.appear[0].p == V.PAWN
                ? finalPieces[i]
                : V.IMMOBILIZE_CODE[finalPieces[i]];
            pMoves.push(otherM);
          }
          // Finally alter m itself:
          m.appear[0].p =
            m.appear[0].p == V.PAWN
              ? finalPieces[0]
              : V.IMMOBILIZE_CODE[finalPieces[0]];
        }
      });
      Array.prototype.push.apply(moves, pMoves);
    }
    else {
      // Subturn == 2
      const L = this.firstMove.length;
      const fm = this.firstMove[L-1];
      switch (fm.end.effect) {
        // case 0: a click is required (banana or bomb)
        case "kingboo":
          // Exchange position with any piece,
          // except pawns if arriving on last rank.
          const lastRank = { 'w': 0, 'b': 7 };
          const color = this.turn;
          const allowLastRank = (this.getPiece(x, y) != V.PAWN);
          for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
              const colIJ = this.getColor(i, j);
              if (
                (i != x || j != y) &&
                this.board[i][j] != V.EMPTY &&
                colIJ != 'a'
              ) {
                const pieceIJ = this.getPiece(i, j);
                if (
                  (pieceIJ != V.PAWN || x != lastRank[colIJ]) &&
                  (allowLastRank || i != lastRank[color])
                ) {
                  const movedUnit = new PiPo({
                    x: x,
                    y: y,
                    c: colIJ,
                    p: this.getPiece(i, j)
                  });
                  let mMove = this.getBasicMove([x, y], [i, j]);
                  mMove.appear.push(movedUnit);
                  moves.push(mMove);
                }
              }
            }
          }
          break;
        case "toadette":
          // Resurrect a captured piece
          if (x >= V.size.x) moves = this.getReserveMoves([x, y]);
          break;
        case "daisy":
          // Play again with the same piece
          if (fm.appear[0].x == x && fm.appear[0].y == y)
            moves = super.getPotentialMovesFrom([x, y]);
          break;
      }
    }
    return moves;
  }

  // Helper for getBasicMove()
  getRandomSquare([x, y], steps) {
    const validSteps = steps.filter(s => {
      const [i, j] = [x + s[0], y + s[1]];
      return (
        V.OnBoard(i, j) &&
        (this.board[i][j] == V.EMPTY || this.getColor(i, j) == 'a')
      );
    });
    if (validSteps.length == 0)
      // Can happen after mushroom jump
      return [x, y];
    const step = validSteps[randInt(validSteps.length)];
    return [x + step[0], y + step[1]];
  }

  canMove([x, y], piece) {
    const color = this.getColor(x, y);
    const oppCol = V.GetOppCol(color);
    piece = piece || this.getPiece(x, y);
    if (piece == V.PAWN) {
      const forward = (color == 'w' ? -1 : 1);
      return (
        this.board[x + forward][y] != oppCol ||
        (
          V.OnBoard(x + forward, y + 1) &&
          this.board[x + forward][y + 1] != V.EMPTY &&
          this.getColor[x + forward, y + 1] == oppCol
        ) ||
        (
          V.OnBoard(x + forward, y - 1) &&
          this.board[x + forward][y - 1] != V.EMPTY &&
          this.getColor[x + forward, y - 1] == oppCol
        )
      );
    }
    // Checking one step is enough:
    const steps =
      [V.KING, V.QUEEN].includes(piece)
        ? V.steps[V.ROOK].concat(V.steps[V.BISHOP])
        : V.steps[piece];
    if (!Array.isArray(steps)) debugger;
    for (let step of steps) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        (this.board[i][j] == V.EMPTY || this.getColor(i, j) != color)
      ) {
        return true;
      }
    }
    return false;
  }

  getBasicMove([x1, y1], [x2, y2], tr) {
    // Apply mushroom, bomb or banana effect (hidden to the player).
    // Determine egg effect, too, and apply its first part if possible.
    let move = super.getBasicMove([x1, y1], [x2, y2], tr);
    const color1 = this.getColor(x1, y1);
    const piece1 = this.getPiece(x1, y1);
    const oppCol = V.GetOppCol(color1);
    if ([V.PAWN, V.KNIGHT].includes(piece1)) {
      switch (piece1) {
        case V.PAWN: {
          const twoSquaresMove = (Math.abs(x2 - x1) == 2);
          const mushroomX = x1 + (twoSquaresMove ? (x2 - x1) / 2 : 0);
          move.appear.push(
            new PiPo({
              x: mushroomX,
              y: y1,
              c: 'a',
              p: V.MUSHROOM
            })
          );
          if (this.getColor(mushroomX, y1) == 'a') {
            move.vanish.push(
              new PiPo({
                x: mushroomX,
                y: y1,
                c: 'a',
                p: this.getPiece(mushroomX, y1)
              })
            );
          }
          break;
        }
        case V.KNIGHT: {
          const deltaX = Math.abs(x2 - x1);
          const deltaY = Math.abs(y2 - y1);
          let eggSquare = [
            x1 + (deltaX == 2 ? (x2 - x1) / 2 : 0),
            y1 + (deltaY == 2 ? (y2 - y1) / 2 : 0)
          ];
          if (
            this.board[eggSquare[0]][eggSquare[1]] != V.EMPTY &&
            this.getColor(eggSquare[0], eggSquare[1]) != 'a'
          ) {
            eggSquare[0] = x1;
            eggSquare[1] = y1;
          }
          move.appear.push(
            new PiPo({
              x: eggSquare[0],
              y: eggSquare[1],
              c: 'a',
              p: V.EGG
            })
          );
          if (this.getColor(eggSquare[0], eggSquare[1]) == 'a') {
            move.vanish.push(
              new PiPo({
                x: eggSquare[0],
                y: eggSquare[1],
                c: 'a',
                p: this.getPiece(eggSquare[0], eggSquare[1])
              })
            );
          }
          break;
        }
      }
    }
    // Avoid looping back on effect already applied:
    let usedEffect = ArrayFun.init(8, 8, false);
    const applyBeffect = (steps) => {
      const [x, y] = [move.appear[0].x, move.appear[0].y];
      if (usedEffect[x][y]) return;
      usedEffect[x][y] = true;
      const moveTo = this.getRandomSquare([x, y], steps);
      move.appear[0].x = moveTo[0];
      move.appear[0].y = moveTo[1];
      if (
        this.board[moveTo[0]][moveTo[1]] != V.EMPTY &&
        this.getColor(moveTo[0], moveTo[1]) == 'a'
      ) {
        move.vanish.push(
          new PiPo({
            x: moveTo[0],
            y: moveTo[1],
            c: 'a',
            p: this.getPiece(moveTo[0], moveTo[1])
          })
        );
        // Artificially change direction, before applying new effects:
        x1 = x;
        y1 = y;
        x2 = moveTo[0];
        y2 = moveTo[1];
        switch (this.getPiece(moveTo[0], moveTo[1])) {
          case V.BANANA:
            applyBeffect(V.steps[V.ROOK]);
            break;
          case V.BOMB:
            applyBeffect(V.steps[V.BISHOP]);
            break;
          case V.MUSHROOM:
            applyMushroomEffect();
            break;
          case V.EGG:
            applyEggEffect();
            break;
        }
      }
    };
    // For (wa)luigi effect:
    const changePieceColor = (color) => {
      let pieces = [];
      const oppLastRank = (color == 'w' ? 7 : 0);
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == color) {
            const piece = this.getPiece(i, j);
            if (piece != V.KING && (piece != V.PAWN || i != oppLastRank))
              pieces.push({ x: i, y: j, p: piece });
          }
        }
      }
      // Special case of the current piece (temporarily off board):
      if (color == color1)
        pieces.push({ x: move.appear[0].x, y: move.appear[0].y, p: piece1 });
      const cp = pieces[randInt(pieces.length)];
      if (move.appear[0].x != cp.x || move.appear[0].y != cp.y) {
        move.vanish.push(
          new PiPo({
            x: cp.x,
            y: cp.y,
            c: color,
            p: cp.p
          })
        );
      }
      else move.appear.pop();
      move.appear.push(
        new PiPo({
          x: cp.x,
          y: cp.y,
          c: V.GetOppCol(color),
          p: cp.p
        })
      );
    };
    const applyEggEffect = () => {
      if (this.subTurn == 2)
        // No egg effects at subTurn 2
        return;
      // 1) Determine the effect (some may be impossible)
      let effects = ["kingboo", "koopa", "chomp", "bowser"];
      if (Object.values(this.captured[color1]).some(c => c >= 1))
        effects.push("toadette");
      const lastRank = { 'w': 0, 'b': 7 };
      let canPlayAgain = undefined;
      if (
        move.appear[0].p == V.PAWN &&
        move.appear[0].x == lastRank[color1]
      ) {
        // Always possible: promote into a queen rook or king
        canPlayAgain = true;
      }
      else {
        move.end.effect = "daisy";
        this.board[move.start.x][move.start.y] = saveCurrent;
        V.PlayOnBoard(this.board, move);
        const square = [move.appear[0].x, move.appear[0].y];
        canPlayAgain = this.canMove(square, piece1);
        V.UndoOnBoard(this.board, move);
        this.board[move.start.x][move.start.y] = V.EMPTY;
        delete move.end["effect"];
      }
      if (canPlayAgain) effects.push("daisy");
      if (
        this.board.some((b,i) =>
          b.some(cell => {
            return (
              cell[0] == oppCol &&
              cell[1] != V.KING &&
              (cell[1] != V.PAWN || i != lastRank[color1])
            );
          })
        )
      ) {
        effects.push("luigi");
      }
      if (
        (
          piece1 != V.KING &&
          (piece1 != V.PAWN || move.appear[0].x != lastRank[oppCol])
        ) ||
        this.board.some((b,i) =>
          b.some(cell => {
            return (
              cell[0] == color1 &&
              cell[1] != V.KING &&
              (cell[1] != V.PAWN || i != lastRank[oppCol])
            );
          })
        )
      ) {
        effects.push("waluigi");
      }
      const effect = effects[randInt(effects.length)];
      move.end.effect = effect;
      // 2) Apply it if possible
      if (!(["kingboo", "toadette", "daisy"].includes(effect))) {
        switch (effect) {
          case "koopa":
            move.appear = [];
            // Maybe egg effect was applied after others,
            // so just shift vanish array:
            move.vanish.shift();
            break;
          case "chomp":
            move.appear = [];
            break;
          case "bowser":
            move.appear[0].p = V.IMMOBILIZE_CODE[piece1];
            break;
          case "luigi":
            changePieceColor(oppCol);
            break;
          case "waluigi":
            changePieceColor(color1);
            break;
        }
      }
    };
    const applyMushroomEffect = () => {
      if (usedEffect[move.appear[0].x][move.appear[0].y]) return;
      usedEffect[move.appear[0].x][move.appear[0].y] = true;
      if ([V.PAWN, V.KING, V.KNIGHT].includes(piece1)) {
        // Just make another similar step, if possible (non-capturing)
        const [i, j] = [
          move.appear[0].x + (x2 - x1),
          move.appear[0].y + (y2 - y1)
        ];
        if (
          V.OnBoard(i, j) &&
          (this.board[i][j] == V.EMPTY || this.getColor(i, j) == 'a')
        ) {
          move.appear[0].x = i;
          move.appear[0].y = j;
          if (this.board[i][j] != V.EMPTY) {
            const object = this.getPiece(i, j);
            move.vanish.push(
              new PiPo({
                x: i,
                y: j,
                c: 'a',
                p: object
              })
            );
            switch (object) {
              case V.BANANA:
                applyBeffect(V.steps[V.ROOK]);
                break;
              case V.BOMB:
                applyBeffect(V.steps[V.BISHOP]);
                break;
              case V.EGG:
                applyEggEffect();
                break;
              case V.MUSHROOM:
                applyMushroomEffect();
                break;
            }
          }
        }
      }
      else {
        // Queen, bishop or rook:
        const step = [
          (x2 - x1) / Math.abs(x2 - x1) || 0,
          (y2 - y1) / Math.abs(y2 - y1) || 0
        ];
        const next = [move.appear[0].x + step[0], move.appear[0].y + step[1]];
        if (
          V.OnBoard(next[0], next[1]) &&
          this.board[next[0]][next[1]] != V.EMPTY &&
          this.getColor(next[0], next[1]) != 'a'
        ) {
          const afterNext = [next[0] + step[0], next[1] + step[1]];
          if (V.OnBoard(afterNext[0], afterNext[1])) {
            const afterColor = this.getColor(afterNext[0], afterNext[1])
            if (
              this.board[afterNext[0]][afterNext[1]] == V.EMPTY ||
              afterColor != color1
            ) {
              move.appear[0].x = afterNext[0];
              move.appear[0].y = afterNext[1];
              if (this.board[afterNext[0]][afterNext[1]] != V.EMPTY) {
                // The "object" could also be an opponent's piece
                const object = this.getPiece(afterNext[0], afterNext[1]);
                move.vanish.push(
                  new PiPo({
                    x: afterNext[0],
                    y: afterNext[1],
                    c: afterColor,
                    p: object
                  })
                );
                switch (object) {
                  case V.BANANA:
                    applyBeffect(V.steps[V.ROOK]);
                    break;
                  case V.BOMB:
                    applyBeffect(V.steps[V.BISHOP]);
                    break;
                  case V.EGG:
                    applyEggEffect();
                    break;
                  case V.MUSHROOM:
                    applyMushroomEffect();
                    break;
                }
              }
            }
          }
        }
      }
    };
    const color2 = this.getColor(x2, y2);
    const piece2 = this.getPiece(x2, y2);
    // In case of (bonus effects might go through initial square):
    // TODO: push the idea further, objects left initially should alter the
    // trajectory or move as well (mushroom or egg).
    const saveCurrent = this.board[move.start.x][move.start.y];
    this.board[move.start.x][move.start.y] = V.EMPTY;
    if (color2 == 'a') {
      switch (piece2) {
        case V.BANANA:
          applyBeffect(V.steps[V.ROOK]);
          break;
        case V.BOMB:
          applyBeffect(V.steps[V.BISHOP]);
          break;
        case V.MUSHROOM:
          applyMushroomEffect();
          break;
        case V.EGG:
          if (this.subTurn == 1)
            // No egg effect at subTurn 2
            applyEggEffect();
          break;
      }
    }
    if (
      this.subTurn == 1 &&
      move.appear.length > 0 &&
      [V.ROOK, V.BISHOP].includes(piece1)
    ) {
      const finalSquare = [move.appear[0].x, move.appear[0].y];
      if (
        color2 != 'a' ||
        this.getColor(finalSquare[0], finalSquare[1]) != 'a' ||
        this.getPiece(finalSquare[0], finalSquare[1]) != V.EGG
      ) {
        const validSteps =
          V.steps[piece1 == V.ROOK ? V.BISHOP : V.ROOK].filter(s => {
            const [i, j] = [finalSquare[0] + s[0], finalSquare[1] + s[1]];
            return (
              V.OnBoard(i, j) &&
              (this.board[i][j] == V.EMPTY || this.getColor(i, j) == 'a')
            );
          });
        if (validSteps.length >= 2) move.end.effect = 0;
        else if (validSteps.length == 1) {
          const [x, y] = [
            finalSquare[0] + validSteps[0][0],
            finalSquare[1] + validSteps[0][1]
          ];
          move.appear.push(
            new PiPo({
              x: x,
              y: y,
              c: 'a',
              p: (piece1 == V.ROOK ? V.BANANA : V.BOMB)
            })
          );
          if (this.board[x][y] != V.EMPTY) {
            move.vanish.push(
              new PiPo({ x: x, y: y, c: 'a', p: this.getPiece(x, y) }));
          }
        }
      }
    }
    this.board[move.start.x][move.start.y] = saveCurrent;
    if (
      move.appear.length == 2 &&
      move.appear[0].x == move.appear[1].x &&
      move.appear[0].y == move.appear[1].y
    ) {
      // Arrive on bonus left initially:
      move.appear.pop();
    }
    return move;
    // TODO: if loopback to initial square, simplify move.
  }

  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = V.PawnSpecs.directions[color];
    const firstRank = (color == "w" ? sizeX - 1 : 0);
    let moves = [];
    if (
      this.board[x + shiftX][y] == V.EMPTY ||
      this.getColor(x + shiftX, y) == 'a'
    ) {
      this.addPawnMoves([x, y], [x + shiftX, y], moves);
      if (
        [firstRank, firstRank + shiftX].includes(x) &&
        (
          this.board[x + 2 * shiftX][y] == V.EMPTY ||
          this.getColor(x + 2 * shiftX, y) == 'a'
        )
      ) {
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        ['a', oppCol].includes(this.getColor(x + shiftX, y + shiftY))
      ) {
        this.addPawnMoves([x, y], [x + shiftX, y + shiftY], moves);
      }
    }
    return moves;
  }

  getPotentialQueenMoves(sq) {
    const normalMoves = super.getPotentialQueenMoves(sq);
    // If flag allows it, add 'invisible movements'
    let invisibleMoves = [];
    if (this.powerFlags[this.turn][V.QUEEN]) {
      normalMoves.forEach(m => {
        if (
          m.appear.length == 1 &&
          m.vanish.length == 1 &&
          // Only simple non-capturing moves:
          m.vanish[0].c != 'a'
        ) {
          let im = JSON.parse(JSON.stringify(m));
          im.appear[0].p = V.INVISIBLE_QUEEN;
          im.end.noHighlight = true;
          invisibleMoves.push(im);
        }
      });
    }
    return normalMoves.concat(invisibleMoves);
  }

  getPotentialKingMoves([x, y]) {
    let moves = super.getPotentialKingMoves([x, y]);
    const color = this.turn;
    // If flag allows it, add 'remote shell captures'
    if (this.powerFlags[this.turn][V.KING]) {
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(step => {
        const [nextX, nextY] = [x + step[0], y + step[1]];
        if (
          V.OnBoard(nextX, nextY) &&
          (
            this.board[nextX][nextY] == V.EMPTY ||
            (
              this.getColor(nextX, nextY) == 'a' &&
              [V.EGG, V.MUSHROOM].includes(this.getPiece(nextX, nextY))
            )
          )
        ) {
          let [i, j] = [x + 2 * step[0], y + 2 * step[1]];
          while (
            V.OnBoard(i, j) &&
            (
              this.board[i][j] == V.EMPTY ||
              (
                this.getColor(i, j) == 'a' &&
                [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
              )
            )
          ) {
            i += step[0];
            j += step[1];
          }
          if (V.OnBoard(i, j)) {
            const colIJ = this.getColor(i, j);
            if (colIJ != color) {
              // May just destroy a bomb or banana:
              moves.push(
                new Move({
                  start: { x: x, y: y},
                  end: { x: i, y: j },
                  appear: [],
                  vanish: [
                    new PiPo({
                      x: i, y: j, c: colIJ, p: this.getPiece(i, j)
                    })
                  ]
                })
              );
            }
          }
        }
      });
    }
    return moves;
  }

  getSlideNJumpMoves([x, y], steps, oneStep) {
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (
        V.OnBoard(i, j) &&
        (
          this.board[i][j] == V.EMPTY ||
          (
            this.getColor(i, j) == 'a' &&
            [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
          )
        )
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getAllPotentialMoves() {
    if (this.subTurn == 1) return super.getAllPotentialMoves();
    let moves = [];
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    switch (fm.end.effect) {
      case 0:
        moves.push({
          start: { x: -1, y: -1 },
          end: { x: -1, y: -1 },
          appear: [],
          vanish: []
        });
        for (
          let step of
          (fm.vanish[0].p == V.ROOK ? V.steps[V.BISHOP] : V.steps[V.ROOK])
        ) {
          const [i, j] = [fm.appear[0].x + step[0], fm.appear[0].y + step[1]];
          if (
            V.OnBoard(i, j) &&
            (this.board[i][j] == V.EMPTY || this.getColor(i, j) == 'a')
          ) {
            let m = new Move({
              start: { x: -1, y: -1 },
              end: { x: i, y: j },
              appear: [
                new PiPo({
                  x: i,
                  y: j,
                  c: 'a',
                  p: (fm.vanish[0].p == V.ROOK ? V.BANANA : V.BOMB)
                })
              ],
              vanish: []
            });
            if (this.board[i][j] != V.EMPTY) {
              m.vanish.push(
                new PiPo({ x: i, y: j, c: 'a', p: this.getPiece(i, j) }));
            }
            moves.push(m);
          }
        }
        break;
      case "kingboo": {
        const [x, y] = [fm.appear[0].x, fm.appear[0].y];
        for (let i=0; i<8; i++) {
          for (let j=0; j<8; j++) {
            const colIJ = this.getColor(i, j);
            if (
              i != x &&
              j != y &&
              this.board[i][j] != V.EMPTY &&
              colIJ != 'a'
            ) {
              const movedUnit = new PiPo({
                x: x,
                y: y,
                c: colIJ,
                p: this.getPiece(i, j)
              });
              let mMove = this.getBasicMove([x, y], [i, j]);
              mMove.appear.push(movedUnit);
              moves.push(mMove);
            }
          }
        }
        break;
      }
      case "toadette": {
        const x = V.size.x + (this.turn == 'w' ? 0 : 1);
        for (let y = 0; y < 8; y++)
          Array.prototype.push.apply(moves, this.getReserveMoves([x, y]));
        break;
      }
      case "daisy":
        moves = super.getPotentialMovesFrom([fm.appear[0].x, fm.appear[0].y]);
        break;
    }
    return moves;
  }

  doClick(square) {
    const L = this.firstMove.length;
    const fm = (L > 0 ? this.firstMove[L-1] : null);
    if (
      isNaN(square[0]) ||
      this.subTurn == 1 ||
      !([0, "daisy"].includes(fm.end.effect))
    ) {
      return null;
    }
    const [x, y] = [square[0], square[1]];
    const deltaX = Math.abs(fm.appear[0].x - x);
    const deltaY = Math.abs(fm.appear[0].y - y);
    if (
      fm.end.effect == 0 &&
      (this.board[x][y] == V.EMPTY || this.getColor(x, y) == 'a') &&
      (
        (fm.vanish[0].p == V.ROOK && deltaX == 1 && deltaY == 1) ||
        (fm.vanish[0].p == V.BISHOP && deltaX + deltaY == 1)
      )
    ) {
      let m = new Move({
        start: { x: -1, y: -1 },
        end: { x: x, y: y },
        appear: [
          new PiPo({
            x: x,
            y: y,
            c: 'a',
            p: (fm.vanish[0].p == V.ROOK ? V.BANANA : V.BOMB)
          })
        ],
        vanish: []
      });
      if (this.board[x][y] != V.EMPTY) {
        m.vanish.push(
          new PiPo({ x: x, y: y, c: 'a', p: this.getPiece(x, y) }));
      }
      return m;
    }
    else if (
      fm.end.effect == "daisy" &&
      deltaX == 0 && deltaY == 0 &&
      !this.canMove([x, y])
    ) {
      // No possible move: return empty move
      return {
        start: { x: -1, y: -1 },
        end: { x: -1, y: -1 },
        appear: [],
        vanish: []
      };
    }
    return null;
  }

  play(move) {
//    if (!this.states) this.states = [];
//    const stateFen = this.getFen();
//    this.states.push(stateFen);

    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    move.turn = [this.turn, this.subTurn];
    if ([0, "kingboo", "toadette", "daisy"].includes(move.end.effect)) {
      this.firstMove.push(move);
      this.subTurn = 2;
    }
    else {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      this.subTurn = 1;
    }
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.end.effect == "toadette") this.reserve = this.captured;
    else this.reserve = undefined;
    const color = move.turn[0];
    if (move.vanish.length == 2 && move.vanish[1].c != 'a')
      // Capture: update this.captured
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
    else if (move.vanish.length == 0) {
      if (move.appear.length == 0 || move.appear[0].c == 'a') return;
      // A piece is back on board
      this.captured[move.appear[0].c][move.appear[0].p]--;
    }
    if (move.appear.length == 0) {
      // Three cases: king "shell capture", Chomp or Koopa
      if (this.getPiece(move.start.x, move.start.y) == V.KING)
        // King remote capture:
        this.powerFlags[color][V.KING] = false;
      else if (move.end.effect == "chomp")
        this.captured[color][move.vanish[0].p]++;
    }
    else if (move.appear[0].p == V.INVISIBLE_QUEEN)
      this.powerFlags[move.appear[0].c][V.QUEEN] = false;
    if (move.turn[1] == 2) return;
    if (
      move.appear.length == 0 ||
      !(Object.keys(V.IMMOBILIZE_DECODE).includes(move.appear[0].p))
    ) {
      // Look for an immobilized piece of my color: it can now move
      // Also make opponent invisible queen visible again, if any
      const oppCol = V.GetOppCol(color);
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.board[i][j] != V.EMPTY) {
            const colIJ = this.getColor(i, j);
            const piece = this.getPiece(i, j);
            if (
              colIJ == color &&
              Object.keys(V.IMMOBILIZE_DECODE).includes(piece)
            ) {
              this.board[i][j] = color + V.IMMOBILIZE_DECODE[piece];
              move.wasImmobilized = [i, j];
            }
            else if (
              colIJ == oppCol &&
              piece == V.INVISIBLE_QUEEN
            ) {
              this.board[i][j] = oppCol + V.QUEEN;
              move.wasInvisible = [i, j];
            }
          }
        }
      }
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if ([0, "kingboo", "toadette", "daisy"].includes(move.end.effect))
      this.firstMove.pop();
    else this.movesCount--;
    this.turn = move.turn[0];
    this.subTurn = move.turn[1];
    this.postUndo(move);

//    const stateFen = this.getFen();
//    if (stateFen != this.states[this.states.length-1]) debugger;
//    this.states.pop();
  }

  postUndo(move) {
    if (!!move.wasImmobilized) {
      const [i, j] = move.wasImmobilized;
      this.board[i][j] =
        this.getColor(i, j) + V.IMMOBILIZE_CODE[this.getPiece(i, j)];
    }
    if (!!move.wasInvisible) {
      const [i, j] = move.wasInvisible;
      this.board[i][j] = this.getColor(i, j) + V.INVISIBLE_QUEEN;
    }
    if (move.vanish.length == 2 && move.vanish[1].c != 'a')
      this.captured[move.vanish[1].c][move.vanish[1].p]--;
    else if (move.vanish.length == 0) {
      if (move.appear.length == 0 || move.appear[0].c == 'a') return;
      // A piece was back on board
      this.captured[move.appear[0].c][move.appear[0].p]++;
    }
    else if (move.appear.length == 0 && move.end.effect == "chomp")
      this.captured[move.vanish[0].c][move.vanish[0].p]--;
    if (move.vanish.length == 0) this.reserve = this.captured;
    else this.reserve = undefined;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // Find kings (not tracked in this variant)
    let kingThere = { w: false, b: false };
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          ['k', 'l'].includes(this.getPiece(i, j))
        ) {
          kingThere[this.getColor(i, j)] = true;
        }
      }
    }
    if (!kingThere['w']) return "0-1";
    if (!kingThere['b']) return "1-0";
    if (!this.atLeastOneMove()) return (this.turn == 'w' ? "0-1" : "1-0");
    return "*";
  }

  static GenRandInitFen(randomness) {
    return (
      SuicideRules.GenRandInitFen(randomness).slice(0, -1) +
      // Add Peach + Mario flags + capture counts
      "1111 000000000000"
    );
  }

  filterValid(moves) {
    return moves;
  }

  getComputerMove() {
    // Random mover:
    const moves = this.getAllValidMoves();
    let move1 = moves[randInt(moves.length)];
    this.play(move1);
    let move2 = undefined;
    if (this.subTurn == 2) {
      const moves2 = this.getAllValidMoves();
      move2 = moves2[randInt(moves2.length)];
    }
    this.undo(move1);
    if (!move2) return move1;
    return [move1, move2];
  }

  // TODO: king chomped, king koopa: notation is incomplete.
  // Also, king boo effect should be better written like "e4Sg1".
  // Toadette placements on bonus square are badly written as well.
  getNotation(move) {
    if (move.vanish.length == 0) {
      if (move.appear.length == 0) return "-";
      const piece =
        move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
      return piece + "@" + V.CoordsToSquare(move.end);
    }
    if (
      !move.end.effect &&
      move.appear.length > 0 &&
      move.appear[0].p == V.INVISIBLE_QUEEN
    ) {
      return "Q??";
    }
    const finalSquare = V.CoordsToSquare(move.end);
    let piece = undefined;
    if (move.appear.length == 0) {
      piece = this.getPiece(move.start.x, move.start.y);
      if (piece == V.KING) return "Kx" + finalSquare;
      // Koopa or Chomp:
      return (
        piece.toUpperCase() + "x" + finalSquare +
        "*" + (move.end.effect == "koopa" ? "K" : "C")
      );
    }
    else if (
      move.appear.length == 1 &&
      move.vanish.length == 1 &&
      move.appear[0].c == 'a' &&
      move.vanish[0].c == 'a'
    ) {
      // Bonus replacement:
      piece = move.appear[0].p.toUpperCase();
      return piece + "@" + finalSquare;
    }
    piece = move.vanish[0].p;
    let notation = undefined;
    if (piece == V.PAWN) {
      // Pawn move
      if (move.vanish.length >= 2) {
        // Capture
        const startColumn = V.CoordToColumn(move.start.y);
        notation = startColumn + "x" + finalSquare;
      }
      else notation = finalSquare;
      if (move.appear[0].p != V.PAWN)
        // Promotion
        notation += "=" + move.appear[0].p.toUpperCase();
    }
    else {
      notation =
        piece.toUpperCase() +
        (move.vanish.length >= 2 ? "x" : "") +
        finalSquare;
    }
    if (!!move.end.effect) {
      switch (move.end.effect) {
        case "kingboo":
          notation += "*B";
          break;
        case "toadette":
          notation += "*T";
          break;
        case "daisy":
          notation += "*D";
          break;
        case "bowser":
          notation += "*M";
          break;
        case "luigi":
          notation += "*L";
          break;
        case "waluigi":
          notation += "*W";
          break;
      }
    }
    return notation;
  }
};
