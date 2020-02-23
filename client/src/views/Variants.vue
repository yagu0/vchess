<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      input#prefixFilter(
        v-model="curPrefix"
        @input="setCurPrefix($event)"
        :placeholder="st.tr['Prefix?']"
      )
    .variant.col-sm-12.col-md-5.col-lg-4(
      v-for="(v,idx) in filteredVariants"
      :class="{'col-md-offset-1': idx%2==0, 'col-lg-offset-2': idx%2==0}"
    )
      router-link(:to="getLink(v.name)")
        h4.boxtitle.text-center {{ v.name }}
        p.description.text-center {{ st.tr[v.desc] }}
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-variants",
  data: function() {
    return {
      curPrefix: "",
      st: store.state
    };
  },
  computed: {
    filteredVariants: function() {
      const capitalizedPrefix = this.curPrefix.replace(/^\w/, c =>
        c.toUpperCase()
      );
      const variants = this.st.variants
        .filter(v => {
          return v.name.startsWith(capitalizedPrefix);
        })
        .map(v => {
          return {
            name: v.name,
            desc: v.description
          };
        })
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
      return variants;
    }
  },
  methods: {
    // oninput listener, required for smartphones:
    setCurPrefix: function(e) {
      this.curPrefix = e.target.value;
    },
    getLink: function(vname) {
      return "/variants/" + vname;
    }
  }
};
</script>

<style lang="sass" scoped>
input#prefixFilter
  display: block
  margin: 0 auto

.variant
  box-sizing: border-box
  border: 1px solid brown
  background-color: lightyellow
  &:hover
    background-color: yellow
  a
    color: #663300
    text-decoration: none
  .boxtitle
    font-weight: bold
    margin-bottom: 0
  .description
    @media screen and (max-width: 767px)
      margin-top: 0
</style>
