<template lang="pug">
div
  table
    thead
      tr
        th {{ st.tr["Variant"] }}
        th {{ st.tr[showBoth ? "Players" : "Versus"] }}
        th(v-if="showCadence") {{ st.tr["Cadence"] }}
        th {{ st.tr["Result"] }}
    tbody
      tr(v-for="g in sortedGames" @click="$emit('show-game',g)"
          :class="{'my-turn': g.myTurn}")
        td {{ g.vname }}
        td {{ player_s(g) }}
        td(v-if="showCadence") {{ g.cadence }}
        td(:class="{finished: g.score!='*'}" @click="deleteGame(g,$event)")
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
      showCadence: true
    };
  },
  mounted: function() {
    // timeout to avoid calling too many time the adjust method
    let timeoutLaunched = false;
    window.addEventListener("resize", () => {
      if (!timeoutLaunched) {
        timeoutLaunched = true;
        setTimeout(() => {
          this.showCadence = window.innerWidth >= 425; //TODO: arbitrary
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
      let augmentedGames = this.games.map(g => {
        let priority = 0;
        if (
          g.players.some(
            p => p.uid == this.st.user.id || p.sid == this.st.user.sid
          )
        ) {
          priority++;
          if (g.score == "*") {
            priority++;
            const myColor =
              g.players[0].uid == this.st.user.id ||
              g.players[0].sid == this.st.user.sid
                ? "w"
                : "b";
            // I play in this game, so g.fen will be defined
            if (g.fen.match(" " + myColor + " ")) priority++;
          }
        }
        if (g.created < minCreated) minCreated = g.created;
        if (g.created > maxCreated) maxCreated = g.created;
        return Object.assign({}, g, {
          priority: priority,
          myTurn: priority == 3
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
    deleteGame: function(game, e) {
      if (game.score != "*") {
        if (confirm(this.st.tr["Remove game?"])) GameStorage.remove(game.id);
        e.stopPropagation();
      }
    }
  }
};
</script>

<style lang="sass" scoped>
// TODO: understand why the style applied to <tr> element doesn't work
tr.my-turn > td
  background-color: #fcd785
tr td.finished
  background-color: #f5b7b1
</style>
