<template lang="pug">
BaseGame(
  ref="basegame"
  :game="game"
  :vr="vr"
  @newmove="processMove"
  @gameover="gameOver"
)
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import { store } from "@/store";
import { CompgameStorage } from "@/utils/compgameStorage";
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
      if (!compMove) {
        this.compThink = false;
        this.$emit("game-stopped"); //no more moves: mate or stalemate
        return; //after game ends, no more moves, nothing to do
      }
      if (!Array.isArray(compMove)) compMove = [compMove]; //potential multi-move
      // Small delay for the bot to appear "more human"
      const delay = Math.max(500 - (Date.now() - this.timeStart), 0);
      setTimeout(() => {
        if (this.currentUrl != document.location.href) return; //page change
        // NOTE: do not animate move if special display (ShowMoves != "all")
        const animate = V.ShowMoves == "all";
        const animDelay = animate ? 250 : 0;
        let moveIdx = 0;
        let self = this;
        (function executeMove() {
          // NOTE: BaseGame::play() will trigger processMove() here
          self.$refs["basegame"].play(compMove[moveIdx++], "received");
          if (moveIdx >= compMove.length) {
            self.compThink = false;
            if (self.game.score != "*")
              // User action
              self.$emit("game-stopped");
          } else setTimeout(executeMove, 500 + animDelay);
        })();
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
      if (this.game.score != "*") return;
      // Send the move to web worker (including his own moves)
      this.compWorker.postMessage(["newmove", move]);
      // subTurn condition for Marseille (and Avalanche) rules
      if (
        (!this.vr.subTurn || this.vr.subTurn <= 1) &&
        (this.gameInfo.mode == "auto" || this.vr.turn != this.game.mycolor)
      ) {
        this.playComputerMove();
      }
      // Finally, update storage:
      if (this.gameInfo.mode == "versus") {
        const allowed_fields = ["appear", "vanish", "start", "end"];
        const filtered_move = Object.keys(move)
          .filter(key => allowed_fields.includes(key))
          .reduce((obj, key) => {
            obj[key] = move[key];
            return obj;
          }, {});
        CompgameStorage.update(this.gameInfo.vname, {
          move: filtered_move,
          fen: move.fen
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
