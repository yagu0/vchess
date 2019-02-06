<!--<template :src="require(`@/rules/${vname}/${st.lang}.pug`)">
</template>
-->

<template lang="pug">
.section-content(v-html="content")
</template>

<script>
import Diagrammer from "@/components/Diagrammer";
import { store } from "@/store";
export default {
  name: "my-variant-rules",
  components: {
    Diagrammer,
  },
  props: ["vname"],
  data: function() {
    return {
      st: store.state,
      content: "",
    };
  },
  watch: {
    vname: function() {
      this.loadVariantFile();
    },
  },
  methods: {
    loadVariantFile: function() {
      if (this.vname != "_unknown")
      {
        // TODO (to understand): no loader required here ? Pug preset ?
        const content = require("raw-loader!@/rules/" + this.vname + "/" + this.st.lang + ".pug");
        console.log(content);
        this.content = content;
      }
    },
  },
  created: function() {
    this.loadVariantFile();
  },
};
</script>

<!--
  TODO: template + script dans rules/Alice/en.pug (-> .vue), puis dynamic import ici ?!
-->
