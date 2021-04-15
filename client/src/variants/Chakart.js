import { ChessRules, Move, PiPo } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export class ChakartRules extends ChessRules {

  static get Options() {
    return {
      select: [
        {
          label: "Randomness",
          variable: "randomness",
          defaut: 2,
          options: [
            { label: "Deterministic", value: 0 },
            { label: "Symmetric random", value: 1 },
            { label: "Asymmetric random", value: 2 }
          ]
        }
      ]
    };
  }

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
    return false;
  }

  static get SomeHiddenMoves() {
    return true;
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
    if (!!m.promoteInto) return m.promoteInto;
    if (m.appear.length == 0 && m.vanish.length == 1)
      // King 'remote shell capture', on an adjacent square:
      return this.getPpath(m.vanish[0].c + m.vanish[0].p);
    let piece = m.appear[0].p;
    if (Object.keys(V.IMMOBILIZE_DECODE).includes(piece))
      // Promotion by capture into immobilized piece: do not reveal!
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
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (kings['k'] + kings['l'] == 0 || kings['K'] + kings['L'] == 0)
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
    // Initialize captured pieces' counts from FEN
    const captured =
      V.ParseFen(fen).captured.split("").map(x => parseInt(x, 10));
    this.captured = {
      w: {
        [V.PAWN]: captured[0],
        [V.ROOK]: captured[1],
        [V.KNIGHT]: captured[2],
        [V.BISHOP]: captured[3],
        [V.QUEEN]: captured[4],
        [V.KING]: captured[5]
      },
      b: {
        [V.PAWN]: captured[6],
        [V.ROOK]: captured[7],
        [V.KNIGHT]: captured[8],
        [V.BISHOP]: captured[9],
        [V.QUEEN]: captured[10],
        [V.KING]: captured[11]
      }
    };
    this.effects = [];
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
        if (
          this.board[i][j] == V.EMPTY ||
          this.getColor(i, j) == 'a' ||
          this.getPiece(i, j) == V.INVISIBLE_QUEEN
        ) {
          let m = this.getBasicMove({ p: p, x: i, y: j});
          m.start = { x: x, y: y };
          moves.push(m);
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
      const L = this.effects.length;
      switch (this.effects[L-1]) {
        case "kingboo":
          // Exchange position with any visible piece,
          // except pawns if arriving on last rank.
          const lastRank = { 'w': 0, 'b': 7 };
          const color = this.turn;
          const allowLastRank = (this.getPiece(x, y) != V.PAWN);
          for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
              const colIJ = this.getColor(i, j);
              const pieceIJ = this.getPiece(i, j);
              if (
                (i != x || j != y) &&
                this.board[i][j] != V.EMPTY &&
                pieceIJ != V.INVISIBLE_QUEEN &&
                colIJ != 'a'
              ) {
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
                  let mMove = this.getBasicMove({ x: x, y: y }, [i, j]);
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
          // Play again with any piece
          moves = super.getPotentialMovesFrom([x, y]);
          break;
      }
    }
    return moves;
  }

  // Helper for getBasicMove(): banana/bomb effect
  getRandomSquare([x, y], steps) {
    const validSteps = steps.filter(s => V.OnBoard(x + s[0], y + s[1]));
    const step = validSteps[randInt(validSteps.length)];
    return [x + step[0], y + step[1]];
  }

  // Apply mushroom, bomb or banana effect (hidden to the player).
  // Determine egg effect, too, and apply its first part if possible.
  getBasicMove_aux(psq1, sq2, tr, initMove) {
    const [x1, y1] = [psq1.x, psq1.y];
    const color1 = this.turn;
    const piece1 = (!!tr ? tr.p : (psq1.p || this.getPiece(x1, y1)));
    const oppCol = V.GetOppCol(color1);
    if (!sq2) {
      let move = {
        appear: [],
        vanish: []
      };
      // banana or bomb defines next square, or the move ends there
      move.appear = [
        new PiPo({
          x: x1,
          y: y1,
          c: color1,
          p: piece1
        })
      ];
      if (this.board[x1][y1] != V.EMPTY) {
        const initP1 = this.getPiece(x1, y1);
        move.vanish = [
          new PiPo({
            x: x1,
            y: y1,
            c: this.getColor(x1, y1),
            p: initP1
          })
        ];
        if ([V.BANANA, V.BOMB].includes(initP1)) {
          const steps = V.steps[initP1 == V.BANANA ? V.ROOK : V.BISHOP];
          move.next = this.getRandomSquare([x1, y1], steps);
        }
      }
      move.end = { x: x1, y: y1 };
      return move;
    }
    const [x2, y2] = [sq2[0], sq2[1]];
    // The move starts normally, on board:
    let move = super.getBasicMove([x1, y1], [x2, y2], tr);
    if (!!tr) move.promoteInto = tr.c + tr.p; //in case of (chomped...)
    const L = this.effects.length;
    if (
      [V.PAWN, V.KNIGHT].includes(piece1) &&
      !!initMove &&
      (this.subTurn == 1 || this.effects[L-1] == "daisy")
    ) {
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
    // For (wa)luigi effect:
    const changePieceColor = (color) => {
      let pieces = [];
      const oppLastRank = (color == 'w' ? 7 : 0);
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          const piece = this.getPiece(i, j);
          if (
            (i != move.vanish[0].x || j != move.vanish[0].y) &&
            this.board[i][j] != V.EMPTY &&
            piece != V.INVISIBLE_QUEEN &&
            this.getColor(i, j) == color
          ) {
            if (piece != V.KING && (piece != V.PAWN || i != oppLastRank))
              pieces.push({ x: i, y: j, p: piece });
          }
        }
      }
      // Special case of the current piece (still at its initial position)
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
      else move.appear.shift();
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
      let effects = ["kingboo", "koopa", "chomp", "bowser", "daisy"];
      if (Object.values(this.captured[color1]).some(c => c >= 1))
        effects.push("toadette");
      const lastRank = { 'w': 0, 'b': 7 };
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
      if ([V.PAWN, V.KING, V.KNIGHT].includes(piece1)) {
        // Just make another similar step, if possible (non-capturing)
        const [i, j] = [
          move.appear[0].x + (x2 - x1),
          move.appear[0].y + (y2 - y1)
        ];
        if (
          V.OnBoard(i, j) &&
          (
            this.board[i][j] == V.EMPTY ||
            this.getPiece(i, j) == V.INVISIBLE_QUEEN ||
            this.getColor(i, j) == 'a'
          )
        ) {
          move.appear[0].x = i;
          move.appear[0].y = j;
          if (this.board[i][j] != V.EMPTY) {
            const object = this.getPiece(i, j);
            const color = this.getColor(i, j);
            move.vanish.push(
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: object
              })
            );
            switch (object) {
              case V.BANANA:
              case V.BOMB:
                const steps = V.steps[object == V.BANANA ? V.ROOK : V.BISHOP];
                move.next = this.getRandomSquare([i, j], steps);
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
          this.getPiece(next[0], next[1]) != V.INVISIBLE_QUEEN &&
          this.getColor(next[0], next[1]) != 'a'
        ) {
          const afterNext = [next[0] + step[0], next[1] + step[1]];
          if (V.OnBoard(afterNext[0], afterNext[1])) {
            const afterColor = this.getColor(afterNext[0], afterNext[1]);
            if (
              this.board[afterNext[0]][afterNext[1]] == V.EMPTY ||
              afterColor == 'a'
            ) {
              move.appear[0].x = afterNext[0];
              move.appear[0].y = afterNext[1];
              if (this.board[afterNext[0]][afterNext[1]] != V.EMPTY) {
                // object = banana, bomb, mushroom or egg
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
                  case V.BOMB:
                    const steps =
                      V.steps[object == V.BANANA ? V.ROOK : V.BISHOP];
                    move.next = this.getRandomSquare(
                      [afterNext[0], afterNext[1]], steps);
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
    if (color2 == 'a') {
      switch (piece2) {
        case V.BANANA:
        case V.BOMB:
          const steps = V.steps[piece2 == V.BANANA ? V.ROOK : V.BISHOP];
          move.next = this.getRandomSquare([x2, y2], steps);
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
      !move.next &&
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
              // NOTE: do not place a bomb or banana on the invisible queen!
              (this.board[i][j] == V.EMPTY || this.getColor(i, j) == 'a')
            );
          });
        if (validSteps.length >= 1) {
          const randIdx = randInt(validSteps.length);
          const [x, y] = [
            finalSquare[0] + validSteps[randIdx][0],
            finalSquare[1] + validSteps[randIdx][1]
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
    return move;
  }

  getBasicMove(psq1, sq2, tr) {
    let moves = [];
    if (Array.isArray(psq1)) psq1 = { x: psq1[0], y: psq1[1] };
    let m = this.getBasicMove_aux(psq1, sq2, tr, "initMove");
    while (!!m.next) {
      // Last move ended on bomb or banana, direction change
      V.PlayOnBoard(this.board, m);
      moves.push(m);
      m = this.getBasicMove_aux(
        { x: m.appear[0].x, y: m.appear[0].y }, m.next);
    }
    for (let i=moves.length-1; i>=0; i--) V.UndoOnBoard(this.board, moves[i]);
    moves.push(m);
    // Now merge moves into one
    let move = {};
    // start is wrong for Toadette moves --> it's fixed later
    move.start = { x: psq1.x, y: psq1.y };
    move.end = !!sq2 ? { x: sq2[0], y: sq2[1] } : { x: psq1.x, y: psq1.y };
    if (!!tr) move.promoteInto = moves[0].promoteInto;
    let lm = moves[moves.length-1];
    if (this.subTurn == 1 && !!lm.end.effect)
      move.end.effect = lm.end.effect;
    if (moves.length == 1) {
      move.appear = moves[0].appear;
      move.vanish = moves[0].vanish;
    }
    else {
      // Keep first vanish and last appear (if any)
      move.appear = lm.appear;
      move.vanish = moves[0].vanish;
      if (
        move.vanish.length >= 1 &&
        move.appear.length >= 1 &&
        move.vanish[0].x == move.appear[0].x &&
        move.vanish[0].y == move.appear[0].y
      ) {
        // Loopback on initial square:
        move.vanish.shift();
        move.appear.shift();
      }
      for (let i=1; i < moves.length - 1; i++) {
        for (let v of moves[i].vanish) {
          // Only vanishing objects, not appearing at init move
          if (
            v.c == 'a' &&
            (
              moves[0].appear.length == 1 ||
              moves[0].appear[1].x != v.x ||
              moves[0].appear[1].y != v.y
            )
          ) {
            move.vanish.push(v);
          }
        }
      }
      // Final vanish is our piece, but others might be relevant
      // (for some egg bonuses at least).
      for (let i=1; i < lm.vanish.length; i++) {
        if (
          lm.vanish[i].c != 'a' ||
          moves[0].appear.length == 1 ||
          moves[0].appear[1].x != lm.vanish[i].x ||
          moves[0].appear[1].y != lm.vanish[i].y
        ) {
          move.vanish.push(lm.vanish[i]);
        }
      }
    }
    return move;
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
      this.getColor(x + shiftX, y) == 'a' ||
      this.getPiece(x + shiftX, y) == V.INVISIBLE_QUEEN
    ) {
      this.addPawnMoves([x, y], [x + shiftX, y], moves);
      if (
        [firstRank, firstRank + shiftX].includes(x) &&
        (
          this.board[x + 2 * shiftX][y] == V.EMPTY ||
          this.getColor(x + 2 * shiftX, y) == 'a' ||
          this.getPiece(x + 2 * shiftX, y) == V.INVISIBLE_QUEEN
        )
      ) {
        moves.push(this.getBasicMove({ x: x, y: y }, [x + 2 * shiftX, y]));
      }
    }
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        // Pawns cannot capture invisible queen this way!
        this.getPiece(x + shiftX, y + shiftY) != V.INVISIBLE_QUEEN &&
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
        let [i, j] = [x + step[0], y + step[1]];
        while (
          V.OnBoard(i, j) &&
          (
            this.board[i][j] == V.EMPTY ||
            this.getPiece(i, j) == V.INVISIBLE_QUEEN ||
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
          this.getPiece(i, j) == V.INVISIBLE_QUEEN ||
          (
            this.getColor(i, j) == 'a' &&
            [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
          )
        )
      ) {
        moves.push(this.getBasicMove({ x: x, y: y }, [i, j]));
        if (oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]))
        moves.push(this.getBasicMove({ x: x, y: y }, [i, j]));
    }
    return moves;
  }

  getAllPotentialMoves() {
    if (this.subTurn == 1) return super.getAllPotentialMoves();
    let moves = [];
    const color = this.turn;
    const L = this.effects.length;
    switch (this.effects[L-1]) {
      case "kingboo": {
        let allPieces = [];
        for (let i=0; i<8; i++) {
          for (let j=0; j<8; j++) {
            const colIJ = this.getColor(i, j);
            const pieceIJ = this.getPiece(i, j);
            if (
              i != x && j != y &&
              this.board[i][j] != V.EMPTY &&
              colIJ != 'a' &&
              pieceIJ != V.INVISIBLE_QUEEN
            ) {
              allPieces.push({ x: i, y: j, c: colIJ, p: pieceIJ });
            }
          }
        }
        for (let x=0; x<8; x++) {
          for (let y=0; y<8; y++) {
            if (this.getColor(i, j) == color) {
              // Add exchange with something
              allPieces.forEach(pp => {
                if (pp.x != i || pp.y != j) {
                  const movedUnit = new PiPo({
                    x: x,
                    y: y,
                    c: pp.c,
                    p: pp.p
                  });
                  let mMove = this.getBasicMove({ x: x, y: y }, [pp.x, pp.y]);
                  mMove.appear.push(movedUnit);
                  moves.push(mMove);
                }
              });
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
        moves = super.getAllPotentialMoves();
        break;
    }
    return moves;
  }

  play(move) {
//    if (!this.states) this.states = [];
//    const stateFen = this.getFen();
//    this.states.push(stateFen);

    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    move.turn = [this.turn, this.subTurn];
    if (["kingboo", "toadette", "daisy"].includes(move.end.effect)) {
      this.effects.push(move.end.effect);
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
    if (
      move.vanish.length == 2 &&
      move.vanish[1].c != 'a' &&
      move.appear.length == 1 //avoid king Boo!
    ) {
      // Capture: update this.captured
      let capturedPiece = move.vanish[1].p;
      if (capturedPiece == V.INVISIBLE_QUEEN) capturedPiece = V.QUEEN;
      else if (Object.keys(V.IMMOBILIZE_DECODE).includes(capturedPiece))
        capturedPiece = V.IMMOBILIZE_DECODE[capturedPiece];
      this.captured[move.vanish[1].c][capturedPiece]++;
    }
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
    if (this.subTurn == 2) return;
    if (
      move.turn[1] == 1 &&
      move.appear.length == 0 ||
      !(Object.keys(V.IMMOBILIZE_DECODE).includes(move.appear[0].p))
    ) {
      // Look for an immobilized piece of my color: it can now move
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.board[i][j] != V.EMPTY) {
            const piece = this.getPiece(i, j);
            if (
              this.getColor(i, j) == color &&
              Object.keys(V.IMMOBILIZE_DECODE).includes(piece)
            ) {
              this.board[i][j] = color + V.IMMOBILIZE_DECODE[piece];
              move.wasImmobilized = [i, j];
            }
          }
        }
      }
    }
    // Also make opponent invisible queen visible again, if any
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == V.INVISIBLE_QUEEN
        ) {
          this.board[i][j] = oppCol + V.QUEEN;
          move.wasInvisible = [i, j];
        }
      }
    }
  }

  undo(move) {
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (["kingboo", "toadette", "daisy"].includes(move.end.effect))
      this.effects.pop();
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
    if (move.vanish.length == 2 && move.vanish[1].c != 'a') {
      let capturedPiece = move.vanish[1].p;
      if (capturedPiece == V.INVISIBLE_QUEEN) capturedPiece = V.QUEEN;
      else if (Object.keys(V.IMMOBILIZE_DECODE).includes(capturedPiece))
        capturedPiece = V.IMMOBILIZE_DECODE[capturedPiece];
      this.captured[move.vanish[1].c][capturedPiece]--;
    }
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

  static GenRandInitFen(options) {
    return (
      SuicideRules.GenRandInitFen(options).slice(0, -1) +
      // Add Peach + Mario flags + capture counts
      "1111 000000000000"
    );
  }

  filterValid(moves) {
    return moves;
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        s: 1,
        u: 5,
        o: 3,
        c: 3,
        t: 9,
        l: 1000,
        e: 0,
        d: 0,
        w: 0,
        m: 0
      }
    );
  }

  static get SEARCH_DEPTH() {
    return 1;
  }

  getComputerMove() {
    const moves = this.getAllValidMoves();
    // Split into "normal" and "random" moves:
    // (Next splitting condition is OK because cannot take self object
    // without a banana or bomb on the way).
    const deterministicMoves = moves.filter(m => {
      return m.vanish.every(a => a.c != 'a' || a.p == V.MUSHROOM);
    });
    const randomMoves = moves.filter(m => {
      return m.vanish.some(a => a.c == 'a' && a.p != V.MUSHROOM);
    });
    if (Math.random() < deterministicMoves.length / randomMoves.length)
      // Play a deterministic one: capture king or material if possible
      return super.getComputerMove(deterministicMoves);
    // Play a random effect move, at random:
    let move1 = randomMoves[randInt(randomMoves.length)];
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

  getNotation(move) {
    if (move.vanish.length == 0 && move.appear.length == 0) return "-";
    if (
      !move.end.effect &&
      move.appear.length > 0 &&
      move.appear[0].p == V.INVISIBLE_QUEEN
    ) {
      return "Q??";
    }
    const finalSquare = V.CoordsToSquare(move.end);
    // Next condition also includes Toadette placements:
    if (move.appear.length > 0 && move.vanish.every(a => a.c == 'a')) {
      const piece =
        move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
      return piece + "@" + finalSquare;
    }
    else if (move.appear.length == 0) {
      const piece = this.getPiece(move.start.x, move.start.y);
      if (piece == V.KING && !move.end.effect)
        // King remote capture
        return "Kx" + finalSquare;
      // Koopa or Chomp, or loopback after bananas, bombs & mushrooms:
      return (
        piece.toUpperCase() + "x" + finalSquare +
        (
          !!move.end.effect
            ? "*" + (move.end.effect == "koopa" ? "K" : "C")
            : ""
        )
      );
    }
    if (move.appear.length == 1 && move.vanish.length == 1) {
      const moveStart = move.appear[0].p.toUpperCase() + "@";
      if (move.appear[0].c == 'a' && move.vanish[0].c == 'a')
        // Bonus replacement:
        return moveStart + finalSquare;
      if (
        move.vanish[0].p == V.INVISIBLE_QUEEN &&
        move.appear[0].x == move.vanish[0].x &&
        move.appear[0].y == move.vanish[0].y
      ) {
        // Toadette takes invisible queen
        return moveStart + "Q" + finalSquare;
      }
    }
    if (
      move.appear.length == 2 &&
      move.vanish.length == 2 &&
      move.appear.every(a => a.c != 'a') &&
      move.vanish.every(v => v.c != 'a')
    ) {
      // King Boo exchange
      return V.CoordsToSquare(move.start) + finalSquare;
    }
    const piece = move.vanish[0].p;
    let notation = undefined;
    if (piece == V.PAWN) {
      // Pawn move
      if (this.board[move.end.x][move.end.y] != V.EMPTY) {
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
        (this.board[move.end.x][move.end.y] != V.EMPTY ? "x" : "") +
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
        case "waluigi":
          const lastAppear = move.appear[move.appear.length - 1];
          const effectOn =
            V.CoordsToSquare({ x: lastAppear.x, y : lastAppear.y });
          notation += "*" + move.end.effect[0].toUpperCase() + effectOn;
          break;
      }
    }
    return notation;
  }

};
