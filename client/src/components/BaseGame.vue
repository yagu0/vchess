<template lang="pug">
div#baseGame(tabindex=-1 @click="() => focusBg()" @keydown="handleKeys")
  input#modalEog.modal(type="checkbox")
  div(role="dialog" aria-labelledby="eogMessage")
    .card.smallpad.small-modal.text-center
      label.modal-close(for="modalEog")
      h3#eogMessage.section {{ endgameMessage }}
  .row
    .col-sm-12.col-md-9.col-lg-8
      Board(:vr="vr" :last-move="lastMove" :analyze="analyze"
        :user-color="game.mycolor" :orientation="orientation"
        :vname="game.vname" @play-move="play")
      .button-group
        button(@click="gotoBegin") <<
        button(@click="() => undo()") <
        button(@click="flip") &#8645;
        button(@click="() => play()") >
        button(@click="gotoEnd") >>
      #fenDiv(v-if="showFen && !!vr")
        p(@click="gotoFenContent") {{ vr.getFen() }}
      #pgnDiv
        a#download(href="#")
        button(@click="download") {{ st.tr["Download PGN"] }}
    .col-sm-12.col-md-3.col-lg-4
      MoveList(v-if="showMoves"
        :moves="moves" :cursor="cursor" @goto-move="gotoMove")
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
      gameHasEnded: false, //to avoid showing end message twice
    };
  },
  watch: {
    // game initial FEN changes when a new game starts
    "game.fenStart": function() {
      this.re_setVariables();
    },
    // Received a new move to play:
    "game.moveToPlay": function() {
      this.play(this.game.moveToPlay, "receive", this.game.vname=="Dark");
    },
    "game.score": function(score) {
      if (!this.gameHasEnded && score != "*")
      {
        // "false" says "don't bubble up": the parent already knows
        this.endGame(score, this.game.scoreMsg, false);
      }
    },
  },
  computed: {
    showMoves: function() {
      return true;
      //return window.innerWidth >= 768;
    },
    showFen: function() {
      return this.game.vname != "Dark" || this.score != "*";
    },
    analyze: function() {
      return this.game.mode == "analyze" || this.score != "*";
    },
  },
  created: function() {
    if (!!this.game.fenStart)
      this.re_setVariables();
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
      this.score = this.game.score || "*"; //mutable (if initially "*")
      this.gameHasEnded = (this.score != "*");
      this.moves = JSON.parse(JSON.stringify(this.game.moves || []));
      // Post-processing: decorate each move with color + current FEN:
      // (to be able to jump to any position quickly)
      let vr_tmp = new V(this.game.fenStart); //vr is already at end of game
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
    gotoFenContent: function(event) {
      this.$router.push("/analyze/" + this.game.vname +
        "/?fen=" + event.target.innerText.replace(/ /g, "_"));
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
      pgn += '[Result "' + this.score + '"]\n\n';
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
    endGame: function(score, message, bubbleUp) {
      this.gameHasEnded = true;
      this.score = score;
      if (!message)
        message = this.getScoreMessage(score);
      this.showEndgameMsg(score + " . " + message);
      if (bubbleUp)
        this.$emit("gameover", score);
    },
    animateMove: function(move) {
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
        this.play(move);
      }, 250);
    },
    play: function(move, receive, noanimate) {
      const navigate = !move;
      // Forbid playing outside analyze mode when cursor isn't at moves.length-1
      // (except if we receive opponent's move, human or computer)
      if (!navigate && !this.analyze && !receive
        && this.cursor < this.moves.length-1)
      {
        return;
      }
      if (navigate)
      {
        if (this.cursor == this.moves.length-1)
          return; //no more moves
        move = this.moves[this.cursor+1];
      }
      if (!!receive && !noanimate) //opponent move, variant != "Dark"
      {
        if (this.cursor < this.moves.length-1)
          this.gotoEnd(); //required to play the move
        return this.animateMove(move);
      }
      if (!navigate)
      {
        move.color = this.vr.turn;
        move.notation = this.vr.getNotation(move);
      }
      // Not programmatic, or animation is over
      this.vr.play(move);
      this.cursor++;
      this.lastMove = move;
      if (this.st.settings.sound == 2)
        new Audio("/sounds/move.mp3").play().catch(err => {});
      if (!navigate)
      {
        move.fen = this.vr.getFen();
        if (this.score == "*" || this.analyze)
        {
          // Stack move on movesList at current cursor
          if (this.cursor == this.moves.length)
            this.moves.push(move);
          else
            this.moves = this.moves.slice(0,this.cursor).concat([move]);
        }
      }
      if (!this.analyze)
        this.$emit("newmove", move); //post-processing (e.g. computer play)
      // Is opponent in check?
      this.incheck = this.vr.getCheckSquares(this.vr.turn);
      const score = this.vr.getCurrentScore();
      if (score != "*")
      {
        if (!this.analyze)
          this.endGame(score, undefined, true);
        else
        {
          // Just show score on screen (allow undo)
          const message = this.getScoreMessage(score);
          this.showEndgameMsg(score + " . " + message);
        }
      }
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
      this.gotoMove(this.moves.length-1);
    },
    flip: function() {
      this.orientation = V.GetNextCol(this.orientation);
    },
  },
};
</script>
