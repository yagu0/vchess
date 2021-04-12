<template lang="pug">
main
  input#modalOptions.modal(type="checkbox")
  div#optionsDiv(
    role="dialog"
    data-checkbox="modalOptions"
  )
    .card
      label.modal-close(for="modalOptions")
      h3 {{ st.tr["Options"] }}
      fieldset(v-if="!!V && V.Options")
        div(v-for="select of V.Options.select || []")
          label(:for="select.variable + '_opt'") {{ st.tr[select.label] }}
          select(:id="select.variable + '_opt'")
            option(
              v-for="o of select.options"
              :value="o.value"
              :selected="o.value == select.defaut"
            )
              | {{ st.tr[o.label] }}
        div(v-for="check of V.Options.check || []")
          label(:for="check.variable + '_opt'") {{ st.tr[check.label] }}
          input(
            :id="check.variable + '_opt'"
            type="checkbox"
            :checked="check.defaut")
      button(@click="setOptions()") {{ st.tr["Validate"] }}
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
      h4#variantName(v-show="display=='rules'") {{ getVariantDisplay }}
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
import { processModalClick } from "@/utils/modalClick";
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
        mode: "versus"
      },
      V: null
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
  mounted: function() {
    document.getElementById("optionsDiv")
      .addEventListener("click", processModalClick);
  },
  computed: {
    showAnalyzeBtn: function() {
      return !!this.V && this.V.CanAnalyze;
    },
    getVariantDisplay: function() {
      if (!this.gameInfo.vname) return ""; //variant not set yet
      return this.st.variants.find(v => v.name == this.gameInfo.vname).display;
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
    setOptions: function() {
      let options = {};
      // Get/set options variables / TODO: v-model?!
      for (const check of this.V.Options.check || []) {
        const elt = document.getElementById(check.variable + "_opt");
        if (elt.checked) options[check.variable] = true;
      }
      for (const select of this.V.Options.select || []) {
        const elt = document.getElementById(select.variable + "_opt");
        options[select.variable] = parseInt(elt.value, 10) || elt.value;
      }
      if (!V.IsValidOptions(options)) {
        alert(this.st.tr["Invalid options"]);
        return;
      }
      document.getElementById("modalOptions").checked = false;
      if (this.whatNext == "analyze") this.gotoAnalyze(options);
      else this.startGame(this.whatNext, options);
    },
    startGame: function(mode, options) {
      if (this.gameInProgress) return;
      const next = (game, options) => {
        this.gameInProgress = true;
        this.display = "computer";
        this.gameInfo.mode = mode;
        this.$refs["compgame"].launchGame(game, options);
      };
      if (!!options) {
        next(null, options);
        return;
      }
      const askOptions = () => {
        this.whatNext = mode;
        doClick("modalOptions");
      };
      if (mode == "versus") {
        CompgameStorage.get(this.gameInfo.vname, (game) => {
          // NOTE: game might be null (if none stored yet)
          if (!!game && !V.IsGoodFen(game.fen)) {
            // Some issues with stored game: delete
            CompgameStorage.remove(game.vname);
            game = null;
          }
          if (!!game || !V.Options) next(game);
          else askOptions();
        });
      }
      else {
        if (!V.Options) next();
        else askOptions();
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
    gotoAnalyze: function(options) {
      if (!options && V.Options) {
        this.whatNext = "analyze";
        doClick("modalOptions");
      }
      else {
        this.$router.push(
          "/analyse/" + this.gameInfo.vname +
          "/?fen=" + V.GenRandInitFen(options)
        );
      }
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
