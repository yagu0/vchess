<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button(@click="clickReadRules()") {{ st.tr["Rules"] }}
        button(v-show="!gameInProgress" @click="startGame('auto')")
          | {{ st.tr["Example game"] }}
        button(v-show="!gameInProgress" @click="startGame('versus')")
          | {{ st.tr["Practice"] }}
        button(v-show="gameInProgress" @click="stopGame()")
          | {{ st.tr["Stop game"] }}
        button(v-if="display=='rules' && gameInfo.vname!='Dark'"
            @click="gotoAnalyze()")
          | {{ st.tr["Analyse"] }}
      .section-content(v-show="display=='rules'" v-html="content")
  ComputerGame(v-show="display=='computer'" :game-info="gameInfo"
    @game-over="stopGame" @game-stopped="gameStopped")
</template>

<script>
import ComputerGame from "@/components/ComputerGame.vue";
import { store } from "@/store";
import { getDiagram } from "@/utils/printDiagram";
export default {
  name: 'my-rules',
  components: {
    ComputerGame,
  },
  data: function() {
    return {
      st: store.state,
      display: "rules",
      gameInProgress: false,
      // variables passed to ComputerGame:
      gameInfo: {
        vname: "",
        mode: "versus",
        fen: "",
        score: "*",
      }
    };
  },
  watch: {
    "$route": function(newRoute) {
      this.re_setVariant(newRoute.params["vname"]);
    },
  },
  created: function() {
    // NOTE: variant cannot be set before store is initialized
    this.re_setVariant(this.$route.params["vname"]);
  },
  computed: {
    content: function() {
      if (!this.gameInfo.vname)
        return ""; //variant not set yet
      // (AJAX) Request to get rules content (plain text, HTML)
      return require("raw-loader!@/translations/rules/" +
          this.gameInfo.vname + "/" + this.st.lang + ".pug")
        // Next two lines fix a weird issue after last update (2019-11)
        .replace(/\\n/g, " ").replace(/\\"/g, '"')
        .replace('module.exports = "', '').replace(/"$/, "")
        .replace(/(fen:)([^:]*):/g, this.replaceByDiag);
    },
  },
  methods: {
    clickReadRules: function() {
      if (this.display != "rules")
        this.display = "rules";
      else if (this.gameInProgress)
        this.display = "computer";
    },
    parseFen(fen) {
      const fenParts = fen.split(" ");
      return {
        position: fenParts[0],
        marks: fenParts[1],
        orientation: fenParts[2],
        shadow: fenParts[3],
      };
    },
    // Method to replace diagrams in loaded HTML
    replaceByDiag: function(match, p1, p2) {
      const args = this.parseFen(p2);
      return getDiagram(args);
    },
    re_setVariant: async function(vname) {
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      this.gameInfo.vname = vname;
    },
    startGame: function(mode) {
      if (this.gameInProgress)
        return;
      this.gameInProgress = true;
      this.display = "computer";
      this.gameInfo.mode = mode;
      this.gameInfo.score = "*";
      this.gameInfo.fen = V.GenRandInitFen();
    },
    // user is willing to stop the game:
    stopGame: function(score) {
      this.gameInfo.score = score || "?";
    },
    // The game is effectively stopped:
    gameStopped: function() {
      this.gameInProgress = false;
    },
    gotoAnalyze: function() {
      this.$router.push("/analyse/" + this.gameInfo.vname
        + "/?fen=" + V.GenRandInitFen());
    },
  },
};
</script>

<!-- NOTE: not scoped here, because HTML is injected (TODO) -->
<style lang="sass">
//.section-content
//  *
//    margin-left: auto
//    margin-right: auto
//    max-width: 767px
//  figure.diagram-container
//    max-width: 1000px
//  @media screen and (max-width: 767px)
//    max-width: 100%
//    padding: 0 5px

.warn
  padding: 3px
  color: red
  background-color: lightgrey
  font-weight: bold

figure.diagram-container
  margin: 15px 0 15px 0
  text-align: center
  width: 100%
  display: block
  .diagram
    display: block
    width: 40%
    min-width: 240px
    margin-left: auto
    margin-right: auto
  .diag12
    float: left
    margin-left: calc(10% - 20px)
    margin-right: 40px
    @media screen and (max-width: 630px)
      float: none
      margin: 0 auto 10px auto
  .diag22
    float: left
    margin-right: calc(10% - 20px)
    @media screen and (max-width: 630px)
      float: none
      margin: 0 auto
  figcaption
    display: block
    clear: both
    padding-top: 5px
    font-size: 0.8em

p.boxed
  background-color: #FFCC66
  padding: 5px

.stageDelimiter
  color: purple

// To show (new) pieces, and/or there values...
figure.showPieces > img
  width: 50px

figure.showPieces > figcaption
  color: #6C6C6C

.section-title
  padding: 0

.section-title > h4
  padding: 5px

ol, ul:not(.browser-default)
  padding-left: 20px

ul:not(.browser-default)
  margin-top: 5px

ul:not(.browser-default) > li
  list-style-type: disc

.light-square-diag
  background-color: #e5e5ca

.dark-square-diag
  background-color: #6f8f57

// TODO: following is duplicated (Board.vue)
div.board
  float: left
  height: 0
  display: inline-block
  position: relative

div.board8
  width: 12.5%
  padding-bottom: 12.5%

div.board10
  width: 10%
  padding-bottom: 10%

div.board11
  width: 9.09%
  padding-bottom: 9.1%

img.piece
  width: 100%

img.piece, img.mark-square
  max-width: 100%
  height: auto
  display: block

img.mark-square
  opacity: 0.6
  width: 76%
  position: absolute
  top: 12%
  left: 12%
  opacity: .7

.in-shadow
  filter: brightness(50%)
</style>
