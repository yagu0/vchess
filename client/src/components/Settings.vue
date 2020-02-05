<template lang="pug">
div
  input#modalSettings.modal(type="checkbox")
  div(role="dialog" data-checkbox="modalSettings"
      aria-labelledby="settingsTitle")
    .card.smallpad(@change="updateSettings")
      label.modal-close(for="modalSettings")
      fieldset
        label(for="setHints") {{ st.tr["Show possible moves?"] }}
        input#setHints(type="checkbox" v-model="st.settings.hints")
      fieldset
        label(for="setHighlight")
          | {{ st.tr["Highlight last move and checks?"] }}
        input#setHighlight(type="checkbox" v-model="st.settings.highlight")
      fieldset
        label(for="setBcolor") {{ st.tr["Board colors"] }}
        select#setBcolor(v-model="st.settings.bcolor")
          option(value="lichess") {{ st.tr["brown"] }}
          option(value="chesscom") {{ st.tr["green"] }}
          option(value="chesstempo") {{ st.tr["blue"] }}
      fieldset
        label(for="setSound") {{ st.tr["Play sounds?"] }}
        select#setSound(v-model="st.settings.sound")
          option(value="0") {{ st.tr["None"] }}
          option(value="1") {{ st.tr["New game"] }}
          option(value="2") {{ st.tr["All"] }}
</template>

<script>
import { store } from "@/store.js";
export default {
  name: "my-settings",
  data: function() {
    return {
      st: store.state,
    };
  },
  methods: {
    updateSettings: function(event) {
      const propName =
        event.target.id.substr(3).replace(/^\w/, c => c.toLowerCase())
      let value = (["bcolor","sound"].includes(propName)
        ? event.target.value
        : event.target.checked);
      if (propName == "sound")
        value = parseInt(value);
      store.updateSetting(propName, value);
    },
  },
};
</script>
