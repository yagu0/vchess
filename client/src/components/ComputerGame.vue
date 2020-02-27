<template lang="pug">
BaseGame(
  ref="basegame"
  :game="game"
  @newmove="processMove"
  @gameover="gameOver"
)
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import { store } from "@/store";
import { CompgameStorage } from "@/utils/compgameStorage";
import { playMove, getFilteredMove } from "@/utils/playUndo";
import Worker from "worker-loader!@/playCompMove";
export default {
  name: "my-computer-game",
  components: {
    BaseGame
  },
  // gameInfo: fen + mode + vname
  // mode: "auto" (game comp vs comp) or "versus" (normal)
  props: ["gameInfo"],
  data: function() {
    return {
      st: store.state,
      game: {},
      vr: null,
      // Web worker to play computer moves without freezing interface:
      timeStart: undefined, //time when computer starts thinking
      compThink: false, //avoid asking a new move while one is being searched
      compWorker: null
    };
  },
  created: function() {
    // Computer moves web worker logic:
    this.compWorker = new Worker();
    this.compWorker.onmessage = e => {
      let compMove = e.data;
      // Small delay for the bot to appear "more human"
      const delay = Math.max(500 - (Date.now() - this.timeStart), 0);
      let self = this;
      setTimeout(() => {
        if (this.currentUrl != document.location.href) return; //page change
        // NOTE: BaseGame::play() will trigger processMove() here
        self.$refs["basegame"].play(compMove, "received");
        self.compThink = false;
        if (self.game.score != "*")
          // User action
          self.$emit("game-stopped");
      }, delay);
    };
  },
  methods: {
    launchGame: function(game) {
      this.compWorker.postMessage(["scripts", this.gameInfo.vname]);
      if (!game) {
        game = {
          vname: this.gameInfo.vname,
          fenStart: V.GenRandInitFen(),
          moves: []
        };
        game.fen = game.fenStart;
        if (this.gameInfo.mode == "versus")
          CompgameStorage.add(game);
      }
      if (this.gameInfo.mode == "versus" && !game.mycolor)
        game.mycolor = Math.random() < 0.5 ? "w" : "b";
      this.compWorker.postMessage(["init", game.fen]);
      this.vr = new V(game.fen);
      game.players = [{ name: "Myself" }, { name: "Computer" }];
      if (game.myColor == "b") game.players = game.players.reverse();
      game.score = "*"; //finished games are removed
      this.currentUrl = document.location.href; //to avoid playing outside page
      this.game = game;
      this.compWorker.postMessage(["init", game.fen]);
      if (this.gameInfo.mode == "auto" || game.mycolor != this.vr.turn)
        this.playComputerMove();
    },
    // NOTE: a "goto" action could lead to an error when comp is thinking,
    // but it's OK because from the user viewpoint the game just stops.
    playComputerMove: function() {
      this.timeStart = Date.now();
      this.compThink = true;
      this.compWorker.postMessage(["askmove"]);
    },
    processMove: function(move) {
      playMove(move, this.vr);
      // This move could have ended the game: if this is the case,
      // the game is already removed from storage (if mode == 'versus')
      if (this.game.score != "*") return;
      // Send the move to web worker (including his own moves)
      this.compWorker.postMessage(["newmove", move]);
      if (this.gameInfo.mode == "auto" || this.vr.turn != this.game.mycolor)
        this.playComputerMove();
      // Finally, update storage:
      if (this.gameInfo.mode == "versus") {
        CompgameStorage.update(this.gameInfo.vname, {
          move: getFilteredMove(move),
          fen: this.vr.getFen()
        });
      }
    },
    gameOver: function(score, scoreMsg) {
      this.game.score = score;
      this.game.scoreMsg = scoreMsg;
      if (!this.compThink) this.$emit("game-stopped"); //otherwise wait for comp
    }
  }
};
</script>
