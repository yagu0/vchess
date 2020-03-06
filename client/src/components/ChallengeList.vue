<template lang="pug">
div
  table
    thead
      tr
        th {{ st.tr["Variant"] }}
        th {{ st.tr["With"] }}
        th {{ st.tr["Cadence"] }}
        th {{ st.tr["Random?"] }}
    tbody
      tr(
        v-for="c in sortedChallenges"
        :class="{toyou:c.priority==1,fromyou:c.priority==2}"
        @click="$emit('click-challenge',c)"
      )
        td {{ c.vname }}
        td {{ withWho(c) }}
        td {{ c.cadence }}
        td(:class="getRandomnessClass(c)")
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-challenge-list",
  props: ["challenges"],
  data: function() {
    return {
      st: store.state
    };
  },
  computed: {
    sortedChallenges: function() {
      // Show in order: challenges I sent, challenges I received, other challenges
      let minAdded = Number.MAX_SAFE_INTEGER;
      let maxAdded = 0;
      let augmentedChalls = this.challenges.map(c => {
        let priority = 0;
        if (!!c.to && c.to == this.st.user.name) priority = 1;
        else if (
          c.from.sid == this.st.user.sid ||
          (c.from.id > 0 && c.from.id == this.st.user.id)
        ) {
          priority = 2;
        }
        if (c.added < minAdded) minAdded = c.added;
        if (c.added > maxAdded) maxAdded = c.added;
        return Object.assign({}, c, { priority: priority });
      });
      const deltaAdded = maxAdded - minAdded;
      return augmentedChalls.sort((c1, c2) => {
        return c2.priority - c1.priority + (c2.added - c1.added) / deltaAdded;
      });
    }
  },
  methods: {
    withWho: function(c) {
      if (c.from.sid == this.st.user.sid || c.from.id == this.st.user.id)
        return c.to || this.st.tr["Any player"];
      return c.from.name || "@nonymous";
    },
    getRandomnessClass: function(c) {
      return {
        ["random-" + c.randomness]: true
      };
    }
  }
};
</script>

<style lang="sass" scoped>
// NOTE: the style applied to <tr> element doesn't work
tr.fromyou > td
  font-style: italic
tr.toyou > td
  background-color: #fcd785

tr > td:last-child
  &.random-0
    background-color: #FF5733
  &.random-1
    background-color: #2B63B4
  &.random-2
    background-color: #33B42B
</style>
