<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    BaseGame(:game="game" :vr="vr" ref="basegame")
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import { store } from "@/store";
import { ArrayFun } from "@/utils/array";

export default {
  name: 'my-analyze',
  components: {
    BaseGame,
  },
  // gameRef: to find the game in (potentially remote) storage
  data: function() {
    return {
      st: store.state,
      gameRef: { //given in URL (rid = remote ID)
        vname: "",
        fen: ""
      },
      game: {
        players:[{name:"Analyze"},{name:"Analyze"}],
        mode: "analyze"
      },
      vr: null, //"variant rules" object initialized from FEN
      //people: [], //players + observers //TODO later: interactive analyze...
    };
  },
  watch: {
    "$route": function(to, from) {
      this.gameRef.fen = to.query["fen"].replace(/_/g, " ");
      this.gameRef.vname = to.params["vname"];
      this.loadGame();
    },
  },
  created: function() {
    this.gameRef.fen = this.$route.query["fen"].replace(/_/g, " ");
    this.gameRef.vname = this.$route.params["vname"];
    this.loadGame();
  },
  methods: {
    loadGame: async function() {
      this.game.vname = this.gameRef.vname;
      this.game.fen = this.gameRef.fen;
      const vModule = await import("@/variants/" + this.game.vname + ".js");
      window.V = vModule.VariantRules;
      this.vr = new V(this.game.fen);
    },
  },
};
</script>

<style lang="sass">
// TODO
</style>
