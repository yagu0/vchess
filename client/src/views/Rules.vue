<template lang="pug">
.row
  .col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2
    .button-group
      button(@click="display='rules'") Read the rules
      button(v-show="!gameInProgress" @click="watchComputerGame")
        | Observe a sample game
      button(v-show="!gameInProgress" @click="playAgainstComputer")
        | Beat the computer!
      button(v-show="gameInProgress" @click="stopGame")
        | Stop game
    div(v-show="display=='rules'" v-html="content" class="section-content")
    Game(v-show="display=='computer'" :gid-or-fen="fen"
      :mode="mode" :sub-mode="subMode" :variant="variant"
      @computer-think="gameInProgress=false" @game-over="stopGame")
</template>

<script>
import Game from "@/components/Game.vue";
import { store } from "@/store";
import { getDiagram } from "@/utils/printDiagram";
export default {
  name: 'my-rules',
  components: {
    Game,
  },
  data: function() {
    return {
      st: store.state,
      variant: {id: 0, name: "Unknown"}, //...yet
      content: "",
      display: "rules",
      mode: "computer",
      subMode: "", //'auto' for game CPU vs CPU
      gameInProgress: false,
      mycolor: "w",
      fen: "",
    };
  },
  mounted: async function() {
    // NOTE: variant cannot be set before store is initialized
    const vname = this.$route.params["vname"];
    //const idxOfVar = this.st.variants.indexOf(e => e.name == vname);
    //this.variant = this.st.variants[idxOfVar]; //TODO: is it the right timing?!
    this.variant.name = vname;
    const vModule = await import("@/variants/" + vname + ".js");
    window.V = vModule.VariantRules;
    // Method to replace diagrams in loaded HTML
    const replaceByDiag = (match, p1, p2) => {
      const args = this.parseFen(p2);
      return getDiagram(args);
    };
    // (AJAX) Request to get rules content (plain text, HTML)
    this.content =
      // TODO: why doesn't this work? require("raw-loader!pug-plain-loader!@/rules/"...)
      require("raw-loader!@/rules/" + vname + "/" + this.st.lang + ".pug")
      .replace(/(fen:)([^:]*):/g, replaceByDiag);
  },
  methods: {
    parseFen(fen) {
      const fenParts = fen.split(" ");
      return {
        position: fenParts[0],
        marks: fenParts[1],
        orientation: fenParts[2],
        shadow: fenParts[3],
      };
    },
    startGame: function() {
      if (this.gameInProgress)
        return;
      this.gameInProgress = true;
      this.mode = "computer";
      this.display = "computer";
      this.fen = V.GenRandInitFen();
    },
    stopGame: function() {
      this.gameInProgress = false;
      this.mode = "analyze";
    },
    playAgainstComputer: function() {
      this.subMode = "";
      this.startGame();
    },
    watchComputerGame: function() {
      this.subMode = "auto";
      this.startGame();
    },
  },
};
</script>
