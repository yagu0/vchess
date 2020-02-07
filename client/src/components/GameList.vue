<template lang="pug">
div
  table
    thead
      tr
        th {{ st.tr["Variant"] }}
        th {{ st.tr["White"] }}
        th {{ st.tr["Black"] }}
        th {{ st.tr["Cadence"] }}
        th {{ st.tr["Result"] }}
    tbody
      tr(v-for="g in sortedGames" @click="$emit('show-game',g)"
          :class="{'my-turn': g.myTurn}")
        td(data-label="Variant") {{ g.vname }}
        td(data-label="White") {{ g.players[0].name || "@nonymous" }}
        td(data-label="Black") {{ g.players[1].name || "@nonymous" }}
        td(data-label="Time control") {{ g.timeControl }}
        td(data-label="Result") {{ g.score }}
</template>

<script>
import { store } from "@/store";

export default {
  name: "my-game-list",
  props: ["games"],
  data: function() {
    return {
      st: store.state,
    };
  },
  computed: {
    sortedGames: function() {
      // Show in order: games where it's my turn, my running games, my games, other games
      let augmentedGames = this.games.map(g => {
        let priority = 0;
        if (g.players.some(p => p.uid == this.st.user.id || p.sid == this.st.user.sid))
        {
          priority++;
          if (g.score == "*")
          {
            priority++;
            const myColor = g.players[0].uid == this.st.user.id
                || g.players[0].sid == this.st.user.sid
              ? "w"
              : "b";
            // I play in this game, so g.fen will be defined
            if (!!g.fen.match(" " + myColor + " "))
              priority++;
          }
        }
        return Object.assign({}, g, {priority: priority, myTurn: priority==3});
      });
      return augmentedGames.sort((g1,g2) => { return g2.priority - g1.priority; });
    },
  },
};
</script>

<style lang="sass" scoped>
// TODO: understand why the style applied to <tr> element doesn't work
tr.my-turn > td
  background-color: #fcd785
</style>
