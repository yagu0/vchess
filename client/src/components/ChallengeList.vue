<template lang="pug">
table
  tr
    th Variant
    th From
    th To
    th Cadence
  tr(v-for="c in challenges" @click="$emit('click-challenge',c)")
    td {{ c.variant.name }}
    td {{ c.from.name }}
    td(v-if="c.to[0].id > 0")
      span(v-for="p in c.to") {{ p.name }}
    td(v-else) {{ c.nbPlayers - 1 }} player{{ c.nbPlayers >= 3 ? 's' : '' }}
    td {{ c.timeControl }}
</template>

<script>
export default {
  name: "my-challenge-list",
	props: ["challenges"],
};
</script>

<style lang="sass">
// TODO: affichage bizarre sur petits écrans <=767px
</style>
