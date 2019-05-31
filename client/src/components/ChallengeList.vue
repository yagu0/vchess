<template lang="pug">
table
  tr
    th Variant
    th From
    th To
    th Cadence
  tr(v-for="c in challenges" @click="$emit('click-challenge',c)")
    td {{ c.vname }}
    td {{ c.from.name }}
    td(v-if="!!c.to[0]")
      span(v-for="pname in c.to") {{ pname }}
    td(v-else) {{ c.to.length }} player{{ c.to.length >= 2 ? 's' : '' }}
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
