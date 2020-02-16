<template lang="pug">
main
  input#modalNews.modal(type="checkbox")
  div#newnewsDiv(role="dialog" data-checkbox="modalNews")
    .card
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
      button#writeNews(
        v-if="devs.includes(st.user.id)"
        @click="showModalNews"
      )
        | {{ st.tr["Write news"] }}
      .news(v-for="n,idx in sortedNewsList" :class="{margintop:idx>0}")
        span.ndt {{ formatDatetime(n.added) }}
        div(v-if="devs.includes(st.user.id)")
          button(@click="editNews(n)") {{ st.tr["Edit"] }}
          button(@click="deleteNews(n)") {{ st.tr["Delete"] }}
        p(v-html="parseHtml(n.content)")
      button(v-if="hasMore" @click="loadMore()")
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
      cursor: 0, //ID of last showed news
      hasMore: true, //a priori there could be more news to load
      curnews: {id:0, content:""},
      newsList: [],
      infoMsg: "",
    };
  },
  created: function() {
    ajax("/news", "GET", {cursor:this.cursor}, (res) => {
      this.newsList = res.newsList;
      const L = res.newsList.length;
      if (L > 0)
        this.cursor = res.newsList[L-1].id;
    });
  },
  mounted: function() {
    document.getElementById("newnewsDiv").addEventListener("click", processModalClick);
  },
  computed: {
    sortedNewsList: function() {
      return this.newsList.sort( (n1,n2) => n1.added - n2.added );
    },
  },
  methods: {
    formatDatetime: function(dt) {
      const dtObj = new Date(dt);
      const timePart = getTime(dtObj);
      // Show minutes but not seconds:
      return getDate(dtObj) + " " + timePart.substr(0,timePart.lastIndexOf(":"));
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
      newsContent.style.height = (10+newsContent.scrollHeight)+"px";
    },
    resetCurnews: function() {
      this.curnews.id = 0;
      this.curnews.content = "";
      // No need for added and uid fields: never updated
    },
    showModalNews: function() {
      this.resetCurnews();
      doClick('modalNews');
    },
    sendNews: function() {
      const edit = this.curnews.id > 0;
      this.infoMsg = "Processing... Please wait";
      ajax(
        "/news",
        edit ? "PUT" : "POST",
        {news: this.curnews},
        (res) => {
          if (edit)
          {
            let n = this.newsList.find(n => n.id == this.curnews.id);
            if (!!n)
              n.content = this.curnews.content;
          }
          else
          {
            const newNews = {
              content:this.curnews.content,
              added:Date.now(),
              uid: this.st.user.id,
              id: res.id
            };
            this.newsList = this.newsList.concat([newNews]);
          }
          document.getElementById("modalNews").checked = false;
          this.infoMsg = "";
          this.resetCurnews();
        }
      );
    },
    editNews: function(n) {
      this.curnews.content = n.content;
      this.curnews.id = n.id;
      // No need for added and uid fields: never updated
      doClick('modalNews');
    },
    deleteNews: function(n) {
      if (confirm(this.st.tr["Are you sure?"]))
      {
        this.infoMsg = "Processing... Please wait";
        ajax("/news", "DELETE", {id:n.id}, () => {
          const nIdx = this.newsList.findIndex(nw => nw.id == n.id);
          this.newsList.splice(nIdx, 1);
          this.infoMsg = "";
          document.getElementById("modalNews").checked = false;
        });
      }
    },
    loadMore: function() {
      ajax("/news", "GET", {cursor:this.cursor}, (res) => {
        if (res.newsList.length > 0)
        {
          this.newsList = this.newsList.concat(res.newsList);
          const L = res.newsList.length;
          if (L > 0)
            this.cursor = res.newsList[L-1].id;
        }
        else
          this.hasMore = false;
      });
    },
  },
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
button#writeNews
  margin-top: 0
  margin-bottom: 0
span.ndt
  color: darkblue
  padding: 0 5px 0 var(--universal-margin)
.margintop
  margin-top: 25px
  border-top: 1px solid grey
.news
  padding-top: 10px
  & > div
    display: inline-block
@media screen and (max-width: 767px)
  .margintop
    margin-top: 10px
</style>
