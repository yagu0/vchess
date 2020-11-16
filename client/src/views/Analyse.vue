<template lang="pug">
main
  input#modalRules.modal(type="checkbox")
  div#rulesDiv(
    role="dialog"
    data-checkbox="modalRules"
  )
    .card
      label.modal-close(for="modalRules")
      a#variantNameInAnalyze(:href="'/#/variants/'+game.vname")
        | {{ game.vname }}
      div(v-html="rulesContent")
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
import { processModalClick } from "@/utils/modalClick";
import { replaceByDiag } from "@/utils/printDiagram";
import { store } from "@/store";
export default {
  name: "my-analyse",
  // TODO: game import ==> require some adjustments, like
  // the ability to analyse from a list of moves...
  components: {
    BaseGame
  },
  // gameRef: to find the game in (potentially remote) storage
  data: function() {
    return {
      st: store.state,
      rulesContent: "",
      gameRef: {
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
  mounted: function() {
    document.getElementById("rulesDiv")
      .addEventListener("click", processModalClick);
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
        // orientation is optional: taken from FEN if missing.
        // NOTE: currently no internal usage of 'side', but could be used by
        // manually settings the URL (TODO?).
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
      this.rulesContent =
        require(
          "raw-loader!@/translations/rules/" +
          this.gameRef.vname + "/" +
          this.st.lang + ".pug"
          ).default
        .replace('export default "', "")
        .replace(/";$/, "")
        // Next two lines fix a weird issue after last update (2019-11)
        .replace(/\\n/g, " ")
        .replace(/\\"/g, '"')
        .replace(/(fen:)([^:]*):/g, replaceByDiag);
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

<style lang="sass">
@import "@/styles/_board_squares_img.sass"
@import "@/styles/_rules.sass"
</style>

<style lang="sass" scoped>
a#variantNameInAnalyze
  color: var(--card-fore-color)
  text-align: center
  font-weight: bold
  font-size: calc(1rem * var(--heading-ratio))
  line-height: 1.2
  margin: calc(1.5 * var(--universal-margin))

#rulesDiv > .card
  padding: 5px 0
  max-width: 50%
  max-height: 100%
  @media screen and (max-width: 1500px)
    max-width: 67%
  @media screen and (max-width: 1024px)
    max-width: 85%
  @media screen and (max-width: 767px)
    max-width: 100%

input#fen
  // Use a Monospace font for input FEN width adjustment
  font-family: "Fira Code"
</style>
