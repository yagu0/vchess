<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button(@click="clickReadRules()") {{ st.tr["Rules"] }}
        button(
          v-show="!gameInProgress"
          @click="startGame('auto')"
        )
          | {{ st.tr["Example game"] }}
        button(
          v-show="!gameInProgress"
          @click="startGame('versus')"
        )
          | {{ st.tr["Practice"] }}
        button(
          v-show="gameInProgress"
          @click="stopGame()"
        )
          | {{ st.tr["Stop game"] }}
        button(
          v-if="showAnalyzeBtn"
          @click="gotoAnalyze()"
        )
          | {{ st.tr["Analysis mode"] }}
  .row
    .col-sm-12.col-md-8.col-md-offset-2.col-lg-6.col-lg-offset-3
      h4#variantName(v-show="display=='rules'") {{ gameInfo.vname }}
      div(
        v-show="display=='rules'"
        v-html="content"
      )
  ComputerGame(
    ref="compgame"
    v-show="display=='computer'"
    :game-info="gameInfo"
    @game-stopped="gameStopped"
  )
</template>

<script>
import ComputerGame from "@/components/ComputerGame.vue";
import { store } from "@/store";
import { replaceByDiag } from "@/utils/printDiagram";
import { CompgameStorage } from "@/utils/compgameStorage";
import afterRawLoad from "@/utils/afterRawLoad";
export default {
  name: "my-rules",
  components: {
    ComputerGame
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
      },
      V: null,
    };
  },
  watch: {
    $route: function(newRoute) {
      this.re_setVariant(newRoute.params["vname"]);
    }
  },
  created: function() {
    // NOTE: variant cannot be set before store is initialized
    this.re_setVariant(this.$route.params["vname"]);
  },
  computed: {
    showAnalyzeBtn: function() {
      return !!this.V && this.V.CanAnalyze;
    },
    content: function() {
      if (!this.gameInfo.vname) return ""; //variant not set yet
      return (
        afterRawLoad(
          require(
            "raw-loader!@/translations/rules/" +
            this.gameInfo.vname + "/" + this.st.lang + ".pug"
          ).default
        ).replace(/(fen:)([^:]*):/g, replaceByDiag)
      );
    }
  },
  methods: {
    clickReadRules: function() {
      if (this.display != "rules") this.display = "rules";
      else if (this.gameInProgress) this.display = "computer";
    },
    re_setVariant: async function(vname) {
      const key = "rr_" + vname;
      if (!localStorage.getItem(key))
        // Mark rules as "read"
        localStorage.setItem(key, '1');
      await import("@/variants/" + vname + ".js")
      .then((vModule) => {
        this.V = window.V = vModule[vname + "Rules"];
        this.gameInfo.vname = vname;
      })
      .catch((err) => {
        // Soon after component creation, st.tr might be uninitialized.
        // Set a timeout to let a chance for the message to show translated.
        const text = "Mispelled variant name";
        setTimeout(() => {
          alert(this.st.tr[text] || text);
          this.$router.replace("/variants");
        }, 500);
      });
    },
    startGame: function(mode) {
      if (this.gameInProgress) return;
      this.gameInProgress = true;
      this.display = "computer";
      this.gameInfo.mode = mode;
      if (this.gameInfo.mode == "versus") {
        CompgameStorage.get(this.gameInfo.vname, (game) => {
          // NOTE: game might be null
          this.$refs["compgame"].launchGame(game);
        });
      } else {
        this.$refs["compgame"].launchGame();
      }
    },
    // The user wants to stop the game:
    stopGame: function() {
      this.$refs["compgame"].gameOver("?", "Undetermined result");
    },
    // The game is effectively stopped:
    gameStopped: function() {
      this.gameInProgress = false;
      if (this.gameInfo.mode == "versus")
        CompgameStorage.remove(this.gameInfo.vname);
    },
    gotoAnalyze: function() {
      this.$router.push(
        "/analyse/" + this.gameInfo.vname +
        "/?fen=" + V.GenRandInitFen(this.st.settings.randomness)
      );
    }
  }
};
</script>

<!-- NOTE: not scoped here, because HTML is injected -->
<style lang="sass">
@import "@/styles/_board_squares_img.sass"
@import "@/styles/_rules.sass"
</style>

<style lang="sass" scoped>
h4#variantName
  text-align: center
  font-weight: bold
</style>
