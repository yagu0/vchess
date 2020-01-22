<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
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
        return; //after game ends, no more moves, nothing to do
      if (!Array.isArray(compMove))
        compMove = [compMove]; //to deal with MarseilleRules
      // Small delay for the bot to appear "more human"
// TODO: debug delay, 2000 --> 0
      const delay = 2000 + Math.max(500-(Date.now()-this.timeStart), 0);
console.log("GOT MOVE: " + this.compThink);
      setTimeout(() => {
        // NOTE: Dark and 2-moves are incompatible
        const animate = (this.gameInfo.vname != "Dark");
        this.$refs.basegame.play(compMove[0], animate);
        const waitEndOfAnimation = () => {
          // 250ms = length of animation (TODO: some constant somewhere)
          setTimeout( () => {
console.log("RESET: " + this.compThink);
            this.compThink = false;
            if (this.game.score != "*") //user action
              this.$emit("game-stopped");
          }, animate ? 250 : 0);
        };
        if (compMove.length == 2)
        {
          setTimeout( () => {
            this.$refs.basegame.play(compMove[1], animate);
            waitEndOfAnimation();
          }, 750);
        }
        else
          waitEndOfAnimation();
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
console.log("ASK MOVE (SET TRUE): " + this.compThink);
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
    gameOver: function(score) {
      this.game.score = score;
      this.game.mode = "analyze";
      this.$emit("game-over", score); //bubble up to Rules.vue
    },
  },
};
</script>
