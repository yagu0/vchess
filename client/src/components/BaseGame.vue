<template lang="pug">
div#baseGame(tabindex=-1 @click="() => focusBg()" @keydown="handleKeys")
  input#modalEog.modal(type="checkbox")
  div(role="dialog" aria-labelledby="eogMessage")
    .card.smallpad.small-modal.text-center
      label.modal-close(for="modalEog")
      h3#eogMessage.section {{ endgameMessage }}
  #gameContainer
    #boardContainer
      Board(:vr="vr" :last-move="lastMove" :analyze="game.mode=='analyze'"
        :user-color="game.mycolor" :orientation="orientation"
        :vname="game.vname" @play-move="play")
      #controls
        button(@click="gotoBegin") <<
        button(@click="() => undo()") <
        button(@click="flip") &#8645;
        button(@click="() => play()") >
        button(@click="gotoEnd") >>
      #pgnDiv
        a#download(href="#")
        button(@click="download") {{ st.tr["Download PGN"] }}
        button(v-if="game.mode!='analyze'" @click="analyzePosition")
          | {{ st.tr["Analyze"] }}
    #movesList
      MoveList(v-if="showMoves" :score="game.score" :message="game.scoreMsg"
        :firstNum="firstMoveNumber" :moves="moves" :cursor="cursor"
        @goto-move="gotoMove")
  // TODO: clearer required ?!
  .clearer
</template>

<script>
import Board from "@/components/Board.vue";
import MoveList from "@/components/MoveList.vue";
import { store } from "@/store";
import { getSquareId } from "@/utils/squareId";
import { getDate } from "@/utils/datetime";

