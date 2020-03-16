<template lang="pug">
main
  input#modalNews.modal(type="checkbox")
  div#newnewsDiv(
    role="dialog"
    data-checkbox="modalNews"
  )
    .card#writeNews
      label.modal-close(for="modalNews")
      textarea#newsContent(
        v-model="curnews.content"
        :placeholder="st.tr['News go here']"
        @input="adjustHeight"
      )
      button(@click="sendNews()") {{ st.tr["Send"] }}
      #dialog.text-center {{ st.tr[infoMsg] }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      button#writeNewsBtn(
        v-if="devs.includes(st.user.id)"
        @click="showModalNews"
      )
        | {{ st.tr["Write news"] }}
      .news(
        v-for="n,idx in newsList"
        :class="{margintop:idx>0}"
      )
        span.ndt {{ formatDatetime(n.added) }}
        div(v-if="devs.includes(st.user.id)")
          button(@click="editNews(n)") {{ st.tr["Edit"] }}
          button(@click="deleteNews(n)") {{ st.tr["Delete"] }}
        p(v-html="parseHtml(n.content)")
      button#loadMoreBtn(
        v-if="hasMore"
        @click="loadMore()"
      )
        | {{ st.tr["Load more"] }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
import { getDate, getTime } from "@/utils/datetime";
import { processModalClick } from "@/utils/modalClick";
export default {
  name: "my-news",
  data: function() {
    return {
      devs: [1], //for now the only dev is me
      st: store.state,
      // timestamp of oldest showed news:
      cursor: Number.MAX_SAFE_INTEGER,
      // hasMore == TRUE: a priori there could be more news to load
      hasMore: true,
      curnews: { id: 0, content: "" },
      newsList: [],
      infoMsg: ""
    };
  },
  created: function() {
    ajax(
      "/news",
      "GET",
      {
        data: { cursor: this.cursor },
        success: (res) => {
          // The returned list is sorted from most recent to oldest
          this.newsList = res.newsList;
          const L = res.newsList.length;
          if (L > 0) this.cursor = res.newsList[L - 1].added;
        }
      }
    );
  },
  mounted: function() {
    // Mark that I've read the news:
    localStorage.setItem("newsRead", Date.now());
    if (this.st.user.id > 0) ajax("/newsread", "PUT");
    document.getElementById("newsMenu").classList.remove("somenews");
    document
      .getElementById("newnewsDiv")
      .addEventListener("click", processModalClick);
  },
  methods: {
    formatDatetime: function(dt) {
      const dtObj = new Date(dt);
      const timePart = getTime(dtObj);
      // Show minutes but not seconds:
      return (
        getDate(dtObj) + " " + timePart.substr(0, timePart.lastIndexOf(":"))
      );
    },
    parseHtml: function(txt) {
      return !txt.match(/<[/a-zA-Z]+>/)
        ? txt.replace(/\n/g, "<br/>") //no HTML tag
        : txt;
    },
    adjustHeight: function() {
      const newsContent = document.getElementById("newsContent");
      // https://stackoverflow.com/questions/995168/textarea-to-resize-based-on-content-length
      newsContent.style.height = "1px";
      newsContent.style.height = 10 + newsContent.scrollHeight + "px";
    },
    resetCurnews: function() {
      this.curnews.id = 0;
      this.curnews.content = "";
      // No need for added and uid fields: never updated
    },
    showModalNews: function() {
      this.resetCurnews();
      window.doClick("modalNews");
    },
    sendNews: function() {
      const edit = this.curnews.id > 0;
      this.infoMsg = "Processing... Please wait";
      ajax(
        "/news",
        edit ? "PUT" : "POST",
        {
          data: { news: this.curnews },
          success: (res) => {
            if (edit) {
              let n = this.newsList.find(n => n.id == this.curnews.id);
              if (n) n.content = this.curnews.content;
            } else {
              const newNews = {
                content: this.curnews.content,
                added: Date.now(),
                uid: this.st.user.id,
                id: res.id
              };
              this.newsList = [newNews].concat(this.newsList);
            }
            document.getElementById("modalNews").checked = false;
            this.infoMsg = "";
            this.resetCurnews();
          }
        }
      );
    },
    editNews: function(n) {
      this.curnews.content = n.content;
      this.curnews.id = n.id;
      // No need for added and uid fields: never updated
      window.doClick("modalNews");
    },
    deleteNews: function(n) {
      if (confirm(this.st.tr["Are you sure?"])) {
        this.infoMsg = "Processing... Please wait";
        ajax(
          "/news",
          "DELETE",
          {
            data: { id: n.id },
            success: () => {
              const nIdx = this.newsList.findIndex(nw => nw.id == n.id);
              this.newsList.splice(nIdx, 1);
              this.infoMsg = "";
              document.getElementById("modalNews").checked = false;
            }
          }
        );
      }
    },
    loadMore: function() {
      ajax(
        "/news",
        "GET",
        {
          data: { cursor: this.cursor },
          success: (res) => {
            if (res.newsList.length > 0) {
              this.newsList = this.newsList.concat(res.newsList);
              const L = res.newsList.length;
              if (L > 0) this.cursor = res.newsList[L - 1].added;
            } else this.hasMore = false;
          }
        }
      );
    }
  }
};
</script>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 767px
  max-height: 100%

textarea#newsContent
  margin: 0
  width: 100%
  min-height: 200px
  max-height: 100%

#dialog
  padding: 5px
  color: blue

#writeNews
  padding-top: 50px

button#writeNewsBtn, button#loadMoreBtn
  margin-top: 0
  margin-bottom: 0

span.ndt
  color: darkblue
  padding: 0 5px 0 var(--universal-margin)

.news
  padding-top: 10px
  & > div
    display: inline-block

.margintop
  margin-top: 25px
  border-top: 1px solid grey
@media screen and (max-width: 767px)
  .margintop
    margin-top: 10px
</style>
