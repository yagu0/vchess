<template lang="pug">
div#baseGame
  input#modalEog.modal(type="checkbox")
  div#eogDiv(
    role="dialog"
    data-checkbox="modalEog"
  )
    .card.text-center
      label.modal-close(for="modalEog")
      h3.section {{ endgameMessage }}
  #gameContainer
    #boardContainer
      Board(
        ref="board"
        :vr="vr"
        :last-move="lastMove"
        :analyze="mode=='analyze'"
        :score="game.score"
        :user-color="game.mycolor"
        :orientation="orientation"
        :vname="game.vname"
        :incheck="incheck"
        @play-move="play"
        @click-square="clickSquare"
      )
      #turnIndicator(v-if="showTurn") {{ turn }}
      #controls.button-group
        button(@click="gotoBegin()")
          img.inline(src="/images/icons/fast-forward_rev.svg")
        button(@click="undo()")
          img.inline(src="/images/icons/play_rev.svg")
        button(v-if="canFlip" @click="flip()")
          img.inline(src="/images/icons/flip.svg")
        button(
          @click="runAutoplay()"
          :class="{'in-autoplay': autoplay}"
        )
          img.inline(src="/images/icons/autoplay.svg")
        button(@click="play()")
          img.inline(src="/images/icons/play.svg")
        button(@click="gotoEnd()")
          img.inline(src="/images/icons/fast-forward.svg")
      p(v-show="showFen") {{ (!!vr ? vr.getFen() : "") }}
    #movesList
      MoveList(
        :show="showMoves"
        :canAnalyze="canAnalyze"
        :canDownload="allowDownloadPGN"
        :score="game.score"
        :message="game.scoreMsg"
        :firstNum="firstMoveNumber"
        :moves="moves"
        :cursor="cursor"
        @download="download"
        @showrules="showRules"
        @analyze="toggleAnalyze"
        @goto-move="gotoMove"
        @reset-arrows="resetArrows"
      )
    .clearer
</template>

