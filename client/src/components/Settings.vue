<template lang="pug">
div
  input#modalSettings.modal(type="checkbox")
  div(role="dialog" aria-labelledby="settingsTitle")
    .card.smallpad(@change="updateSettings")
      label.modal-close(for="modalSettings")
      h3#settingsTitle.section {{ $tr["Preferences"] }}
      fieldset
        label(for="setSqSize") {{ $tr["Square size (in pixels). 0 for 'adaptative'"] }}
        input#setSqSize(type="number" v-model="$settings.sqSize")
      fieldset
        label(for="selectHints") {{ $tr["Show move hints?"] }}
        select#setHints(v-model="$settings.hints")
          option(value="0") {{ $tr["None"] }}
          option(value="1") {{ $tr["Moves from a square"] }}
          option(value="2") {{ $tr["Pieces which can move"] }}
      fieldset
        label(for="setHighlight") {{ $tr["Highlight squares? (Last move & checks)"] }}
        input#setHighlight(type="checkbox" v-model="$settings.highlight")
      fieldset
        label(for="setCoords") {{ $tr["Show board coordinates?"] }}
        input#setCoords(type="checkbox" v-model="$settings.coords")
      fieldset
        label(for="selectColor") {{ $tr["Board colors"] }}
        select#setBcolor(v-model="$settings.bcolor")
          option(value="lichess") {{ $tr["brown"] }}
          option(value="chesscom") {{ $tr["green"] }}
          option(value="chesstempo") {{ $tr["blue"] }}
      fieldset
        label(for="selectSound") {{ $tr["Play sounds?"] }}
        select#setSound(v-model="$settings.sound")
          option(value="0") {{ $tr["None"] }}
          option(value="1") {{ $tr["New game"] }}
          option(value="2") {{ $tr["All"] }}
</template>

<script>
export default {
  name: "Settings",
  //props: ["settings"],
	methods: {
    updateSettings: function(event) {
      const propName =
        event.target.id.substr(3).replace(/^\w/, c => c.toLowerCase())
      localStorage[propName] = ["highlight","coords"].includes(propName)
        ? event.target.checked
        : event.target.value;
    },
	},
};
</script>
