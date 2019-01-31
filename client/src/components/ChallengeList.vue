<template lang="pug">
table
  tr
    th(v-if="showVariant") Variant
    th From
    th To
    th Cadence
    th(v-if="showNbPlayers") Number of players
  tr(v-for="c in challenges" @click="$emit('click-challenge',c)")
    td(v-if="showVariant") {{ c.variant }}
    td {{ c.from.name }}
    td
      span(v-for="p in c.to") {{ p.name }}
      td {{ c.mainTime }} + {{ c.increment }}
      td(v-if="showNbPlayers") {{ c.nbPlayers }}
</template>

<script>
export default {
  name: "my-challenge-list",
	props: ["challenges"],
	computed: {
		showVariant: function() {
			this.challenges.length > 0 && !!this.challenges[0].variant;
		},
		showNbPlayers: function() {
			this.challenges.length > 0 && !!this.challenges[0].nbPlayers;
		},
	},
};
// TODO: challenge format from/to ou uid/players ............
</script>

<style lang="sass">
// TODO: affichage bizarre sur petits écrans <=767px
</style>
