<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      a#mainLink(href="/#/variants/list")
        | {{ st.tr["View alphabetical variants list"] }}
      p.text-center
        a.leftLink(href="https://www.chessvariants.com/what.html")
          | {{ st.tr["What is a chess variant?"] }}
        a(href="https://www.chessvariants.com/why.html")
          | {{ st.tr["Why play chess variants?"] }}
      p
        a(href="/#/variants/Chess") Chess
        | {{ st.tr["chess_v"] }}
      div(v-for="g of sortedGroups")
        h3 {{ st.tr["vt" + g] }}
        p {{ st.tr["vg" + g] }}
        ul
          li(v-for="v of variantGroup.get(g)")
            a(:href="getLink(v)") {{ v.display }}
            | &nbsp&ndash;&nbsp;
            | {{ v.description }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
export default {
  name: "my-variants",
  data: function() {
    return {
      st: store.state,
      variantGroup: []
    };
  },
  created: function() {
    ajax(
      "/variants",
      "GET",
      {
        success: (res) => {
          this.variantGroup = new Map();
          res.variantArray.forEach((v) => {
            if (v.groupe >= 0) {
              let collection = this.variantGroup.get(v.groupe);
              if (!collection) this.variantGroup.set(v.groupe, [v]);
              else collection.push(v);
            }
          });
        }
      }
    );
  },
  computed: {
    sortedGroups: function() {
      return (
        Array.from(this.variantGroup.keys()).sort((a, b) => (a < b ? -1 : 1))
      );
    }
  },
  methods: {
    // oninput listener, required for smartphones:
    setCurPrefix: function(e) {
      this.curPrefix = e.target.value;
    },
    getLink: function(variant) {
      return "/#/variants/" + variant.name;
    },
    getVclasses: function(varray, idx) {
      const idxMod2 = idx % 2;
      return {
        'col-md-offset-1': idxMod2 == 0,
        'col-lg-offset-2': idxMod2 == 0,
        'last-noneighb': idxMod2 == 0 && idx == varray.length - 1
      };
    },
  }
};
</script>

<style lang="sass" scoped>
a.leftLink
  margin-right: 15px

a#mainLink
  display: block
  margin: 10px auto
  text-align: center
  font-size: 1.3em
</style>
