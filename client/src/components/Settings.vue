<template lang="pug">
div
  input#modalSettings.modal(type="checkbox")
  div(
    role="dialog"
    data-checkbox="modalSettings"
  )
    .card
      label.modal-close(for="modalSettings")
      -
        var langName = {
          "en": "English",
          "es": "Español",
          "fr": "Français",
        };
      fieldset(@change="setLanguage($event)")
        label(for="langSelect")
          | {{ st.tr["Language"] }}
        select#langSelect
          each language,langCode in langName
            option(value=langCode)
              =language
        #flagContainer
          img(
            v-if="!!st.lang"
            :src="flagImage"
          )
      div(@change="updateSettings($event)")
        fieldset
          label(for="setHints") {{ st.tr["Show possible moves?"] }}
          input#setHints(
            type="checkbox"
            v-model="st.settings.hints"
          )
        fieldset
          label(for="setHighlight")
            | {{ st.tr["Highlight last move and checks?"] }}
          input#setHighlight(
            type="checkbox"
            v-model="st.settings.highlight"
          )
        fieldset
          label(for="setBcolor") {{ st.tr["Board colors"] }}
          select#setBcolor(v-model="st.settings.bcolor")
            option(value="lichess") {{ st.tr["brown"] }}
            option(value="chesscom") {{ st.tr["green"] }}
            option(value="chesstempo") {{ st.tr["blue"] }}
        fieldset
          label(for="setSound")
            | {{ st.tr["Sound alert when game starts?"] }}
          input#setSound(
            type="checkbox"
            v-model="st.settings.sound"
          )
        fieldset
          label(for="setRandomness") {{ st.tr["Randomness against computer"] }}
          select#setRandomness(v-model="st.settings.randomness")
            option(value="0") {{ st.tr["Deterministic"] }}
            option(value="1") {{ st.tr["Symmetric random"] }}
            option(value="2") {{ st.tr["Asymmetric random"] }}
</template>

<script>
import { store } from "@/store.js";
export default {
  name: "my-settings",
  data: function() {
    return {
      st: store.state
    };
  },
  mounted: function() {
    // NOTE: better style would be in pug directly, but how?
    document.querySelectorAll("#langSelect > option").forEach(opt => {
      if (opt.value == this.st.lang) opt.selected = true;
    });
  },
  computed: {
    flagImage: function() {
      return `/images/flags/${this.st.lang}.svg`;
    }
  },
  methods: {
    setLanguage: function(e) {
      localStorage["lang"] = e.target.value;
      store.setLanguage(e.target.value);
    },
    updateSettings: function(event) {
      const propName = event.target.id
        .substr(3)
        .replace(/^\w/, c => c.toLowerCase());
      const value = ["bcolor","randomness"].includes(propName)
        ? event.target.value
        : event.target.checked;
      store.updateSetting(propName, value);
    }
  }
};
</script>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 767px
  max-height: 100%
#flagContainer
  display: inline-block
  height: 100%
  & > img
    vertical-align: middle
    padding: 0 0 0 10px
    width: 36px
    height: 27px
</style>
