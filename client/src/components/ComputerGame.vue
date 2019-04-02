<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    BaseGame(:variant="variant.name" :analyze="analyze" :players="players")
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
  props: ["fen","mode","variant"],
  data: function() {
    return {
      st: store.state,
      // Web worker to play computer moves without freezing interface:
      timeStart: undefined, //time when computer starts thinking
      lockCompThink: false, //to avoid some ghost moves
      fenStart: "",
      compWorker: null,
      players: ["Myself","Computer"], //always playing white for now
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
    if (!!this.fen)
      this.launchGame();
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
        const animate = this.variant.name != "Dark";
        this.play(compMove[0], animate);
        if (compMove.length == 2)
          setTimeout( () => { this.play(compMove[1], animate); }, 750);
        else //250 == length of animation (TODO: should be a constant somewhere)
          setTimeout( () => this.lockCompThink = false, 250);
      }, delay);
    }
  },
  // dans variant.js (plutôt room.js) conn gère aussi les challenges
  // et les chats dans chat.js. Puis en webRTC, repenser tout ça.
  methods: {
    launchGame: async function() {
      const vModule = await import("@/variants/" + this.variant.name + ".js");
      window.V = vModule.VariantRules;
      this.compWorker.postMessage(["scripts",this.variant.name]);
      this.newGameFromFen(this.fen);
    },
    newGameFromFen: function(fen) {
      this.vr = new V(fen);
      this.moves = [];
      this.cursor = -1;
      this.fenStart = fen;
      this.score = "*";
      if (this.mode == "analyze")
      {
        this.mycolor = V.ParseFen(fen).turn;
        this.orientation = this.mycolor;
      }
      else if (this.mode == "computer") //only other alternative (HH with gameId)
      {
        this.mycolor = (Math.random() < 0.5 ? "w" : "b");
        this.orientation = this.mycolor;
        this.compWorker.postMessage(["init",fen]);
        if (this.mycolor != "w" || this.subMode == "auto")
          this.playComputerMove();
      }
    },
    playComputerMove: function() {
      this.timeStart = Date.now();
      this.compWorker.postMessage(["askmove"]);
    },
  },
};
</script>
