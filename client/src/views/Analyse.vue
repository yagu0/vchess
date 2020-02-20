<template lang="pug">
main
  .row
    .col-sm-12
      .text-center
        input#fen(
          v-model="curFen"
          @input="adjustFenSize(); tryGotoFen()"
        )
  BaseGame(
    :game="game"
    :vr="vr"
  )
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import { store } from "@/store";
export default {
  name: "my-analyse",
  components: {
    BaseGame
  },
  // gameRef: to find the game in (potentially remote) storage
  data: function() {
    return {
      st: store.state,
      gameRef: {
        //given in URL (rid = remote ID)
        vname: "",
        fen: ""
      },
      game: {
        players: [{ name: "Analyse" }, { name: "Analyse" }],
        mode: "analyze"
      },
      vr: null, //"variant rules" object initialized from FEN
      curFen: ""
    };
  },
  watch: {
    // NOTE: no watcher for $route change, because if fenStart doesn't change
    // then it doesn't trigger BaseGame.re_init() and the result is weird.
    "vr.movesCount": function() {
      this.curFen = this.vr.getFen();
      this.adjustFenSize();
    }
  },
  created: function() {
    this.gameRef.vname = this.$route.params["vname"];
    this.gameRef.fen = this.$route.query["fen"].replace(/_/g, " ");
    this.initialize();
  },
  methods: {
    initialize: async function() {
      // Obtain VariantRules object
      const vModule = await import("@/variants/" + this.gameRef.vname + ".js");
      window.V = vModule.VariantRules;
      this.loadGame();
    },
    loadGame: function() {
      // NOTE: no need to set score (~unused)
      this.game.vname = this.gameRef.vname;
      this.game.fen = this.gameRef.fen;
      this.curFen = this.game.fen;
      this.adjustFenSize();
      this.vr = new V(this.game.fen);
      this.game.mycolor = this.vr.turn;
      this.$set(this.game, "fenStart", this.gameRef.fen);
    },
    adjustFenSize: function() {
      let fenInput = document.getElementById("fen");
      fenInput.style.width = this.curFen.length + "ch";
    },
    tryGotoFen: function() {
      if (V.IsGoodFen(this.curFen))
      {
        this.gameRef.fen = this.curFen;
        this.loadGame();
      }
    }
  }
};
</script>