<script>
import Board from "@/components/Board.vue";
import MoveList from "@/components/MoveList.vue";
import params from "@/parameters";
import { store } from "@/store";
import { getSquareId } from "@/utils/squareId";
import { getDate } from "@/utils/datetime";
import { processModalClick } from "@/utils/modalClick";
import { getScoreMessage } from "@/utils/scoring";
import { getFullNotation } from "@/utils/notation";
import { undoMove } from "@/utils/playUndo";
export default {
  name: "my-base-game",
  components: {
    Board,
    MoveList
  },
  props: ["game"],
  data: function() {
    return {
      st: store.state,
      // NOTE: all following variables must be reset at the beginning of a game
      vr: null, //VariantRules object, game state
      endgameMessage: "",
      orientation: "w",
      mode: "",
      score: "*", //'*' means 'unfinished'
      moves: [],
      cursor: -1, //index of the move just played
      lastMove: null,
      firstMoveNumber: 0, //for printing
      incheck: [], //for Board
      inMultimove: false,
      autoplay: false,
      autoplayLoop: null,
      inPlay: false,
      stackToPlay: []
    };
  },
  computed: {
    turn: function() {
      if (!this.vr) return "";
      if (this.vr.showMoves != "all") {
        return this.st.tr[
          (this.vr.turn == 'w' ? "White" : "Black") + " to move"];
      }
      // Cannot flip: racing king or circular chess
      return (
        this.vr.movesCount == 0 && this.game.mycolor == "w"
          ? this.st.tr["It's your turn!"]
          : ""
      );
    },
    showFen: function() {
      return (
        this.mode == "analyze" &&
        this.$router.currentRoute.path.indexOf("/analyse") === -1
      );
    },
    // TODO: is it OK to pass "computed" as properties?
    // Also, some are seemingly not recomputed when vr is initialized.
    showMoves: function() {
      return this.game.score != "*"
        ? "all"
        : (!!this.vr ? this.vr.showMoves : "none");
    },
    showTurn: function() {
      return (
        this.game.score == '*' &&
        !!this.vr && (this.vr.showMoves != "all" || !this.vr.canFlip)
      );
    },
    canAnalyze: function() {
      return (
        this.game.mode != "analyze" &&
        !!this.vr && this.vr.canAnalyze
      );
    },
    canFlip: function() {
      return !!this.vr && this.vr.canFlip;
    },
    allowDownloadPGN: function() {
      return (
        this.game.score != "*" ||
        (!!this.vr && this.vr.showMoves == "all")
      );
    }
  },
  created: function() {
    if (!!this.game.fenStart) this.re_setVariables();
  },
  mounted: function() {
    if (!("ontouchstart" in window)) {
      // Desktop browser:
      const baseGameDiv = document.getElementById("baseGame");
      baseGameDiv.tabIndex = 0;
      baseGameDiv.addEventListener("click", this.focusBg);
      baseGameDiv.addEventListener("keydown", this.handleKeys);
      baseGameDiv.addEventListener("wheel", this.handleScroll);
    }
    document.getElementById("eogDiv")
      .addEventListener("click", processModalClick);
  },
  beforeDestroy: function() {
    if (!!this.autoplayLoop) clearInterval(this.autoplayLoop);
  },
  methods: {
    focusBg: function() {
      document.getElementById("baseGame").focus();
    },
    handleKeys: function(e) {
      if ([32, 37, 38, 39, 40].includes(e.keyCode)) e.preventDefault();
      switch (e.keyCode) {
        case 37:
          this.undo();
          break;
        case 39:
          this.play();
          break;
        case 38:
          this.gotoBegin();
          break;
        case 40:
          this.gotoEnd();
          break;
        case 32:
          this.flip();
          break;
      }
    },
    handleScroll: function(e) {
      e.preventDefault();
      if (e.deltaY < 0) this.undo();
      else if (e.deltaY > 0) this.play();
    },
    resetArrows: function() {
      // TODO: make arrows scale with board, and remove this
      this.$refs["board"].cancelResetArrows();
    },
    showRules: function() {
      // The button is here only on Game page:
      document.getElementById("modalRules").checked = true;
    },
    re_setVariables: function(game) {
      if (!game) game = this.game; //in case of...
      this.endgameMessage = "";
      // "w": default orientation for observed games
      this.orientation = game.mycolor || "w";
      this.mode = game.mode || game.type; //TODO: merge...
      this.moves = JSON.parse(JSON.stringify(game.moves || []));
      // Post-processing: decorate each move with notation and FEN
      this.vr = new V(game.fenStart);
      const parsedFen = V.ParseFen(game.fenStart);
      const firstMoveColor = parsedFen.turn;
      this.firstMoveNumber = Math.floor(parsedFen.movesCount / 2) + 1;
      let L = this.moves.length;
      this.moves.forEach((move,idx) => {
        // Strategy working also for multi-moves:
        if (!Array.isArray(move)) move = [move];
        const Lm = move.length;
        move.forEach((m,idxM) => {
          m.notation = this.vr.getNotation(m);
          m.unambiguous = V.GetUnambiguousNotation(m);
          this.vr.play(m);
          const checkSquares = this.vr.getCheckSquares();
          if (checkSquares.length > 0) m.notation += "+";
          if (idxM == Lm - 1) m.fen = this.vr.getFen();
          if (idx == L - 1 && idxM == Lm - 1) {
            this.incheck = checkSquares;
            const score = this.vr.getCurrentScore();
            if (["1-0", "0-1"].includes(score)) m.notation += "#";
          }
        });
      });
      if (firstMoveColor == "b") {
        // 'start' & 'end' is required for Board component
        this.moves.unshift({
          notation: "...",
          unambiguous: "...",
          start: { x: -1, y: -1 },
          end: { x: -1, y: -1 },
          fen: game.fenStart
        });
        L++;
      }
      this.positionCursorTo(L - 1);
    },
    positionCursorTo: function(index) {
      this.cursor = index;
      // Note: last move in moves array might be a multi-move
      if (index >= 0) this.lastMove = this.moves[index];
      else this.lastMove = null;
    },
    toggleAnalyze: function() {
      if (this.mode != "analyze") {
        // Enter analyze mode:
        this.gameMode = this.mode; //was not 'analyze'
        this.mode = "analyze";
        this.gameCursor = this.cursor;
        this.gameMoves = JSON.parse(JSON.stringify(this.moves));
        document.getElementById("analyzeBtn").classList.add("active");
      }
      else {
        // Exit analyze mode:
        this.mode = this.gameMode ;
        this.cursor = this.gameCursor;
        this.moves = this.gameMoves;
        let fen = this.game.fenStart;
        if (this.cursor >= 0) {
          let mv = this.moves[this.cursor];
          if (!Array.isArray(mv)) mv = [mv];
          fen = mv[mv.length-1].fen;
        }
        this.vr = new V(fen);
        document.getElementById("analyzeBtn").classList.remove("active");
      }
    },
    download: function() {
      const content = this.getPgn();
      // Prepare and trigger download link
      let downloadAnchor = document.getElementById("download");
      downloadAnchor.setAttribute("download", "game.pgn");
      downloadAnchor.href =
        "data:text/plain;charset=utf-8," + encodeURIComponent(content);
      downloadAnchor.click();
    },
    getPgn: function() {
      let pgn = "";
      pgn += '[Site "vchess.club"]\n';
      pgn += '[Variant "' + this.game.vname + '"]\n';
      const gdt = getDate(new Date(this.game.created || Date.now()));
      pgn += '[Date "' + gdt + '"]\n';
      pgn += '[White "' + this.game.players[0].name + '"]\n';
      pgn += '[Black "' + this.game.players[1].name + '"]\n';
      pgn += '[Fen "' + this.game.fenStart + '"]\n';
      pgn += '[Result "' + this.game.score + '"]\n';
      if (!!this.game.id)
        pgn += '[Url "' + params.serverUrl + '/game/' + this.game.id + '"]\n';
      if (!!this.game.cadence)
        pgn += '[Cadence "' + this.game.cadence + '"]\n';
      pgn += '\n';
      for (let i = 0; i < this.moves.length; i += 2) {
        if (i > 0) pgn += " ";
        // Adjust dots notation for a better display:
        let fullNotation = getFullNotation(this.moves[i]);
        if (fullNotation == "...") fullNotation = "..";
        pgn += (i / 2 + this.firstMoveNumber) + "." + fullNotation;
        if (i+1 < this.moves.length)
          pgn += " " + getFullNotation(this.moves[i+1]);
      }
      pgn += "\n\n";
      for (let i = 0; i < this.moves.length; i += 2) {
        const moveNumber = i / 2 + this.firstMoveNumber;
        // Skip "dots move", useless for machine reading:
        if (this.moves[i].notation != "...") {
          pgn += moveNumber + ".w " +
            getFullNotation(this.moves[i], "unambiguous") + "\n";
        }
        if (i+1 < this.moves.length) {
          pgn += moveNumber + ".b " +
            getFullNotation(this.moves[i+1], "unambiguous") + "\n";
        }
      }
      return pgn;
    },
    showEndgameMsg: function(message) {
      this.endgameMessage = message;
      document.getElementById("modalEog").checked = true;
    },
    runAutoplay: function() {
      const infinitePlay = () => {
        if (this.cursor == this.moves.length - 1) {
          clearInterval(this.autoplayLoop);
          this.autoplayLoop = null;
          this.autoplay = false;
          return;
        }
        if (this.inPlay || this.inMultimove)
          // Wait next tick
          return;
        this.play();
      };
      if (this.autoplay) {
        this.autoplay = false;
        clearInterval(this.autoplayLoop);
        this.autoplayLoop = null;
      } else {
        this.autoplay = true;
        setTimeout(
          () => {
            infinitePlay();
            this.autoplayLoop = setInterval(infinitePlay, 1500);
          },
          // Small delay otherwise the first move is played too fast
          500
        );
      }
    },
    // Animate an elementary move
    animateMove: function(move, callback) {
      let startSquare = document.getElementById(getSquareId(move.start));
      if (!startSquare) return; //shouldn't happen but...
      let endSquare = document.getElementById(getSquareId(move.end));
      let rectStart = startSquare.getBoundingClientRect();
      let rectEnd = endSquare.getBoundingClientRect();
      let translation = {
        x: rectEnd.x - rectStart.x,
        y: rectEnd.y - rectStart.y
      };
      let movingPiece = document.querySelector(
        "#" + getSquareId(move.start) + " > img.piece"
      );
      // For some unknown reasons Opera get "movingPiece == null" error
      // TODO: is it calling 'animate()' twice ? One extra time ?
      if (!movingPiece) return;
      const squares = document.getElementsByClassName("board");
      for (let i = 0; i < squares.length; i++) {
        let square = squares.item(i);
        if (square.id != getSquareId(move.start))
          // HACK for animation:
          // (with positive translate, image slides "under background")
          square.style.zIndex = "-1";
      }
      movingPiece.style.transform =
        "translate(" + translation.x + "px," + translation.y + "px)";
      movingPiece.style.transitionDuration = "0.25s";
      movingPiece.style.zIndex = "3000";
      setTimeout(() => {
        for (let i = 0; i < squares.length; i++)
          squares.item(i).style.zIndex = "auto";
        movingPiece.style = {}; //required e.g. for 0-0 with KR swap
        callback();
      }, 250);
    },
    // For Analyse mode:
    emitFenIfAnalyze: function() {
      if (this.game.mode == "analyze") {
        let fen = this.game.fenStart;
        if (!!this.lastMove) {
          if (Array.isArray(this.lastMove)) {
            const L = this.lastMove.length;
            fen = this.lastMove[L-1].fen;
          }
          else fen = this.lastMove.fen;
        }
        this.$emit("fenchange", fen);
      }
    },
    clickSquare: function(square) {
      // Some variants make use of a single click at specific times:
      const move = this.vr.doClick(square);
      if (!!move) this.play(move);
    },
    // "light": if gotoMove() or gotoEnd()
    play: function(move, received, light, noemit) {
      // Freeze while choices are shown:
      if (this.$refs["board"].choices.length > 0) return;
      const navigate = !move;
      // Forbid playing outside analyze mode, except if move is received.
      // Sufficient condition because Board already knows which turn it is.
      if (
        this.mode != "analyze" &&
        !navigate &&
        !received &&
        (this.game.score != "*" || this.cursor < this.moves.length - 1)
      ) {
        return;
      }
      if (!!received) {
        if (this.mode == "analyze") this.toggleAnalyze();
        if (this.cursor < this.moves.length - 1)
          // To play a received move, cursor must be at the end of the game:
          this.gotoEnd();
      }
      if (!!noemit) {
        if (this.inPlay) {
          // Received moves in observed games can arrive too fast:
          this.stackToPlay.unshift(move);
          return;
        }
        this.inPlay = true;
      }
      // The board may show some the possible moves: (TODO: bad solution)
      this.$refs["board"].resetCurrentAttempt();
      const playSubmove = (smove) => {
        smove.notation = this.vr.getNotation(smove);
        smove.unambiguous = V.GetUnambiguousNotation(smove);
        this.vr.play(smove);
        if (this.inMultimove && !!this.lastMove) {
          if (!Array.isArray(this.lastMove))
            this.lastMove = [this.lastMove, smove];
          else this.lastMove.push(smove);
        }
        // Is opponent (or me) in check?
        this.incheck = this.vr.getCheckSquares();
        if (this.incheck.length > 0) smove.notation += "+";
        if (!this.inMultimove) {
          // First sub-move:
          this.lastMove = smove;
          // Condition is "!navigate" but we mean "!this.autoplay"
          if (!navigate) {
            if (this.cursor < this.moves.length - 1)
              this.moves = this.moves.slice(0, this.cursor + 1);
            this.moves.push(smove);
          }
          this.inMultimove = true; //potentially
          this.cursor++;
        } else if (!navigate) {
          // Already in the middle of a multi-move
          const L = this.moves.length;
          if (!Array.isArray(this.moves[L-1]))
            this.$set(this.moves, L-1, [this.moves[L-1], smove]);
          else this.moves[L-1].push(smove);
        }
      };
      const playMove = () => {
        const animate = (
          ["all", "highlight"].includes(V.ShowMoves) &&
          (this.autoplay || !!received)
        );
        if (!Array.isArray(move)) move = [move];
        let moveIdx = 0;
        let self = this;
        const initurn = this.vr.turn;
        (function executeMove() {
          const smove = move[moveIdx++];
          // NOTE: condition "smove.start.x >= 0" required for Dynamo,
          // because second move may be empty.
          if (animate && smove.start.x >= 0) {
            self.animateMove(smove, () => {
              playSubmove(smove);
              if (moveIdx < move.length)
                setTimeout(executeMove, 500);
              else afterMove(smove, initurn);
            });
          } else {
            playSubmove(smove);
            if (moveIdx < move.length) executeMove();
            else afterMove(smove, initurn);
          }
        })();
      };
      const computeScore = () => {
        const score = this.vr.getCurrentScore();
        if (!navigate) {
          if (["1-0","0-1"].includes(score)) {
            if (Array.isArray(this.lastMove)) {
              const L = this.lastMove.length;
              this.lastMove[L - 1].notation += "#";
            }
            else this.lastMove.notation += "#";
          }
        }
        if (score != "*" && this.mode == "analyze") {
          const message = getScoreMessage(score);
          // Just show score on screen (allow undo)
          this.showEndgameMsg(score + " . " + this.st.tr[message]);
        }
        return score;
      };
      const afterMove = (smove, initurn) => {
        if (this.vr.turn != initurn) {
          // Turn has changed: move is complete
          if (!smove.fen)
            // NOTE: only FEN of last sub-move is required (=> setting it here)
            smove.fen = this.vr.getFen();
          this.emitFenIfAnalyze();
          this.inMultimove = false;
          this.score = computeScore();
          if (this.mode != "analyze" && !navigate) {
            if (!noemit && this.mode != "analyze") {
              // Post-processing (e.g. computer play).
              const L = this.moves.length;
              // NOTE: always emit the score, even in unfinished,
              // to tell Game::processMove() that it's not a received move.
              this.$emit("newmove", this.moves[L-1], { score: this.score });
            } else {
              this.inPlay = false;
              if (this.stackToPlay.length > 0)
                // Move(s) arrived in-between
                this.play(this.stackToPlay.pop(), received, light, noemit);
            }
          }
        }
      };
      // NOTE: navigate and received are mutually exclusive
      if (navigate) {
        // The move to navigate to is necessarily full:
        if (this.cursor == this.moves.length - 1) return; //no more moves
        move = this.moves[this.cursor + 1];
        if (!this.autoplay) {
          // Just play the move:
          if (!Array.isArray(move)) move = [move];
          for (let i=0; i < move.length; i++) this.vr.play(move[i]);
          if (!light) {
            this.lastMove = move;
            this.incheck = this.vr.getCheckSquares();
            this.score = computeScore();
            this.emitFenIfAnalyze();
          }
          this.cursor++;
          return;
        }
      }
      playMove();
    },
    cancelCurrentMultimove: function() {
      const L = this.moves.length;
      let move = this.moves[L-1];
      if (!Array.isArray(move)) move = [move];
      for (let i = move.length - 1; i >= 0; i--) this.vr.undo(move[i]);
      this.moves.pop();
      this.cursor--;
      this.inMultimove = false;
    },
    cancelLastMove: function() {
      // The last played move was canceled (corr game)
      this.undo();
      this.moves.pop();
    },
    // "light": if gotoMove() or gotoBegin()
    undo: function(move, light) {
      // Freeze while choices are shown:
      if (this.$refs["board"].choices.length > 0) return;
      this.$refs["board"].resetCurrentAttempt();
      if (this.inMultimove) {
        this.cancelCurrentMultimove();
        this.incheck = this.vr.getCheckSquares();
      } else {
        if (!move) {
          const minCursor =
            this.moves.length > 0 && this.moves[0].notation == "..."
              ? 1
              : 0;
          if (this.cursor < minCursor) return; //no more moves
          move = this.moves[this.cursor];
        }
        this.$refs["board"].resetCurrentAttempt();
        undoMove(move, this.vr);
        if (light) this.cursor--;
        else {
          this.positionCursorTo(this.cursor - 1);
          this.incheck = this.vr.getCheckSquares();
          this.emitFenIfAnalyze();
        }
      }
    },
    gotoMove: function(index) {
      if (this.$refs["board"].choices.length > 0) return;
      this.$refs["board"].resetCurrentAttempt();
      if (this.inMultimove) this.cancelCurrentMultimove();
      if (index == this.cursor) return;
      if (index < this.cursor) {
        while (this.cursor > index)
          this.undo(null, null, "light");
      }
      else {
        // index > this.cursor)
        while (this.cursor < index)
          this.play(null, null, "light");
      }
      // NOTE: next line also re-assign cursor, but it's very light
      this.positionCursorTo(index);
      this.incheck = this.vr.getCheckSquares();
      this.emitFenIfAnalyze();
    },
    gotoBegin: function() {
      if (this.$refs["board"].choices.length > 0) return;
      this.$refs["board"].resetCurrentAttempt();
      if (this.inMultimove) this.cancelCurrentMultimove();
      const minCursor =
        this.moves.length > 0 && this.moves[0].notation == "..."
          ? 1
          : 0;
      while (this.cursor >= minCursor) this.undo(null, null, "light");
      this.lastMove = (minCursor == 1 ? this.moves[0] : null);
      this.incheck = this.vr.getCheckSquares();
      this.emitFenIfAnalyze();
    },
    gotoEnd: function() {
      if (this.$refs["board"].choices.length > 0) return;
      this.$refs["board"].resetCurrentAttempt();
      if (this.cursor == this.moves.length - 1) return;
      this.gotoMove(this.moves.length - 1);
      this.emitFenIfAnalyze();
    },
    flip: function() {
      if (this.$refs["board"].choices.length > 0) return;
      this.orientation = V.GetOppCol(this.orientation);
    }
  }
};
</script>

<style lang="sass" scoped>
[type="checkbox"]#modalEog+div .card
  min-height: 45px

#baseGame
  width: 100%
  &:focus
    outline: none

#gameContainer
  margin-left: auto
  margin-right: auto

#downloadDiv
  display: inline-block

#controls
  user-select: none
  button
    border: none
    margin: 0
    padding-top: 5px
    padding-bottom: 5px

.in-autoplay
  background-color: #FACF8C

img.inline
  height: 22px
  padding-top: 5px
  @media screen and (max-width: 767px)
    height: 18px

#turnIndicator
  text-align: center
  font-weight: bold

#boardContainer
  float: left
// TODO: later, maybe, allow movesList of variable width
// or e.g. between 250 and 350px (but more complicated)

#movesList
  width: 280px
  float: left

@media screen and (max-width: 767px)
  #movesList
    width: 100%
    float: none
    clear: both
</style>
