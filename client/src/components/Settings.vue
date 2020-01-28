<template lang="pug">
div
  input#modalSettings.modal(type="checkbox")
  div(role="dialog" aria-labelledby="settingsTitle")
    .card.smallpad(@change="updateSettings")
      label.modal-close(for="modalSettings")
      h3#settingsTitle.section {{ st.tr["Preferences"] }}
      fieldset
        label(for="setSqSize") {{ st.tr["Square size (in pixels). 0 for 'adaptative'"] }}
        input#setSqSize(type="number" v-model="st.settings.sqSize")
      fieldset
        label(for="selectHints") {{ st.tr["Show move hints?"] }}
        select#setHints(v-model="st.settings.hints")
          option(value="0") {{ st.tr["None"] }}
          option(value="1") {{ st.tr["Moves from a square"] }}
          option(value="2") {{ st.tr["Pieces which can move"] }}
      fieldset
        label(for="setHighlight") {{ st.tr["Highlight squares? (Last move & checks)"] }}
        input#setHighlight(type="checkbox" v-model="st.settings.highlight")
      fieldset
        label(for="setCoords") {{ st.tr["Show board coordinates?"] }}
        input#setCoords(type="checkbox" v-model="st.settings.coords")
      fieldset
        label(for="selectColor") {{ st.tr["Board colors"] }}
        select#setBcolor(v-model="st.settings.bcolor")
          option(value="lichess") {{ st.tr["brown"] }}
          option(value="chesscom") {{ st.tr["green"] }}
          option(value="chesstempo") {{ st.tr["blue"] }}
      fieldset
        label(for="selectSound") {{ st.tr["Play sounds?"] }}
        select#setSound(v-model="st.settings.sound")
          option(value="0") {{ st.tr["None"] }}
          option(value="1") {{ st.tr["New game"] }}
          option(value="2") {{ st.tr["All"] }}
      fieldset
        .slidecontainer
          input#myRange.slider(type="range" min="10" max="100" value="55"
            @input="adjustBoard")
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
      localStorage[propName] = ["highlight","coords"].includes(propName)
        ? event.target.checked
        : event.target.value;
    },
    adjustBoard: function() {
      const board = document.querySelector(".game");
      if (!board)
        return; //no board on page
      const multiplier = document.getElementById("myRange").value;
      const boardSize = 10 * multiplier;
      localStorage.setItem("boardSize", boardSize);
      board.style.width = boardSize + "px";
    },
	},
};
</script>
