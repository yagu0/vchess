<template lang="pug">
div
  table.game-list
    thead
      tr
        th {{ st.tr["Variant"] }}
        th {{ st.tr[showBoth ? "Players" : "Versus"] }}
        th(v-if="showCadence") {{ st.tr["Cadence"] }}
        th {{ st.tr["Result"] }}
    tbody
      tr(
        v-for="g in sortedGames"
        @click="$emit('show-game',g)"
        :class="{'my-turn': g.myTurn}"
      )
        td {{ g.vname }}
        td {{ player_s(g) }}
        td(v-if="showCadence") {{ g.cadence }}
        td(
          :class="scoreClass(g)"
          @click="deleteGame(g,$event)"
        )
          | {{ g.score }}
</template>

<script>
import { store } from "@/store";
import { GameStorage } from "@/utils/gameStorage";
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
  computed: {
    sortedGames: function() {
      // Show in order: games where it's my turn, my running games, my games, other games
      let minCreated = Number.MAX_SAFE_INTEGER;
      let maxCreated = 0;
      const isMyTurn = (g, myColor) => {
        const rem = g.movesCount % 2;
        return (
          (rem == 0 && myColor == "w") ||
          (rem == 1 && myColor == "b")
        );
      };
      let augmentedGames = this.games
        .filter(g => !this.deleted[g.id])
        .map(g => {
          let priority = 0;
          let myColor = undefined;
          if (
            g.players.some(
              p => p.uid == this.st.user.id || p.sid == this.st.user.sid
            )
          ) {
            priority++;
            myColor =
              g.players[0].uid == this.st.user.id ||
              g.players[0].sid == this.st.user.sid
                ? "w"
                : "b";
            if (g.score == "*") {
              priority++;
              if (isMyTurn(g, myColor)) priority++;
            }
          }
          if (g.created < minCreated) minCreated = g.created;
          if (g.created > maxCreated) maxCreated = g.created;
          return Object.assign({}, g, {
            priority: priority,
            myTurn: priority == 3,
            myColor: myColor
          });
        });
      const deltaCreated = maxCreated - minCreated;
      return augmentedGames.sort((g1, g2) => {
        return (
          g2.priority - g1.priority + (g2.created - g1.created) / deltaCreated
        );
      });
    }
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
        this.st.user.id == g.players[0].uid
      )
        return g.players[1].name || "@nonymous";
      return g.players[0].name || "@nonymous";
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
        game.score != "*" &&
        game.players.some(p =>
          p.sid == this.st.user.sid ||
          p.uid == this.st.user.id
        )
      ) {
        if (confirm(this.st.tr["Remove game?"])) {
          GameStorage.remove(
            game.id,
            () => {
              this.$set(this.deleted, game.id, true);
            }
          );
        }
        e.stopPropagation();
      }
    }
  }
};
</script>

<style lang="sass" scoped>
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