export default {
  name: 'my-base-game',
  components: {
    Board,
    MoveList,
  },
  // "vr": VariantRules object, describing the game state + rules
  props: ["vr","game"],
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
    };
  },
  watch: {
    // game initial FEN changes when a new game starts
    "game.fenStart": function() {
      this.re_setVariables();
    },
    // Received a new move to play:
    "game.moveToPlay": function(newMove) {
      if (!!newMove) //if stop + launch new game, get undefined move
        this.play(newMove, "receive");
    },
  },
  computed: {
    showMoves: function() {
      return this.game.vname != "Dark" || this.game.mode=="analyze";
    },
  },
  created: function() {
    if (!!this.game.fenStart)
      this.re_setVariables();
  },
  mounted: function() {
    // Take full width on small screens:
    let boardSize = parseInt(localStorage.getItem("boardSize"));
    if (!boardSize)
    {
      boardSize = (window.innerWidth >= 768
        ? Math.min(600, 0.5*window.innerWidth) //heuristic...
        : window.innerWidth);
    }
    const movesWidth = (window.innerWidth >= 768 ? 280 : 0);
    document.getElementById("boardContainer").style.width = boardSize + "px";
    let gameContainer = document.getElementById("gameContainer");
    gameContainer.style.width = (boardSize + movesWidth) + "px";
  },
  methods: {
    focusBg: function() {
      // TODO: small blue border appears...
      document.getElementById("baseGame").focus();
    },
    handleKeys: function(e) {
      if ([32,37,38,39,40].includes(e.keyCode))
        e.preventDefault();
      switch (e.keyCode)
      {
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
    re_setVariables: function() {
      this.endgameMessage = "";
      this.orientation = this.game.mycolor || "w"; //default orientation for observed games
      this.moves = JSON.parse(JSON.stringify(this.game.moves || []));
      // Post-processing: decorate each move with color + current FEN:
      // (to be able to jump to any position quickly)
      let vr_tmp = new V(this.game.fenStart); //vr is already at end of game
      this.firstMoveNumber =
        Math.floor(V.ParseFen(this.game.fenStart).movesCount / 2);
      this.moves.forEach(move => {
        // NOTE: this is doing manually what play() function below achieve,
        // but in a lighter "fast-forward" way
        move.color = vr_tmp.turn;
        move.notation = vr_tmp.getNotation(move);
        vr_tmp.play(move);
        move.fen = vr_tmp.getFen();
      });
      if (this.game.fenStart.indexOf(" b ") >= 0 ||
        (this.moves.length > 0 && this.moves[0].color == "b"))
      {
        // 'end' is required for Board component to check lastMove for e.p.
        this.moves.unshift({color: "w", notation: "...", end: {x:-1,y:-1}});
      }
      const L = this.moves.length;
      this.cursor = L-1;
      this.lastMove = (L > 0 ? this.moves[L-1]  : null);
    },
    analyzePosition: function() {
      const newUrl = "/analyze/" + this.game.vname +
        "/?fen=" + this.vr.getFen().replace(/ /g, "_");
      //window.open("#" + newUrl); //to open in a new tab
      this.$router.push(newUrl); //better
    },
    download: function() {
      const content = this.getPgn();
      // Prepare and trigger download link
      let downloadAnchor = document.getElementById("download");
      downloadAnchor.setAttribute("download", "game.pgn");
      downloadAnchor.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
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
      while (i < this.moves.length)
      {
        pgn += (counter++) + ".";
        for (let color of ["w","b"])
        {
          let move = "";
          while (i < this.moves.length && this.moves[i].color == color)
            move += this.moves[i++].notation + ",";
          move = move.slice(0,-1); //remove last comma
          pgn += move + (i < this.moves.length ? " " : "");
        }
      }
      return pgn + "\n";
    },
    getScoreMessage: function(score) {
      let eogMessage = "Undefined";
      switch (score)
      {
        case "1-0":
          eogMessage = this.st.tr["White win"];
          break;
        case "0-1":
          eogMessage = this.st.tr["Black win"];
          break;
        case "1/2":
          eogMessage = this.st.tr["Draw"];
          break;
        case "?":
          eogMessage = this.st.tr["Unfinished"];
          break;
      }
      return eogMessage;
    },
    showEndgameMsg: function(message) {
      this.endgameMessage = message;
      let modalBox = document.getElementById("modalEog");
      modalBox.checked = true;
      setTimeout(() => { modalBox.checked = false; }, 2000);
    },
    animateMove: function(move, callback) {
      let startSquare = document.getElementById(getSquareId(move.start));
      let endSquare = document.getElementById(getSquareId(move.end));
      let rectStart = startSquare.getBoundingClientRect();
      let rectEnd = endSquare.getBoundingClientRect();
      let translation = {x:rectEnd.x-rectStart.x, y:rectEnd.y-rectStart.y};
      let movingPiece =
        document.querySelector("#" + getSquareId(move.start) + " > img.piece");
      // HACK for animation (with positive translate, image slides "under background")
      // Possible improvement: just alter squares on the piece's way...
      const squares = document.getElementsByClassName("board");
      for (let i=0; i<squares.length; i++)
      {
        let square = squares.item(i);
        if (square.id != getSquareId(move.start))
          square.style.zIndex = "-1";
      }
      movingPiece.style.transform = "translate(" + translation.x + "px," +
        translation.y + "px)";
      movingPiece.style.transitionDuration = "0.2s";
      movingPiece.style.zIndex = "3000";
      setTimeout( () => {
        for (let i=0; i<squares.length; i++)
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
      if (!navigate && this.game.mode!="analyze" && !receive
        && this.cursor < this.moves.length-1)
      {
        return;
      }
      const doPlayMove = () => {
        if (!!receive && this.cursor < this.moves.length-1)
          this.gotoEnd(); //required to play the move
        if (navigate)
        {
          if (this.cursor == this.moves.length-1)
            return; //no more moves
          move = this.moves[this.cursor+1];
        }
        else
        {
          move.color = this.vr.turn;
          move.notation = this.vr.getNotation(move);
        }
        this.vr.play(move);
        this.cursor++;
        this.lastMove = move;
        if (this.st.settings.sound == 2)
          new Audio("/sounds/move.mp3").play().catch(err => {});
        if (!navigate)
        {
          move.fen = this.vr.getFen();
          // Stack move on movesList at current cursor
          if (this.cursor == this.moves.length)
            this.moves.push(move);
          else
            this.moves = this.moves.slice(0,this.cursor).concat([move]);
        }
        if (!navigate && this.game.mode != "analyze")
          this.$emit("newmove", move); //post-processing (e.g. computer play)
        // Is opponent in check?
        this.incheck = this.vr.getCheckSquares(this.vr.turn);
        const score = this.vr.getCurrentScore();
        if (score != "*")
        {
          const message = this.getScoreMessage(score);
          if (this.game.mode != "analyze")
            this.$emit("gameover", score, message);
          else //just show score on screen (allow undo)
            this.showEndgameMsg(score + " . " + message);
        }
      };
      if (!!receive && this.game.vname != "Dark")
        this.animateMove(move, doPlayMove);
      else
        doPlayMove();
    },
    undo: function(move) {
      const navigate = !move;
      if (navigate)
      {
        if (this.cursor < 0)
          return; //no more moves
        move = this.moves[this.cursor];
      }
      this.vr.undo(move);
      this.cursor--;
      this.lastMove = (this.cursor >= 0 ? this.moves[this.cursor] : undefined);
      if (this.st.settings.sound == 2)
        new Audio("/sounds/undo.mp3").play().catch(err => {});
      this.incheck = this.vr.getCheckSquares(this.vr.turn);
      if (!navigate)
        this.moves.pop();
    },
    gotoMove: function(index) {
      this.vr.re_init(this.moves[index].fen);
      this.cursor = index;
      this.lastMove = this.moves[index];
    },
    gotoBegin: function() {
      if (this.cursor == -1)
        return;
      this.vr.re_init(this.game.fenStart);
      if (this.moves.length > 0 && this.moves[0].notation == "...")
      {
        this.cursor = 0;
        this.lastMove = this.moves[0];
      }
      else
      {
        this.cursor = -1;
        this.lastMove = null;
      }
    },
    gotoEnd: function() {
      if (this.cursor == this.moves.length - 1)
        return;
      this.gotoMove(this.moves.length-1);
    },
    flip: function() {
      this.orientation = V.GetNextCol(this.orientation);
    },
  },
};
</script>

<style lang="sass">
#baseGame
  width: 100%

#gameContainer
  margin-left: auto
  margin-right: auto

#modal-eog+div .card
  overflow: hidden
@media screen and (min-width: 768px)
  #controls
    width: 400px
    margin-left: auto
    margin-right: auto
#controls
  margin-top: 10px
  margin-left: auto
  margin-right: auto
  button
    display: inline-block
    width: 20%
    margin: 0
#pgnDiv
  text-align: center
  margin-left: auto
  margin-right: auto
#boardContainer
  float: left
#movesList
  width: 280px
  float: left
@media screen and (max-width: 767px)
  #movesList
    width: 100%
    float: none
    clear: both
    table
      tr
        display: flex
        margin: 0
        padding: 0
        td
          text-align: left
.clearer
  clear: both
</style>
