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
    ref="basegame"
    :game="game"
    @fenchange="setFen"
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
      curFen: ""
    };
  },
  watch: {
    $route: function() {
      this.initFromUrl();
    }
  },
  created: function() {
    this.initFromUrl();
  },
  methods: {
    alertAndQuit: function(text, wrongVname) {
      // Soon after component creation, st.tr might be uninitialized.
      // Set a timeout to let a chance for the message to show translated.
      const newUrl =
        "/variants" + (wrongVname ? "" : "/" + this.gameRef.vname);
      setTimeout(() => {
        alert(this.st.tr[text] || text);
        this.$router.replace(newUrl);
      }, 500);
    },
    initFromUrl: function() {
      this.gameRef.vname = this.$route.params["vname"];
      const routeFen = this.$route.query["fen"];
      if (!routeFen) this.alertAndQuit("Missing FEN");
      else {
        this.gameRef.fen = routeFen.replace(/_/g, " ");
        // orientation is optional: taken from FEN if missing
        const orientation = this.$route.query["side"];
        this.initialize(orientation);
      }
    },
    initialize: async function(orientation) {
      // Obtain VariantRules object
      await import("@/variants/" + this.gameRef.vname + ".js")
      .then((vModule) => {
        window.V = vModule[this.gameRef.vname + "Rules"];
        if (!V.CanAnalyze)
          // Late check, in case the user tried to enter URL by hand
          this.alertAndQuit("Analysis disabled for this variant");
        else this.loadGame(orientation);
      })
      .catch((err) => { this.alertAndQuit("Mispelled variant name", true); });
    },
    loadGame: function(orientation) {
      this.game.vname = this.gameRef.vname;
      this.game.fenStart = this.gameRef.fen;
      this.game.fen = this.gameRef.fen;
      this.game.score = "*"; //never change
      this.curFen = this.game.fen;
      this.adjustFenSize();
      this.game.mycolor = orientation || V.ParseFen(this.gameRef.fen).turn;
      this.$refs["basegame"].re_setVariables(this.game);
    },
    // Triggered by "fenchange" emitted in BaseGame:
    setFen: function(fen) {
      this.curFen = fen;
      this.adjustFenSize();
    },
    adjustFenSize: function() {
      let fenInput = document.getElementById("fen");
      fenInput.style.width = (this.curFen.length+3) + "ch";
    },
    tryGotoFen: function() {
      if (V.IsGoodFen(this.curFen)) {
        this.gameRef.fen = this.curFen;
        this.loadGame();
      }
    }
  }
};
</script>

<style lang="sass" scoped=true>
input#fen
  // Use a Monospace font for input FEN width adjustment
  font-family: "Fira Code"
</style>
