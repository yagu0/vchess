<template lang="pug">
div
  table.game-list(v-if="games.length > 0")
    thead
      tr
        th {{ st.tr["Variant"] }}
        th {{ st.tr[showBoth ? "Players" : "Versus"] }}
        th(v-if="showCadence") {{ st.tr["Cadence"] }}
        th {{ st.tr["Result"] }}
    tbody
      tr(
        v-for="g in sortedGames()"
        @click="$emit('show-game',g)"
        :class="{'my-turn': !!g.myTurn}"
      )
        td {{ g.vname + (g.options.abridged || '') }}
        td {{ player_s(g) }}
        td(v-if="showCadence") {{ g.cadence }}
        td(
          :class="scoreClass(g)"
          @click="deleteGame(g,$event)"
        )
          | {{ g.score }}
  p(v-else)
    | {{ st.tr["No games found :( Send a challenge!"] }}
</template>

<script>
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
import { ImportgameStorage } from "@/utils/importgameStorage";
import { ajax } from "@/utils/ajax";
export default {
  name: "my-game-list",
  props: ["games", "showBoth"],
  data: function() {
    return {
      st: store.state,
      deleted: {}, //mark deleted games
      showCadence: window.innerWidth >= 425 //TODO: arbitrary value
    };
  },
  mounted: function() {
    // timeout to avoid calling too many time the adjust method
    let timeoutLaunched = false;
    window.addEventListener("resize", () => {
      if (!timeoutLaunched) {
        timeoutLaunched = true;
        setTimeout(() => {
          this.showCadence = window.innerWidth >= 425;
          timeoutLaunched = false;
        }, 500);
      }
    });
  },
  methods: {
    player_s: function(g) {
      if (this.showBoth)
        return (
          (g.players[0].name || "@nonymous") +
          " - " +
          (g.players[1].name || "@nonymous")
        );
      if (
        this.st.user.sid == g.players[0].sid ||
        this.st.user.id == g.players[0].id
      ) {
        return g.players[1].name || "@nonymous";
      }
      return g.players[0].name || "@nonymous";
    },
    sortedGames: function() {
      // Show in order: it's my turn, running games, completed games
      let minCreated = Number.MAX_SAFE_INTEGER;
      let maxCreated = 0;
      let remGames = this.games.filter(g => !this.deleted[g.id]);
      remGames.forEach(g => {
        if (g.created < minCreated) minCreated = g.created;
        if (g.created > maxCreated) maxCreated = g.created;
        g.priority = 0;
        if (g.score == "*") {
          g.priority++;
          if (!!g.myColor) g.priority++;
          if (!!g.myTurn) g.priority++;
        }
        // TODO: remove patch soon
        if (!g.options) g.options = {}
      });
      const deltaCreated = maxCreated - minCreated;
      return remGames.sort((g1, g2) => {
        return (
          g2.priority - g1.priority +
          // Modulate with creation time (value in ]0,1[)
          (g2.created - g1.created) / (deltaCreated + 1)
        );
      });
    },
    scoreClass: function(g) {
      if (g.score == "*" || !g.myColor) return {};
      // Ok it's my finished game: determine if I won, drew or lost.
      let res = {};
      switch (g.score) {
        case "1-0":
          res[g.myColor == "w" ? "won" : "lost"] = true;
          break;
        case "0-1":
          res[g.myColor == "b" ? "won" : "lost"] = true;
          break;
        case "1/2":
          res["draw"] = true;
          break;
        // default case: "?" for unknown finished
        default:
          res["unknown"] = true;
      }
      return res;
    },
    deleteGame: function(game, e) {
      if (
        // My game ?
        game.players.some(p =>
          p.sid == this.st.user.sid || p.id == this.st.user.id
        )
      ) {
        const message =
          game.score != "*"
            ? "Remove game?"
            : "Abort and remove game?";
        if (confirm(this.st.tr[message])) {
          const afterDelete = () => {
            if (game.score == "*" && game.type != "import")
              this.$emit("abortgame", game);
            this.$set(this.deleted, game.id, true);
          };
          if (game.type == "live")
            // Effectively remove game:
            GameStorage.remove(game.id, afterDelete);
          else if (game.type == "import")
            ImportgameStorage.remove(game.id, afterDelete);
          else {
            const mySide =
              game.players[0].id == this.st.user.id
                ? "White"
                : "Black";
            game["deletedBy" + mySide] = true;
            // Mark the game for deletion on server
            // If both people mark it, it is deleted
            ajax(
              "/games",
              "PUT",
              {
                data: {
                  gid: game.id,
                  newObj: { removeFlag: true }
                },
                success: afterDelete
              }
            );
          }
        }
        e.stopPropagation();
      }
    }
  }
};
</script>

<style lang="sass" scoped>
p
  text-align: center
  font-weight: bold

// NOTE: the style applied to <tr> element doesn't work
tr.my-turn > td
  background-color: #fcd785

tr
  td.lost
    background-color: #f5b7b1
  td.won
    background-color: lightgreen
  td.draw
    background-color: lightblue
  td.unknown
    background-color: lightgrey
</style>
