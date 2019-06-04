<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    BaseGame(:game="game" :vr="vr" ref="basegame"
      @newmove="processMove" @gameover="gameOver")
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import { store } from "@/store";
import Worker from 'worker-loader!@/playCompMove';

export default {
  name: 'my-computer-game',
  components: {
    BaseGame,
  },
  // gameInfo: fen + mode + vname
  // mode: "auto" (game comp vs comp), "versus" (normal) or "analyze"
  props: ["gameInfo"],
  data: function() {
    return {
      st: store.state,
      game: { },
      vr: null,
      // Web worker to play computer moves without freezing interface:
      timeStart: undefined, //time when computer starts thinking
      lockCompThink: false, //to avoid some ghost moves
      compWorker: null,
    };
  },
  watch: {
    "gameInfo.fen": function() {
      // (Security) No effect if a computer move is in progress:
      if (this.lockCompThink)
        return this.$emit("computer-think");
      this.launchGame();
    },
    "gameInfo.userStop": function() {
      if (this.gameInfo.userStop)
      {
        // User stopped the game: unknown result
        this.game.mode = "analyze";
      }
    },
  },
  // Modal end of game, and then sub-components
  created: function() {
    // Computer moves web worker logic: (TODO: also for observers in HH games ?)
    this.compWorker = new Worker(); //'/javascripts/playCompMove.js'),
    this.compWorker.onmessage = e => {
      this.lockCompThink = true; //to avoid some ghost moves
      let compMove = e.data;
      if (!Array.isArray(compMove))
        compMove = [compMove]; //to deal with MarseilleRules
      // Small delay for the bot to appear "more human"
      const delay = Math.max(500-(Date.now()-this.timeStart), 0);
      setTimeout(() => {
        const animate = (this.gameInfo.vname != "Dark");
        this.$refs.basegame.play(compMove[0], animate);
        if (compMove.length == 2)
          setTimeout( () => { this.$refs.basegame.play(compMove[1], animate); }, 750);
        else //250 == length of animation (TODO: should be a constant somewhere)
          setTimeout( () => this.lockCompThink = false, 250);
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
      let players = ["Myself","Computer"];
      if (mycolor == "b")
        players = players.reverse();
      // NOTE: (TODO?) fen and fenStart are redundant in game object
      this.game = Object.assign({},
        this.gameInfo,
        {
          fenStart: this.gameInfo.fen,
          players: players,
          mycolor: mycolor,
        });
      this.compWorker.postMessage(["init",this.gameInfo.fen]);
      if (mycolor != "w" || this.gameInfo.mode == "auto")
        this.playComputerMove();
    },
    playComputerMove: function() {
      this.timeStart = Date.now();
      this.compWorker.postMessage(["askmove"]);
    },
    // TODO: do not process if game is over (check score ?)
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
    // When game ends normally, just switch to analyze mode
    gameOver: function() {
      this.game.mode = "analyze";
    },
  },
};
</script>
