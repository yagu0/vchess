<template lang="pug">
div#baseGame(
  tabindex=-1
  @click="focusBg()"
  @keydown="handleKeys($event)"
  @wheel="handleScroll($event)"
)
  input#modalEog.modal(type="checkbox")
  div#eogDiv(
    role="dialog"
    data-checkbox="modalEog"
  )
    .card.text-center
      label.modal-close(for="modalEog")
      h3.section {{ endgameMessage }}
  input#modalAdjust.modal(type="checkbox")
  div#adjuster(
    role="dialog"
    data-checkbox="modalAdjust"
  )
    .card.text-center
      label.modal-close(for="modalAdjust")
      label(for="boardSize") {{ st.tr["Board size"] }}
      input#boardSize.slider(
        type="range"
        min="0"
        max="100"
        value="50"
        @input="adjustBoard()"
      )
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
      #controls
        button(@click="gotoBegin()") <<
        button(@click="undo()") <
        button(@click="flip()") &#8645;
        button(@click="play()") >
        button(@click="gotoEnd()") >>
      #belowControls
        #downloadDiv(v-if="allowDownloadPGN")
          a#download(href="#")
          button(@click="download()") {{ st.tr["Download"] }} PGN
        button(onClick="window.doClick('modalAdjust')") &#10530;
        button(
          v-if="canAnalyze"
          @click="analyzePosition()"
        )
          | {{ st.tr["Analyse"] }}
        // NOTE: variants pages already have a "Rules" link on top
        button(
          v-if="!$route.path.match('/variants/')"
          @click="showRules()"
        )
          | {{ st.tr["Rules"] }}
    #movesList
      MoveList(
        v-if="showMoves"
        :score="game.score"
        :message="game.scoreMsg"
        :firstNum="firstMoveNumber"
        :moves="moves"
        :cursor="cursor"
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
export default {
  name: "my-base-game",
  components: {
    Board,
    MoveList
  },
  // "vr": VariantRules object, describing the game state + rules
  props: ["vr", "game"],
  data: function() {
    return {
      st: store.state,
      // NOTE: all following variables must be reset at the beginning of a game
      endgameMessage: "",
      orientation: "w",
      score: "*", //'*' means 'unfinished'
      moves: [],
      cursor: -1, //index of the move just played
      lastMove: null,
      firstMoveNumber: 0, //for printing
      incheck: [] //for Board
    };
  },
  watch: {
    // game initial FEN changes when a new game starts
    "game.fenStart": function() {
      this.re_setVariables();
    },
  },
  computed: {
    showMoves: function() {
      return this.game.score != "*" || (window.V && V.ShowMoves == "all");
    },
    showTurn: function() {
      return this.game.score == '*' && window.V && V.ShowMoves != "all";
    },
    turn: function() {
      return this.st.tr[(this.vr.turn == 'w' ? "White" : "Black") + " to move"];
    },
    canAnalyze: function() {
      return this.game.mode != "analyze" && window.V && V.CanAnalyze;
    },
    allowDownloadPGN: function() {
      return this.game.score != "*" || (window.V && V.ShowMoves == "all");
    }
  },
  created: function() {
    if (this.game.fenStart) this.re_setVariables();
  },
  mounted: function() {
    [
      document.getElementById("eogDiv"),
      document.getElementById("adjuster")
    ].forEach(elt => elt.addEventListener("click", processModalClick));
    // Take full width on small screens:
    let boardSize = parseInt(localStorage.getItem("boardSize"));
    if (!boardSize) {
      boardSize =
        window.innerWidth >= 768
          ? 0.75 * Math.min(window.innerWidth, window.innerHeight)
          : window.innerWidth;
    }
    const movesWidth = window.innerWidth >= 768 ? 280 : 0;
    document.getElementById("boardContainer").style.width = boardSize + "px";
    let gameContainer = document.getElementById("gameContainer");
    gameContainer.style.width = boardSize + movesWidth + "px";
    document.getElementById("boardSize").value =
      (boardSize * 100) / (window.innerWidth - movesWidth);
    // timeout to avoid calling too many time the adjust method
    let timeoutLaunched = false;
    window.addEventListener("resize", () => {
      if (!timeoutLaunched) {
        timeoutLaunched = true;
        setTimeout(() => {
          this.adjustBoard();
          timeoutLaunched = false;
        }, 500);
      }
    });
  },
  methods: {
    focusBg: function() {
      document.getElementById("baseGame").focus();
    },
    adjustBoard: function() {
      const boardContainer = document.getElementById("boardContainer");
      if (!boardContainer) return; //no board on page
      const k = document.getElementById("boardSize").value;
      const movesWidth = window.innerWidth >= 768 ? 280 : 0;
      const minBoardWidth = 240; //TODO: these 240 and 280 are arbitrary...
      // Value of 0 is board min size; 100 is window.width [- movesWidth]
      const boardSize =
        minBoardWidth +
        (k * (window.innerWidth - (movesWidth + minBoardWidth))) / 100;
      localStorage.setItem("boardSize", boardSize);
      boardContainer.style.width = boardSize + "px";
      document.getElementById("gameContainer").style.width =
        boardSize + movesWidth + "px";
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
      // NOTE: since game.mode=="analyze" => no score, next condition is enough
      if (this.game.score != "*") {
        e.preventDefault();
        if (e.deltaY < 0) this.undo();
        else if (e.deltaY > 0) this.play();
      }
    },
    showRules: function() {
      //this.$router.push("/variants/" + this.game.vname);
      window.open("#/variants/" + this.game.vname, "_blank"); //better
    },
    re_setVariables: function() {
      this.endgameMessage = "";
      // "w": default orientation for observed games
      this.orientation = this.game.mycolor || "w";
      this.moves = JSON.parse(JSON.stringify(this.game.moves || []));
      // Post-processing: decorate each move with color, notation and FEN
      let vr_tmp = new V(this.game.fenStart);
      const parsedFen = V.ParseFen(this.game.fenStart);
      const firstMoveColor = parsedFen.turn;
      this.firstMoveNumber = Math.floor(parsedFen.movesCount / 2);
      this.moves.forEach(move => {
        move.color = vr_tmp.turn;
        move.notation = vr_tmp.getNotation(move);
        vr_tmp.play(move);
        move.fen = vr_tmp.getFen();
      });
      if (firstMoveColor == "b") {
        // 'end' is required for Board component to check lastMove for e.p.
        this.moves.unshift({
          color: "w",
          notation: "...",
          end: { x: -1, y: -1 }
        });
      }
      const L = this.moves.length;
      this.cursor = L - 1;
      this.lastMove = L > 0 ? this.moves[L - 1] : null;
      this.incheck = this.vr.getCheckSquares(this.vr.turn);
    },
    analyzePosition: function() {
      const newUrl =
        "/analyse/" +
        this.game.vname +
        "/?fen=" +
        this.vr.getFen().replace(/ /g, "_");
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
      let counter = 1;
      let i = 0;
      while (i < this.moves.length) {
        pgn += counter++ + ".";
        for (let color of ["w", "b"]) {
          let move = "";
          while (i < this.moves.length && this.moves[i].color == color)
            move += this.moves[i++].notation + ",";
          move = move.slice(0, -1); //remove last comma
          pgn += move + (i < this.moves.length ? " " : "");
        }
      }
      return pgn + "\n";
    },
    showEndgameMsg: function(message) {
      this.endgameMessage = message;
      let modalBox = document.getElementById("modalEog");
      modalBox.checked = true;
      setTimeout(() => {
        modalBox.checked = false;
      }, 2000);
    },
    animateMove: function(move, callback) {
      let startSquare = document.getElementById(getSquareId(move.start));
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
    play: function(move, receive) {
      // NOTE: navigate and receive are mutually exclusive
      const navigate = !move;
      // Forbid playing outside analyze mode, except if move is received.
      // Sufficient condition because Board already knows which turn it is.
      if (
        !navigate &&
        this.game.mode != "analyze" &&
        !receive &&
        (this.game.score != "*" || this.cursor < this.moves.length - 1)
      ) {
        return;
      }
      const doPlayMove = () => {
        // To play a move, cursor must be at the end of the game:
        if (!!receive && this.cursor < this.moves.length - 1) this.gotoEnd();
        if (navigate) {
          if (this.cursor == this.moves.length - 1) return; //no more moves
          move = this.moves[this.cursor + 1];
        } else {
          move.color = this.vr.turn;
          move.notation = this.vr.getNotation(move);
        }
        this.vr.play(move);
        this.cursor++;
        this.lastMove = move;
        if (this.st.settings.sound == 2)
          new Audio("/sounds/move.mp3").play().catch(() => {});
        if (!navigate) {
          move.fen = this.vr.getFen();
          // Stack move on movesList at current cursor
          if (this.cursor == this.moves.length) this.moves.push(move);
          else this.moves = this.moves.slice(0, this.cursor).concat([move]);
        }
        // Is opponent in check?
        this.incheck = this.vr.getCheckSquares(this.vr.turn);
        const score = this.vr.getCurrentScore();
        if (score != "*") {
          const message = getScoreMessage(score);
          if (this.game.mode != "analyze")
            this.$emit("gameover", score, message);
          //just show score on screen (allow undo)
          else this.showEndgameMsg(score + " . " + message);
        }
        if (!navigate && this.game.mode != "analyze")
          this.$emit("newmove", move); //post-processing (e.g. computer play)
      };
      if (!!receive && V.ShowMoves == "all")
        this.animateMove(move, doPlayMove);
      else doPlayMove();
    },
    undo: function(move) {
      const navigate = !move;
      if (navigate) {
        if (this.cursor < 0) return; //no more moves
        move = this.moves[this.cursor];
      }
      this.vr.undo(move);
      this.cursor--;
      this.lastMove = this.cursor >= 0 ? this.moves[this.cursor] : undefined;
      if (this.st.settings.sound == 2)
        new Audio("/sounds/undo.mp3").play().catch(() => {});
      this.incheck = this.vr.getCheckSquares(this.vr.turn);
      if (!navigate) this.moves.pop();
    },
    gotoMove: function(index) {
      this.vr.re_init(this.moves[index].fen);
      this.cursor = index;
      this.lastMove = this.moves[index];
    },
    gotoBegin: function() {
      if (this.cursor == -1) return;
      this.vr.re_init(this.game.fenStart);
      if (this.moves.length > 0 && this.moves[0].notation == "...") {
        this.cursor = 0;
        this.lastMove = this.moves[0];
      } else {
        this.cursor = -1;
        this.lastMove = null;
      }
    },
    gotoEnd: function() {
      if (this.cursor == this.moves.length - 1) return;
      this.gotoMove(this.moves.length - 1);
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

[type="checkbox"]#modalAdjust+div .card
  padding: 5px

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
  margin: 0 auto
  button
    display: inline-block
    width: 20%
    margin: 0

#turnIndicator
  text-align: center
  font-weight: bold

#belowControls
  border-top: 1px solid #2f4f4f
  text-align: center
  margin: 0 auto
  & > #downloadDiv
    margin: 0
    & > button
      margin: 0
  & > button
    border-left: 1px solid #2f4f4f
    margin: 0

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
