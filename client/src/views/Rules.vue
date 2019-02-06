<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    .button-group
      button(@click="display='rules'") Read the rules
      button(v-show="!gameInProgress" @click="watchComputerGame")
        | Observe a sample game
      button(v-show="!gameInProgress" @click="playAgainstComputer")
        | Beat the computer!
      button(v-show="gameInProgress" @click="stopGame")
        | Stop game
    VariantRules(v-show="display=='rules'" :vname="variant.name")
    Game(v-show="display=='computer'" :gid-or-fen="fen"
      :mode="mode" :sub-mode="subMode" :variant="variant"
      @computer-think="gameInProgress=false" @game-over="stopGame")
</template>

<script>
import Game from "@/components/Game.vue";
import { store } from "@/store";
import VariantRules from "@/components/VariantRules";
export default {
  name: 'my-rules',
  components: {
    Game,
    VariantRules,
  },
  data: function() {
    return {
      st: store.state,
      variant: {id: 0, name: "_unknown"}, //...yet
      display: "rules",
      mode: "computer",
      subMode: "", //'auto' for game CPU vs CPU
      gameInProgress: false,
      mycolor: "w",
      fen: "",
    };
  },
  watch: {
    $route: function(newRoute) {
      this.tryChangeVariant(newRoute.params["vname"]);
    },
  },
  created: async function() {
    // NOTE: variant cannot be set before store is initialized
    this.tryChangeVariant(this.$route.params["vname"]);
  },
  methods: {
    tryChangeVariant: async function(vname) {
      if (vname == "_unknown")
        return;
      if (this.st.variants.length > 0)
      {
        const idxOfVar = this.st.variants.findIndex(e => e.name == vname);
        this.variant = this.st.variants[idxOfVar];
      }
      else
        this.variant.name = vname;
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
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
