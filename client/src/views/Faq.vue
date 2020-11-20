<template lang="pug">
main
  .row
    .col-sm-12.col-md-8.col-md-offset-2.col-lg-6.col-lg-offset-3
      div#faqDiv(v-html="content")
</template>

<script>
import { store } from "@/store";
import afterRawLoad from "@/utils/afterRawLoad";
export default {
  name: "my-faq",
  data: function() {
    return { st: store.state };
  },
  computed: {
    content: function() {
      return (
        afterRawLoad(
          require(
            "raw-loader!@/translations/faq/" + this.st.lang + ".pug"
          ).default
        )
      );
    }
  },
  mounted: function() {
    this.re_setListeners();
  },
  updated: function() {
    this.re_setListeners();
  },
  methods: {
    re_setListeners: function() {
      document.querySelectorAll(".answer").forEach(a => {
        a.style.display = "none";
      });
      document.querySelectorAll(".question").forEach(q => {
        q.addEventListener("click", (e) => {
          let answerDiv = e.target.nextSibling;
          const answerVisible = (answerDiv.style.display == "block");
          answerDiv.style.display = (answerVisible ? "none" : "block");
        });
      });
    }
  }
};
</script>

<style lang="sass">
#faqDiv
  margin-bottom: 10px
  @media screen and (max-width: 767px)
    margin-left: var(--universal-margin)
    margin-right: var(--universal-margin)

.question
  color: darkblue
  font-size: 1.1em
  margin-top: 15px
  cursor: pointer

.answer
  margin-bottom: 10px
  ol, ul
    margin-top: 0
    margin-bottom: 0
</style>
