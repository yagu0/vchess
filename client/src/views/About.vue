<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      div(v-html="content")
</template>

<script>
import { store } from "@/store";
import afterRawLoad from "@/utils/afterRawLoad";
export default {
  name: "my-about",
  computed: {
    content: function() {
      return (
        afterRawLoad(
          require(
            "raw-loader!@/translations/about/" + store.state.lang + ".pug"
          ).default
        )
      );
    }
  }
};
</script>

<!-- Not scoped, because code is injected -->
<style lang="sass">
#links
  margin: var(--universal-margin)
  & > a
    display: block
</style>
