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
        :vr="vr"
        :last-move="lastMove"
        :analyze="game.mode=='analyze'"
        :score="game.score"
        :user-color="game.mycolor"
        :orientation="orientation"
        :vname="game.vname"
        :incheck="incheck"
        @play-move="play"
      )
      #turnIndicator(v-if="showTurn") {{ turn }}
      #controls.button-group
        button(@click="gotoBegin()")
          img.inline(src="/images/icons/fast-forward_rev.svg")
        button(@click="undo()")
          img.inline(src="/images/icons/play_rev.svg")
        button(v-if="canFlip" @click="flip()")
          img.inline(src="/images/icons/flip.svg")
        button(@click="play()")
          img.inline(src="/images/icons/play.svg")
        button(@click="gotoEnd()")
          img.inline(src="/images/icons/fast-forward.svg")
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
        @analyze="analyzePosition"
        @goto-move="gotoMove"
      )
    .clearer
</template>

<script>
import Board from "@/components/Board.vue";
import MoveList from "@/components/MoveList.vue";
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
      score: "*", //'*' means 'unfinished'
      moves: [],
      cursor: -1, //index of the move just played
      lastMove: null,
      firstMoveNumber: 0, //for printing
      incheck: [], //for Board
      inMultimove: false,
      inPlay: false,
      stackToPlay: []
    };
  },
  computed: {
    showMoves: function() {
      return this.game.score != "*"
        ? "all"
        : (this.vr ? this.vr.showMoves : "none");
    },
    showTurn: function() {
      return (
        this.game.score == '*' &&
        this.vr &&
        (this.vr.showMoves != "all" || !this.vr.canFlip)
      );
    },
    turn: function() {
      if (!this.vr)
        return "";
      if (this.vr.showMoves != "all")
        return this.st.tr[(this.vr.turn == 'w' ? "White" : "Black") + " to move"]
      // Cannot flip: racing king or circular chess
      return this.vr.movesCount == 0 && this.game.mycolor == "w"
        ? this.st.tr["It's your turn!"]
        : "";
    },
    canAnalyze: function() {
      return this.game.mode != "analyze" && this.vr && this.vr.canAnalyze;
    },
    canFlip: function() {
      return this.vr && this.vr.canFlip;
    },
    allowDownloadPGN: function() {
      return this.game.score != "*" || (this.vr && this.vr.showMoves == "all");
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
    showRules: function() {
      //this.$router.push("/variants/" + this.game.vname);
      window.open("#/variants/" + this.game.vname, "_blank"); //better
    },
    re_setVariables: function(game) {
      if (!game) game = this.game; //in case of...
      this.endgameMessage = "";
      // "w": default orientation for observed games
      this.orientation = game.mycolor || "w";
      this.moves = JSON.parse(JSON.stringify(game.moves || []));
      // Post-processing: decorate each move with notation and FEN
      this.vr = new V(game.fenStart);
      const parsedFen = V.ParseFen(game.fenStart);
      const firstMoveColor = parsedFen.turn;
      this.firstMoveNumber = Math.floor(parsedFen.movesCount / 2);
      let L = this.moves.length;
      this.moves.forEach(move => {
        // Strategy working also for multi-moves:
        if (!Array.isArray(move)) move = [move];
        move.forEach((m,idx) => {
          m.notation = this.vr.getNotation(m);
          this.vr.play(m);
          if (idx < L - 1 && this.vr.getCheckSquares(this.vr.turn).length > 0)
            m.notation += "+";
        });
      });
      if (firstMoveColor == "b") {
        // 'start' & 'end' is required for Board component
        this.moves.unshift({
          notation: "...",
          start: { x: -1, y: -1 },
          end: { x: -1, y: -1 },
          fen: game.fenStart
        });
        L++;
      }
      this.positionCursorTo(this.moves.length - 1);
      this.incheck = this.vr.getCheckSquares(this.vr.turn);
      const score = this.vr.getCurrentScore();
      if (["1-0","0-1"].includes(score))
        this.moves[L - 1].notation += "#";
      else if (this.vr.getCheckSquares(this.vr.turn).length > 0)
        this.moves[L - 1].notation += "+";
    },
    positionCursorTo: function(index) {
      this.cursor = index;
      // Caution: last move in moves array might be a multi-move
      if (index >= 0) {
        if (Array.isArray(this.moves[index])) {
          const L = this.moves[index].length;
          this.lastMove = this.moves[index][L - 1];
        } else {
          this.lastMove = this.moves[index];
        }
      } else this.lastMove = null;
    },
    analyzePosition: function() {
      let newUrl =
        "/analyse/" +
        this.game.vname +
        "/?fen=" +
        this.vr.getFen().replace(/ /g, "_");
      if (this.game.mycolor)
        newUrl += "&side=" + this.game.mycolor;
      // Open in same tab in live games (against cheating)
      if (this.game.type == "live") this.$router.push(newUrl);
      else window.open("#" + newUrl);
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
      pgn += '[Date "' + getDate(new Date()) + '"]\n';
      pgn += '[White "' + this.game.players[0].name + '"]\n';
      pgn += '[Black "' + this.game.players[1].name + '"]\n';
      pgn += '[Fen "' + this.game.fenStart + '"]\n';
      pgn += '[Result "' + this.game.score + '"]\n\n';
      for (let i = 0; i < this.moves.length; i += 2) {
        pgn += (i/2+1) + "." + getFullNotation(this.moves[i]) + " ";
        if (i+1 < this.moves.length)
          pgn += getFullNotation(this.moves[i+1]) + " ";
      }
      return pgn + "\n";
    },
    showEndgameMsg: function(message) {
      this.endgameMessage = message;
      document.getElementById("modalEog").checked = true;
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
      // TOOO: is it calling 'animate()' twice ? One extra time ?
      if (!movingPiece) return;
      // HACK for animation (with positive translate, image slides "under background")
      // Possible improvement: just alter squares on the piece's way...
      const squares = document.getElementsByClassName("board");
      for (let i = 0; i < squares.length; i++) {
        let square = squares.item(i);
        if (square.id != getSquareId(move.start)) square.style.zIndex = "-1";
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
        this.$emit(
          "fenchange",
          !!this.lastMove ? this.lastMove.fen : this.game.fenStart
        );
      }
    },
    // "light": if gotoMove() or gotoEnd()
    play: function(move, received, light, noemit) {
      if (!!noemit) {
        if (this.inPlay) {
          // Received moves in observed games can arrive too fast:
          this.stackToPlay.unshift(move);
          return;
        }
        this.inPlay = true;
      }
      const navigate = !move;
      const playSubmove = (smove) => {
        smove.notation = this.vr.getNotation(smove);
        this.vr.play(smove);
        this.lastMove = smove;
        if (!this.inMultimove) {
          if (this.cursor < this.moves.length - 1)
            this.moves = this.moves.slice(0, this.cursor + 1);
          this.moves.push(smove);
          this.inMultimove = true; //potentially
          this.cursor++;
        } else {
          // Already in the middle of a multi-move
          const L = this.moves.length;
          if (!Array.isArray(this.moves[L-1]))
            this.$set(this.moves, L-1, [this.moves[L-1], smove]);
          else
            this.$set(this.moves, L-1, this.moves.concat([smove]));
        }
      };
      const playMove = () => {
        const animate = (V.ShowMoves == "all" && !!received);
        if (!Array.isArray(move)) move = [move];
        let moveIdx = 0;
        let self = this;
        const initurn = this.vr.turn;
        (function executeMove() {
          const smove = move[moveIdx++];
          if (animate) {
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
          if (["1-0","0-1"].includes(score))
            this.lastMove.notation += "#";
          else if (this.vr.getCheckSquares(this.vr.turn).length > 0)
            this.lastMove.notation += "+";
        }
        if (score != "*" && this.game.mode == "analyze") {
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
            // NOTE: only FEN of last sub-move is required (thus setting it here)
            smove.fen = this.vr.getFen();
          // Is opponent in check?
          this.incheck = this.vr.getCheckSquares(this.vr.turn);
          this.emitFenIfAnalyze();
          this.inMultimove = false;
          this.score = computeScore();
          if (this.game.mode != "analyze") {
            if (!noemit) {
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
        // Just play the move:
        if (!Array.isArray(move)) move = [move];
        for (let i=0; i < move.length; i++) this.vr.play(move[i]);
        if (!light) {
          this.lastMove = move[move.length-1];
          this.incheck = this.vr.getCheckSquares(this.vr.turn);
          this.score = computeScore();
          this.emitFenIfAnalyze();
        }
        this.cursor++;
        return;
      }
      // Forbid playing outside analyze mode, except if move is received.
      // Sufficient condition because Board already knows which turn it is.
      if (
        this.game.mode != "analyze" &&
        !received &&
        (this.game.score != "*" || this.cursor < this.moves.length - 1)
      ) {
        return;
      }
      // To play a received move, cursor must be at the end of the game:
      if (received && this.cursor < this.moves.length - 1)
        this.gotoEnd();
      playMove();
    },
    cancelCurrentMultimove: function() {
      const L = this.moves.length;
      let move = this.moves[L-1];
      if (!Array.isArray(move)) move = [move];
      for (let i=move.length -1; i >= 0; i--) this.vr.undo(move[i]);
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
      if (this.inMultimove) {
        this.cancelCurrentMultimove();
        this.incheck = this.vr.getCheckSquares(this.vr.turn);
      } else {
        if (!move) {
          const minCursor =
            this.moves.length > 0 && this.moves[0].notation == "..."
              ? 1
              : 0;
          if (this.cursor < minCursor) return; //no more moves
          move = this.moves[this.cursor];
        }
        undoMove(move, this.vr);
        if (light) this.cursor--;
        else {
          this.positionCursorTo(this.cursor - 1);
          this.incheck = this.vr.getCheckSquares(this.vr.turn);
          this.emitFenIfAnalyze();
        }
      }
    },
    gotoMove: function(index) {
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
      this.incheck = this.vr.getCheckSquares(this.vr.turn);
      this.emitFenIfAnalyze();
    },
    gotoBegin: function() {
      if (this.inMultimove) this.cancelCurrentMultimove();
      const minCursor =
        this.moves.length > 0 && this.moves[0].notation == "..."
          ? 1
          : 0;
      while (this.cursor >= minCursor) this.undo(null, null, "light");
      this.lastMove = (minCursor == 1 ? this.moves[0] : null);
      this.incheck = this.vr.getCheckSquares(this.vr.turn);
      this.emitFenIfAnalyze();
    },
    gotoEnd: function() {
      if (this.cursor == this.moves.length - 1) return;
      this.gotoMove(this.moves.length - 1);
      this.emitFenIfAnalyze();
    },
    flip: function() {
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

img.inline
  height: 24px
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
