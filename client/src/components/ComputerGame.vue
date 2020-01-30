<template lang="pug">
BaseGame(:game="game" :vr="vr" ref="basegame"
  @newmove="processMove" @gameover="gameOver")
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import { store } from "@/store";
import Worker from "worker-loader!@/playCompMove";

export default {
  name: "my-computer-game",
  components: {
    BaseGame,
  },
  // gameInfo: fen + mode + vname
  // mode: "auto" (game comp vs comp), "versus" (normal) or "analyze"
  props: ["gameInfo"],
  data: function() {
    return {
      st: store.state,
      game: {},
      vr: null,
      // Web worker to play computer moves without freezing interface:
      timeStart: undefined, //time when computer starts thinking
      compThink: false, //avoid asking a new move while one is being searched
      compWorker: null,
    };
  },
  watch: {
    "gameInfo.fen": function() {
      this.launchGame();
    },
    "gameInfo.score": function(newScore) {
      if (newScore != "*")
      {
        this.game.score = newScore; //user action
        this.game.mode = "analyze";
        if (!this.compThink)
          this.$emit("game-stopped"); //otherwise wait for comp
      }
    },
  },
  // Modal end of game, and then sub-components
  created: function() {
    // Computer moves web worker logic:
    this.compWorker = new Worker();
    this.compWorker.onmessage = e => {
      let compMove = e.data;
      if (!compMove)
      {
        this.compThink = false;
        this.$emit("game-stopped"); //no more moves: mate or stalemate
        return; //after game ends, no more moves, nothing to do
      }
      if (!Array.isArray(compMove))
        compMove = [compMove]; //to deal with MarseilleRules
      // Small delay for the bot to appear "more human"
      const delay = Math.max(500-(Date.now()-this.timeStart), 0);
      setTimeout(() => {
        if (this.currentUrl != document.location.href)
          return; //page change
        // NOTE: Dark and 2-moves are incompatible
        const animate = (this.gameInfo.vname != "Dark");
        const animDelay = (animate ? 250 : 0);
        let moveIdx = 0;
        let self = this;
        (function executeMove() {
          self.$refs.basegame.play(compMove[moveIdx++], animate);
          if (moveIdx >= compMove.length)
          {
            self.compThink = false;
            if (self.game.score != "*") //user action
              self.$emit("game-stopped");
          }
          else
            setTimeout(executeMove, 500 + animDelay);
        })();
      }, delay);
    }
    if (!!this.gameInfo.fen)
      this.launchGame();
  },
  // dans variant.js (plutôt room.js) conn gère aussi les challenges
  // et les chats dans chat.js. Puis en webRTC, repenser tout ça.
  methods: {
    launchGame: async function() {
      const vModule = await import("@/variants/" + this.gameInfo.vname + ".js");
      window.V = vModule.VariantRules;
      this.compWorker.postMessage(["scripts",this.gameInfo.vname]);
      this.compWorker.postMessage(["init",this.gameInfo.fen]);
      this.vr = new V(this.gameInfo.fen);
      const mycolor = (Math.random() < 0.5 ? "w" : "b");
      let players = [{name:"Myself"},{name:"Computer"}];
      if (mycolor == "b")
        players = players.reverse();
      this.currentUrl = document.location.href; //to avoid playing outside page
      // NOTE: fen and fenStart are redundant in game object
      this.game = Object.assign({},
        this.gameInfo,
        {
          fenStart: this.gameInfo.fen,
          players: players,
          mycolor: mycolor,
          score: "*",
        });
      this.compWorker.postMessage(["init",this.gameInfo.fen]);
      if (mycolor != "w" || this.gameInfo.mode == "auto")
        this.playComputerMove();
    },
    playComputerMove: function() {
      this.timeStart = Date.now();
      this.compThink = true;
      this.compWorker.postMessage(["askmove"]);
    },
    processMove: function(move) {
      // Send the move to web worker (including his own moves)
      this.compWorker.postMessage(["newmove",move]);
      // subTurn condition for Marseille (and Avalanche) rules
      if ((!this.vr.subTurn || this.vr.subTurn <= 1)
        && (this.gameInfo.mode == "auto" || this.vr.turn != this.game.mycolor))
      {
        this.playComputerMove();
      }
    },
    gameOver: function(score, scoreMsg) {
      this.game.score = score;
      this.game.scoreMsg = scoreMsg;
      this.game.mode = "analyze";
      this.$emit("game-over", score); //bubble up to Rules.vue
    },
  },
};
</script>
