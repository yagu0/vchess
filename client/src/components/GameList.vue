<template lang="pug">
table
  tr
    th Variant
    th White
    th Black
    th Time control
    th(v-if="showResult") Result
  tr(v-for="g in sortedGames" @click="$emit('show-game',g)"
      :class="{'my-turn': g.myTurn}")
    td {{ g.vname }}
    td {{ g.players[0].name || "@nonymous" }}
    td {{ g.players[1].name || "@nonymous" }}
    td {{ g.timeControl }}
    td(v-if="showResult") {{ g.score }}
</template>

<script>
import { store } from "@/store";

export default {
  name: "my-game-list",
	props: ["games"],
  data: function() {
    return {
      st: store.state,
      showResult: false,
    };
  },
	computed: {
    sortedGames: function() {
      // Show in order: games where it's my turn, my running games, my games, other games
      this.showResult = this.games.some(g => g.score != "*");
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
            if (!!g.fen.match(" " + myColor + " "))
              priority++;
          }
        }
        return Object.assign({}, g, {priority: priority, myTurn: priority==2});
      });
      return augmentedGames.sort((g1,g2) => { return g2.priority - g1.priority; });
    },
  },
};
</script>

<style scoped lang="sass">
.my-turn
  // TODO: the style doesn't work... why?
  background-color: orange
</style>
