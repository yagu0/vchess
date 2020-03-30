<template lang="pug">
div
  input#upload(type="file" @change="upload")
  button#uploadBtn(
    @click="uploadTrigger()"
    aria-label="store.state.tr['Upload a game']"
  )
    img.inline(src="/images/icons/upload.svg")
</template>

<script>
import { getRandString } from "@/utils/alea";
export default {
  name: "my-upload-game",
  methods: {
    uploadTrigger: function() {
		  document.getElementById("upload").click();
		},
		upload: function(e) {
			const file = (e.target.files || e.dataTransfer.files)[0];
			var reader = new FileReader();
			reader.onloadend = ev => {
				this.parseAndEmit(ev.currentTarget.result);
			};
			reader.readAsText(file);
		},
    parseAndEmit: async function(pgn) {
      let game = {
        // Players potential ID and socket IDs are not searched
        players: [
          { id: 0, sid: "" },
          { id: 0, sid: "" }
        ]
      };
      const lines  = pgn.split('\n');
      let idx = 0;
      // Read header
      while (lines[idx].length > 0) {
        // NOTE: not using "split(' ')" because the FEN has spaces
        const spaceIdx = lines[idx].indexOf(' ');
        const prop = lines[idx].substr(0, spaceIdx).match(/^\[(.*)$/)[1];
        const value = lines[idx].substr(spaceIdx + 1).match(/^"(.*)"\]$/)[1];
        switch (prop) {
          case "Variant":
            game.vname = value;
            break;
          case "Date":
            game.created = new Date(value).getTime();
            break;
          case "White":
            game.players[0].name = value;
            break;
          case "Black":
            game.players[1].name = value;
            break;
          case "Fen":
            game.fenStart = value;
            break;
          case "Result":
            // Allow importing unfinished games, but mark them as
            // "unknown result" to avoid running the clocks...
            game.result = (value != "*" ? value : "?");
            break;
          case "Url":
            // Prefix "I_" to say "this is an import"
            game.id = "i" + value.match(/\/game\/([a-zA-Z0-9]+)$/)[1];
            break;
          case "Cadence":
            game.cadence = value;
            break;
        }
        idx++;
      }
      if (!game.id) {
        game.id = "i" + getRandString();
        // Provide a random cadence, just to be sure nothing breaks:
        game.cadence = "1d";
      }
      game.chats = []; //not stored in PGN :)
      // Skip "human moves" section:
      while (lines[++idx].length > 0) {}
      // Read moves
      game.moves = [];
      await import("@/variants/" + game.vname + ".js")
      .then((vModule) => {
        window.V = vModule[game.vname + "Rules"];
        while (++idx < lines.length && lines[idx].length > 0) {
          const lineParts = lines[idx].split(" ");
          const startEnd = lineParts[1].split('.');
          let move = {};
          if (startEnd[0] != "-") move.start = V.SquareToCoords(startEnd[0]);
          if (startEnd[1] != "-") move.end = V.SquareToCoords(startEnd[1]);
          const appearVanish = lineParts[2].split('/').map(lpart => {
            if (lpart == "-") return [];
            return lpart.split('.').map(psq => {
              const xy = V.SquareToCoords(psq.substr(2));
              return {
                x: xy.x,
                y: xy.y,
                c: psq[0],
                p: psq[1]
              };
            });
          });
          move.appear = appearVanish[0];
          move.vanish = appearVanish[1];
          game.moves.push(move);
        }
        this.$emit("game-uploaded", game);
      });
    }
  }
};
</script>

<style lang="sass" scoped>
input#upload
  display: none

button#uploadBtn
  display: block
  margin: 0 auto

img.inline
  height: 22px
  @media screen and (max-width: 767px)
    height: 18px
</style>
