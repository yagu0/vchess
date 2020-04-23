<template lang="pug">
main
  .row
    .col-sm-12.col-md-8.col-md-offset-2.col-lg-6.col-lg-offset-3
      div#faqDiv(v-html="content")
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-faq",
  data: function() {
    return { st: store.state };
  },
  computed: {
    content: function() {
      // (AJAX) Request to get FAQ content (plain text, HTML)
      return (
        require("raw-loader!@/translations/faq/" + this.st.lang + ".pug")
        // Next two lines fix a weird issue after last update (2019-11)
        .replace(/\\n/g, " ")
        .replace(/\\"/g, '"')
        .replace('module.exports = "', "")
        .replace(/"$/, "")
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
