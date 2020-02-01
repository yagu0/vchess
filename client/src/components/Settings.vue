<template lang="pug">
div
  input#modalSettings.modal(type="checkbox")
  div(role="dialog" data-checkbox="modalSettings"
      aria-labelledby="settingsTitle")
    .card.smallpad(@change="updateSettings")
      label.modal-close(for="modalSettings")
      h3#settingsTitle.section {{ st.tr["Preferences"] }}
      fieldset
        label(for="setSqSize")
          | {{ st.tr["Square size (in pixels). 0 for 'adaptative'"] }}
        input#setSqSize(type="number" v-model="st.settings.sqSize")
      fieldset
        label(for="selectHints") {{ st.tr["Show move hints?"] }}
        select#setHints(v-model="st.settings.hints")
          option(value="0") {{ st.tr["None"] }}
          option(value="1") {{ st.tr["Moves from a square"] }}
          option(value="2") {{ st.tr["Pieces which can move"] }}
      fieldset
        label(for="setHighlight")
          | {{ st.tr["Highlight squares? (Last move & checks)"] }}
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
          input#myRange.slider(type="range" min="0" max="100" value="50"
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
  mounted: function() {
    const boardSize = localStorage.getItem("boardSize");
    if (!!boardSize)
      document.getElementById("myRange").value = Math.floor(boardSize / 10);
    // timeout to avoid calling too many time the adjust method
    let timeoutLaunched = false;
    window.addEventListener("resize", (e) => {
      if (!timeoutLaunched)
      {
        timeoutLaunched = true;
        setTimeout( () => {
          this.adjustBoard();
          timeoutLaunched = false;
        }, 500);
      }
    });
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
      const boardContainer = document.getElementById("boardContainer");
      if (!boardContainer)
        return; //no board on page
      const k = document.getElementById("myRange").value;
      const movesWidth = (window.innerWidth >= 768 ? 280 : 0);
      const minBoardWidth = 240; //TODO: these 240 and 280 are arbitrary...
      // Value of 0 is board min size; 100 is window.width [- movesWidth]
      const boardSize = minBoardWidth +
        k * (window.innerWidth - (movesWidth+minBoardWidth)) / 100;
      localStorage.setItem("boardSize", boardSize);
      boardContainer.style.width = boardSize + "px";
      document.getElementById("gameContainer").style.width =
        (boardSize + movesWidth) + "px";
    },
	},
};
</script>
