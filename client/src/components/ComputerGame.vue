<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    BaseGame(:vname="vname" :analyze="analyze" :vr="vr"
      :game-info="gameInfo" ref="basegame" @newmove="processMove")
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
  // mode: "auto" (game comp vs comp), "versus" (normal) or "analyze"
  props: ["fen","mode","vname"],
  data: function() {
    return {
      st: store.state,
      // variables passed to BaseGame:
      gameInfo: {
        fenStart: "",
        players: ["Myself","Computer"], //playing as white
        mycolor: "w",
      },
      vr: null,
      // Web worker to play computer moves without freezing interface:
      timeStart: undefined, //time when computer starts thinking
      lockCompThink: false, //to avoid some ghost moves
      compWorker: null,
    };
  },
  computed: {
    analyze: function() {
      return this.mode == "analyze";
    },
  },
  watch: {
    fen: function() {
      // (Security) No effect if a computer move is in progress:
      if (this.lockCompThink)
        return this.$emit("computer-think");
      this.launchGame();
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
        const animate = (this.vname != "Dark");
        this.$refs.basegame.play(compMove[0], animate);
        if (compMove.length == 2)
          setTimeout( () => { this.$refs.basegame.play(compMove[1], animate); }, 750);
        else //250 == length of animation (TODO: should be a constant somewhere)
          setTimeout( () => this.lockCompThink = false, 250);
      }, delay);
    }
    if (!!this.fen)
      this.launchGame();
  },
  // dans variant.js (plutôt room.js) conn gère aussi les challenges
  // et les chats dans chat.js. Puis en webRTC, repenser tout ça.
  methods: {
    launchGame: async function() {
      const vModule = await import("@/variants/" + this.vname + ".js");
      window.V = vModule.VariantRules;
      this.compWorker.postMessage(["scripts",this.vname]);
      this.compWorker.postMessage(["init",this.fen]);
      this.newGameFromFen(this.fen);
    },
    newGameFromFen: function(fen) {
      this.vr = new V(fen);
      this.gameInfo.fenStart = fen;
      this.gameInfo.mycolor = (Math.random() < 0.5 ? "w" : "b");
      this.gameInfo.players = ["Myself","Computer"];
      if (this.gameInfo.mycolor == "b")
        this.gameInfo.players = this.gameInfo.players.reverse();
      this.compWorker.postMessage(["init",fen]);
      if (this.gameInfo.mycolor != "w" || this.mode == "auto")
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
        && (this.mode == "auto" || this.vr.turn != this.gameInfo.mycolor))
      {
        this.playComputerMove();
      }
    },
  },
};
</script>
