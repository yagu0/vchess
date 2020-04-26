import { ChessRules, Move, PiPo } from "@/base_rules";
import { SuicideRules } from "@/variants/Suicide";
import { randInt } from "@/utils/alea";

export class ChakartRules extends ChessRules {
  static get PawnSpecs() {
    return SuicideRules.PawnSpecs;
  }

  static get HasCastle() {
    return false;
  }

  static get CorrConfirm() {
    // Because of bonus effects
    return false;
  }

  static get CanAnalyze() {
    return false;
  }

  hoverHighlight(x, y) {
    if (this.subTurn == 1) return false;
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (fm.end.effect != 0) return false;
    const deltaX = Math.abs(fm.end.x - x);
    const deltaY = Math.abs(fm.end.y - y);
    return (
      (deltaX == 0 && deltaY == 0) ||
      (
        this.board[x][y] == V.EMPTY &&
        (
          (fm.vanish[0].p == V.ROOK && deltaX == 1 && deltaY == 1) ||
          (fm.vanish[0].p == V.BISHOP && deltaX + deltaY == 1)
        )
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
    // Doesn't collide with bishop because color is 'a'
    return 'b';
  }
  static get BANANA() {
    return 'n';
  }
  static get EGG() {
    return 'e';
  }
  static get MUSHROOM() {
    return 'm';
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

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { captured: fenParts[5] }
    );
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
        if (['K','k','L','l'].includes(row[i])) kings[row[i]]++;
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
      w: [{ 'k': false, 'q': false }],
      b: [{ 'k': false, 'q': false }]
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
    let counts = [...Array(10).fill(0)];
    let i = 0;
    for (let p of [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.PAWN]) {
      counts[i] = this.captured["w"][p];
      counts[5 + i] = this.captured["b"][p];
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
        [V.PAWN]: parseInt(fenParsed.captured[4]),
      },
      b: {
        [V.ROOK]: parseInt(fenParsed.captured[5]),
        [V.KNIGHT]: parseInt(fenParsed.captured[6]),
        [V.BISHOP]: parseInt(fenParsed.captured[7]),
        [V.QUEEN]: parseInt(fenParsed.captured[8]),
        [V.PAWN]: parseInt(fenParsed.captured[9]),
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

  static get RESERVE_PIECES() {
    return [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN];
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
        if (this.board[i][j] == V.EMPTY) {
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
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 1) return super.getPotentialMovesFrom([x, y]);
    if (this.subTurn == 2) {
      let moves = [];
      const L = this.firstMove.length;
      const fm = this.firstMove[L-1];
      switch (fm.end.effect) {
        // case 0: a click is required (banana or bomb)
        case 1:
          // Exchange position with any piece
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
        case 2:
          // Resurrect a captured piece
          if (x >= V.size.x) moves = this.getReserveMoves([x, y]);
          break;
        case 3:
          // Play again with the same piece
          if (fm.end.x == x && fm.end.y == y)
            moves = super.getPotentialMovesFrom([x, y]);
          break;
      }
      return moves;
    }
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

  getBasicMove([x1, y1], [x2, y2], tr) {
    // Apply mushroom, bomb or banana effect (hidden to the player).
    // Determine egg effect, too, and apply its first part if possible.
    let move = super.getBasicMove([x1, y1], [x2, y2], tr);
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    const piece1 = this.getPiece(x1, y1);
    const piece2 = this.getPiece(x2, y2);
    const oppCol = V.GetOppCol(color1);
    if (
      [V.PAWN, V.KNIGHT].includes(piece1) &&
      (color2 != 'a' || !([V.BANANA, V.BOMB].includes(piece2)))
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
          const eggSquare = [
            x1 + (deltaX == 2 ? (x2 - x1) / 2 : 0),
            y1 + (deltaY == 2 ? (y2 - y1) / 2 : 0)
          ];
          if (
            this.board[eggSquare[0]][eggSquare[1]] == V.EMPTY ||
            this.getColor(eggSquare[0], eggSquare[1]) == 'a'
          ) {
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
          }
          break;
        }
      }
    }
    const applyBeffect = (steps) => {
      const [x, y] = [move.appear[0].x, move.appear[0].y];
      const moveTo = this.getRandomSquare([x, y], steps);
      move.appear[0].x = moveTo[0];
      move.appear[0].y = moveTo[1];
    };
    // For (wa)luigi effect:
    const changePieceColor = (color) => {
      let pieces = [];
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (
            this.board[i][j] != V.EMPTY &&
            this.getColor(i, j) == color
          ) {
            const piece = this.getPiece(i, j);
            if (piece != V.KING)
              pieces.push({ x: i, y: j, p: piece });
          }
        }
      }
      const cp = pieces[randInt(pieces.length)];
      move.vanish.push(
        new PiPo({
          x: cp.x,
          y: cp.y,
          c: color,
          p: cp.p
        })
      );
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
      if (this.subTurn == 1) {
        // 1) Determine the effect (some may be impossible)
        let effects = ["kingboo", "koopa", "chomp", "bowser"];
        if (this.captured[color1].some(c => c >= 1))
          effects.push("toadette");
        V.PlayOnBoard(this.board, move);
        const canPlayAgain = this.getPotentialMovesFrom([x2, y2]).length > 0;
        V.UndoOnBoard(this.board, move);
        if (canPlayAgain) effects.push("daisy");
        if (
          board.some(b =>
            b.some(cell => cell[0] == oppCol && cell[1] != V.KING))
        ) {
          effects.push("luigi");
        }
        if (
          board.some(b =>
            b.some(cell => cell[0] == color1 && cell[1] != V.KING))
        ) {
          effects.push("waluigi");
        }
        const effect = effects[randInd(effects.length)];
        // 2) Apply it if possible, or set move.end.effect
        if (["kingboo", "toadette", "daisy"].includes(effect))
          move.end.effect = effect;
        else {
          switch (effect) {
            case "koopa":
              move.appear[0].x = x1;
              move.appear[0].y = y1;
              break;
            case "chomp":
              move.appear.unshift();
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
      }
    };
    const applyMushroomEffect = () => {
      if ([V.PAWN, V.KING, V.KNIGHT].includes(piece1)) {
        // Just make another similar step, if possible (non-capturing)
        const [i, j] = [
          move.appear[0].x + 2 * (x2 - x1),
          move.appear[0].y + 2 * (y2 - y1)
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
          if (
            V.OnBoard(afterNext[0], afterNext[1]) &&
            (
              this.board[afterNext[0]][afterNext[1]] == V.EMPTY ||
              this.getColor(afterNext[0], afterNext[1]) == 'a'
            )
          ) {
            move.appear[0].x = afterNext[0];
            move.appear[0].y = afterNext[1];
            if (this.board[afterNext[0]][afterNext[1]] != V.EMPTY) {
              const object = this.getPiece(afterNext[0], afterNext[1]);
              move.vanish.push(
                new PiPo({
                  x: afterNext[0],
                  y: afterNext[0],
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
      }
    };
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
          if (this.subTurn == 1) {
            // No egg effect at subTurn 2
            if ([V.ROOK, V.BISHOP].includes(piece1)) {
              // Drop a bomb or banana at random, because even if bonus is
              // "play again" nothing can be done after next move.
              const steps = V.steps[piece1 == V.ROOK ? V.BISHOP : V.ROOK];
              const object = (piece1 == V.ROOK ? V.BANANA : V.BOMB);
              const dropOn = this.getRandomSquare([x, y], steps);
              move.appear.push(
                new PiPo({
                  x: dropOn[0],
                  y: dropOn[1],
                  c: 'a',
                  p: object
                })
              );
            }
            applyEggEffect();
          }
          break;
      }
    }
    else if (
      this.subTurn == 1 &&
      [V.ROOK, V.BISHOP].includes(piece1)
    ) {
      move.end.effect = 0;
    }
    return move;
  }

  getEnpassantCaptures([x, y], shiftX) {
    const Lep = this.epSquares.length;
    const epSquare = this.epSquares[Lep - 1]; //always at least one element
    let enpassantMove = null;
    if (
      !!epSquare &&
      epSquare.x == x + shiftX &&
      Math.abs(epSquare.y - y) == 1
    ) {
      // Not using this.getBasicMove() because the mushroom has no effect
      enpassantMove = super.getBasicMove([x, y], [epSquare.x, epSquare.y]);
      enpassantMove.vanish.push({
        x: x,
        y: epSquare.y,
        p: V.PAWN,
        c: this.getColor(x, epSquare.y)
      });
    }
    return !!enpassantMove ? [enpassantMove] : [];
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
        this.board[x + 2 * shiftX][y] == V.EMPTY
      ) {
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        this.getColor(x + shiftX, y + shiftY) == oppCol
      ) {
        this.addPawnMoves([x, y], [x + shiftX, y + shiftY], moves);
      }
    }
    Array.prototype.push.apply(
      moves,
      this.getEnpassantCaptures([x, y], shiftX)
    );
    return moves;
  }

  getPotentialQueenMoves(sq) {
    const normalMoves = super.getPotentialQueenMoves(sq);
    // If flag allows it, add 'invisible movements'
    let invisibleMoves = [];
    if (this.powerFlags[this.turn][V.QUEEN]) {
      normalMoves.forEach(m => {
        if (m.vanish.length == 1) {
          let im = JSON.parse(JSON.stringify(m));
          m.appear[0].p = V.INVISIBLE_QUEEN;
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
        if (V.OnBoard(i, j) && this.getColor(i, j) != color)
          // May just destroy a bomb or banana:
          moves.push(this.getBasicMove([x, y], [i, j]));
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
          const [i, j] = [fm.end.x + step[0], fm.end.y + step[1]];
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
      case 1: {
        const [x, y] = [fm.end.x, fm.end.y];
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
      case 2: {
        const x = V.size.x + (this.turn == 'w' ? 0 : 1);
        for (let y = 0; y < 8; y++)
          Array.prototype.push.apply(moves, this.getReserveMoves([x, y]));
        break;
      }
      case 3:
        moves = super.getPotentialMovesFrom([fm.end.x, fm.end.y]);
        break;
    }
    return moves;
  }

  doClick(square) {
    if (isNaN(square[0])) return null;
    if (this.subTurn == 1) return null;
    const L = this.firstMove.length;
    const fm = this.firstMove[L-1];
    if (fm.end.effect != 0) return null;
    const [x, y] = [square[0], square[1]];
    const deltaX = Math.abs(fm.end.x - x);
    const deltaY = Math.abs(fm.end.y - y);
    if (deltaX == 0 && deltaY == 0) {
      // Empty move:
      return {
        start: { x: -1, y: -1 },
        end: { x: -1, y: -1 },
        appear: [],
        vanish: []
      };
    }
    if (
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
    return null;
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    move.turn = [this.turn, this.subTurn];
    if (move.end.effect !== undefined) {
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
    if (move.end.effect == 2) this.reserve = this.captured;
    else this.reserve = null;
    if (move.vanish.length == 2 && move.vanish[1].c != 'a')
      // Capture: update this.captured
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
    else if (move.vanish.length == 0) {
      // A piece is back on board
      this.captured[move.appear[0].c][move.appear[0].p]++;
      this.reserve = null;
    }
    if (this.subTurn == 1) {
      // Update flags:
      if (
        move.vanish[0].p == V.KING &&
        (
          Math.abs(move.end.x - move.start.x) >= 2 ||
          Math.abs(move.end.y - move.start.y) >= 2
        )
      ) {
        this.powerFlags[move.vanish[0].c][V.KING] = false;
      }
      else if (
        move.vanish[0].p == V.QUEEN &&
        this.getPiece(move.end.x, move.end.y) == V.INVISIBLE_QUEEN
      ) {
        this.powerFlags[move.vanish[0].c][V.QUEEN] = false;
      }
      const color = move.vanish[0].c;
      const oppCol = V.GetOppCol(color);
      if (!(Object.keys(V.IMMOBILIZE_DECODE).includes(move.appear[0].p))) {
        // Look for an immobilized piece of my color: it can now move
        // Also make opponent invisible queen visible again, if any
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
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (move.end.effect !== undefined) this.firstMove.pop();
    else this.movesCount--;
    if (this.subTurn == 1) this.movesCount--;
    this.turn = move.turn[0];
    this.subTurn = move.turn[1];
    this.postUndo(move);
  }

  postUndo(move) {
    if (!!move.wasImmobilized) {
      const [i, j] = move.wasImmobilized;
      this.board[i][j] =
        this.getColor(i, j) + V.IMMOBILIZE_CODE[this.getPiece(i, j)];
    }
    if (!!move.wasInvisible) {
      const [i, j] = move.wasInvisible;
      this.board[i][j] =
        this.getColor(i, j) + V.INVISIBLE_QUEEN;
    }
    if (move.vanish.length == 2 && move.vanish[1].c != 'a')
      this.captured[move.vanish[1].c][move.vanish[1].p]--;
    else if (move.vanish.length == 0) {
      // A piece is back on board
      this.captured[move.vanish[1].c][move.vanish[1].p]++;
      this.reserve = null;
    }
    if (move.vanish.length == 0) this.reserve = this.captured;
    else this.reserve = null;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    // Find kings (not tracked in this variant)
    let kingThere = { w: false, b: false };
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.board[i][j] != V.EMPTY && this.getPiece(i, j) == V.KING)
          kingThere[this.getColor(i, j)] = true;
      }
    }
    if (!kingThere['w']) return "0-1";
    if (!kingThere['b']) return "1-0";
    return "*";
  }

  static GenRandInitFen(randomness) {
    return (
      SuicideRules.GenRandInitFen(randomness).slice(0, -1) +
      // Add Peach + Mario flags, re-add en-passant + capture counts
      "0000 - 0000000000"
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

  getNotation(move) {
    // TODO: invisibility used => move notation Q??
    // Also, bonus should be clearly indicated + bomb/bananas locations
    // TODO: effect name + code to help move notation
    if (move.vanish.length == 0) {
      const piece =
        move.appear[0].p != V.PAWN ? move.appear[0].p.toUpperCase() : "";
      return piece + "@" + V.CoordsToSquare(move.end);
    }
    return super.getNotation(move);
  }
};
