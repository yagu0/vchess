<template lang="pug">
div
  table
    thead
      tr
        th Variant
        th From
        th To
        th Cadence
    tbody
      tr(v-for="c in sortedChallenges" @click="$emit('click-challenge',c)")
        td(data-label="Variant") {{ c.vname }}
        td(data-label="From") {{ c.from.name }}
        td(data-label="To") {{ c.to }}
        td(data-label="Cadence") {{ c.timeControl }}
</template>

<script>
import { store } from "@/store";

export default {
  name: "my-challenge-list",
	props: ["challenges"],
  data: function() {
    return {
      st: store.state,
    };
  },
  computed: {
    sortedChallenges: function() {
      // Show in order: challenges I sent, challenges I received, other challenges
      let augmentedChalls = this.challenges.map(c => {
        let priority = 0;
        if (c.to == this.st.user.name)
          priority = 1;
        else if (c.from.id == this.st.user.id || c.from.sid == this.st.user.sid)
          priority = 2;
        return Object.assign({}, c, {priority: priority});
      });
      return augmentedChalls.sort((c1,c2) => { return c2.priority - c1.priority; });
    },
  },
};
</script>
