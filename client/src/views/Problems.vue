<template lang="pug">
main
  input#modalNewprob.modal(
    type="checkbox"
    @change="fenFocusIfOpened($event)"
  )
  div#newprobDiv(
    role="dialog"
    data-checkbox="modalNewprob"
  )
    .card
      label#closeNewprob.modal-close(for="modalNewprob")
      fieldset
        label(for="selectVariant") {{ st.tr["Variant"] }}
        select#selectVariant(
          v-model="curproblem.vid"
          @change="changeVariant(curproblem)"
        )
          option(
            v-for="v in [emptyVar].concat(st.variants)"
            :value="v.id"
            :selected="curproblem.vid==v.id"
          )
            | {{ v.name }}
      fieldset
        input#inputFen(
          type="text"
          placeholder="FEN"
          v-model="curproblem.fen"
          @input="trySetDiagram(curproblem)"
        )
        #diagram(v-html="curproblem.diag")
      fieldset
        textarea(
          :placeholder="st.tr['Instructions']"
          v-model="curproblem.instruction"
        )
        p(v-html="parseHtml(curproblem.instruction)")
      fieldset
        textarea(
          :placeholder="st.tr['Solution']"
          v-model="curproblem.solution"
        )
        p(v-html="parseHtml(curproblem.solution)")
      button(@click="sendProblem()") {{ st.tr["Send"] }}
      #dialog.text-center {{ st.tr[infoMsg] }}
  .row(v-if="showOne")
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      #topPage
        .button-group(v-if="st.user.id == curproblem.uid")
          button(@click="editProblem(curproblem)") {{ st.tr["Edit"] }}
          button(@click="deleteProblem(curproblem)") {{ st.tr["Delete"] }}
        span.vname {{ curproblem.vname }}
        span.uname ({{ curproblem.uname }})
        button.marginleft(@click="backToList()") {{ st.tr["Back to list"] }}
        button.nomargin(@click="gotoPrevNext($event,curproblem,1)")
          | {{ st.tr["Previous"] }}
        button.nomargin(@click="gotoPrevNext($event,curproblem,-1)")
          | {{ st.tr["Next"] }}
      p.oneInstructions.clickable(
        v-html="parseHtml(curproblem.instruction)"
        @click="curproblem.showSolution=!curproblem.showSolution"
      )
        | {{ st.tr["Show solution"] }}
      p(
        v-show="curproblem.showSolution"
        v-html="parseHtml(curproblem.solution)"
      )
  .row(v-else)
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      #controls
        button#newProblem(@click="prepareNewProblem()")
          | {{ st.tr["New problem"] }}
        label(for="checkboxMine") {{ st.tr["My problems"] }}
        input#checkboxMine(
          type="checkbox"
          v-model="onlyMines"
        )
        label(for="selectVariant") {{ st.tr["Variant"] }}
        select#selectVariant(v-model="selectedVar")
          option(
            v-for="v in [emptyVar].concat(st.variants)"
            :value="v.id"
          )
            | {{ v.name }}
      table#tProblems
        tr
          th {{ st.tr["Variant"] }}
          th {{ st.tr["Instructions"] }}
          th {{ st.tr["Number"] }}
        tr(
          v-for="p in problems"
          v-show="displayProblem(p)"
          @click="setHrefPid(p)"
        )
          td {{ p.vname }}
          td {{ firstChars(p.instruction) }}
          td {{ p.id }}
  BaseGame(
    v-if="showOne"
    :game="game"
  )
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
import { checkProblem } from "@/data/problemCheck";
import { getDiagram } from "@/utils/printDiagram";
import { processModalClick } from "@/utils/modalClick";
import { ArrayFun } from "@/utils/array";
import BaseGame from "@/components/BaseGame.vue";
export default {
  name: "my-problems",
  components: {
    BaseGame
  },
  data: function() {
    return {
      st: store.state,
      emptyVar: {
        vid: 0,
        vname: ""
      },
      // Problem currently showed, or edited:
      curproblem: {
        id: 0, //used in case of edit
        vid: 0,
        fen: "",
        diag: "",
        instruction: "",
        solution: "",
        showSolution: false
      },
      loadedVar: 0, //corresponding to loaded V
      selectedVar: 0, //to filter problems based on variant
      problems: [],
      onlyMines: false,
      showOne: false,
      infoMsg: "",
      game: {
        players: [{ name: "Problem" }, { name: "Problem" }],
        mode: "analyze"
      }
    };
  },
  created: function() {
    ajax("/problems", "GET", res => {
      // Show newest problem first:
      this.problems = res.problems.sort((p1, p2) => p2.added - p1.added);
      if (this.st.variants.length > 0)
        this.problems.forEach(p => this.setVname(p));
      // Retrieve all problems' authors' names
      let names = {};
      this.problems.forEach(p => {
        if (p.uid != this.st.user.id) names[p.uid] = "";
        else p.uname = this.st.user.name;
      });
      const showOneIfPid = () => {
        const pid = this.$route.query["id"];
        if (pid) this.showProblem(this.problems.find(p => p.id == pid));
      };
      if (Object.keys(names).length > 0) {
        ajax("/users", "GET", { ids: Object.keys(names).join(",") }, res2 => {
          res2.users.forEach(u => {
            names[u.id] = u.name;
          });
          this.problems.forEach(p => {
            if (!p.uname)
              p.uname = names[p.uid];
          });
          showOneIfPid();
        });
      } else showOneIfPid();
    });
  },
  mounted: function() {
    document
      .getElementById("newprobDiv")
      .addEventListener("click", processModalClick);
  },
  watch: {
    // st.variants changes only once, at loading from [] to [...]
    "st.variants": function() {
      // Set problems vname (either all are set or none)
      if (this.problems.length > 0 && this.problems[0].vname == "")
        this.problems.forEach(p => this.setVname(p));
    },
    $route: function(to) {
      const pid = to.query["id"];
      if (pid) this.showProblem(this.problems.find(p => p.id == pid));
      else this.showOne = false;
    }
  },
  methods: {
    fenFocusIfOpened: function(event) {
      if (event.target.checked) {
        this.infoMsg = "";
        document.getElementById("inputFen").focus();
      }
    },
    setVname: function(prob) {
      prob.vname = this.st.variants.find(v => v.id == prob.vid).name;
    },
    firstChars: function(text) {
      let preparedText = text
        // Replace line jumps and <br> by spaces
        .replace(/\n/g, " ")
        .replace(/<br\/?>/g, " ")
        .replace(/<[^>]+>/g, "") //remove remaining HTML tags
        .replace(/[ ]+/g, " ") //remove series of spaces by only one
        .trim();
      const maxLength = 32; //arbitrary...
      if (preparedText.length > maxLength)
        return preparedText.substr(0, 32) + "...";
      return preparedText;
    },
    copyProblem: function(p1, p2) {
      for (let key in p1) p2[key] = p1[key];
    },
    setHrefPid: function(p) {
      // Change href => $route changes, watcher notices, call showProblem
      const curHref = document.location.href;
      document.location.href = curHref.split("?")[0] + "?id=" + p.id;
    },
    backToList: function() {
      // Change href => $route change, watcher notices, reset showOne to false
      document.location.href = document.location.href.split("?")[0];
    },
    resetCurProb: function() {
      this.curproblem.id = 0;
      this.curproblem.uid = 0;
      this.curproblem.vid = "";
      this.curproblem.vname = "";
      this.curproblem.fen = "";
      this.curproblem.diag = "";
      this.curproblem.instruction = "";
      this.curproblem.solution = "";
      this.curproblem.showSolution = false;
    },
    parseHtml: function(txt) {
      return !txt.match(/<[/a-zA-Z]+>/)
        ? txt.replace(/\n/g, "<br/>") //no HTML tag
        : txt;
    },
    changeVariant: function(prob) {
      this.setVname(prob);
      this.loadVariant(prob.vid, () => {
        // Set FEN if possible (might not be correct yet)
        if (V.IsGoodFen(prob.fen)) this.setDiagram(prob);
      });
    },
    loadVariant: async function(vid, cb) {
      // Condition: vid is a valid variant ID
      this.loadedVar = 0;
      const variant = this.st.variants.find(v => v.id == vid);
      const vModule = await import("@/variants/" + variant.name + ".js");
      window.V = vModule.VariantRules;
      this.loadedVar = vid;
      cb();
    },
    trySetDiagram: function(prob) {
      // Problem edit: FEN could be wrong or incomplete,
      // variant could not be ready, or not defined
      if (prob.vid > 0 && this.loadedVar == prob.vid && V.IsGoodFen(prob.fen))
        this.setDiagram(prob);
    },
    setDiagram: function(prob) {
      // Condition: prob.fen is correct and global V is ready
      const parsedFen = V.ParseFen(prob.fen);
      const args = {
        position: parsedFen.position,
        orientation: parsedFen.turn
      };
      prob.diag = getDiagram(args);
    },
    displayProblem: function(p) {
      return (
        (!this.selectedVar || p.vid == this.selectedVar) &&
        ((this.onlyMines && p.uid == this.st.user.id) ||
          (!this.onlyMines && p.uid != this.st.user.id))
      );
    },
    showProblem: function(p) {
      this.loadVariant(p.vid, () => {
        // The FEN is already checked at this stage:
        this.game.vname = p.vname;
        this.game.mycolor = V.ParseFen(p.fen).turn; //diagram orientation
        this.game.fen = p.fen;
        this.$set(this.game, "fenStart", p.fen);
        this.copyProblem(p, this.curproblem);
        this.showOne = true;
      });
    },
    gotoPrevNext: function(e, prob, dir) {
      const startIdx = this.problems.findIndex(p => p.id == prob.id);
      let nextIdx = startIdx + dir;
      while (
        nextIdx >= 0 &&
        nextIdx < this.problems.length &&
        ((this.onlyMines && this.problems[nextIdx].uid != this.st.user.id) ||
          (!this.onlyMines && this.problems[nextIdx].uid == this.st.user.id))
      )
        nextIdx += dir;
      if (nextIdx >= 0 && nextIdx < this.problems.length)
        this.setHrefPid(this.problems[nextIdx]);
      else
        alert(this.st.tr["No more problems"]);
    },
    prepareNewProblem: function() {
      this.resetCurProb();
      window.doClick("modalNewprob");
    },
    sendProblem: function() {
      const error = checkProblem(this.curproblem);
      if (error) {
        alert(this.st.tr[error]);
        return;
      }
      const edit = this.curproblem.id > 0;
      this.infoMsg = "Processing... Please wait";
      ajax(
        "/problems",
        edit ? "PUT" : "POST",
        { prob: this.curproblem },
        ret => {
          if (edit) {
            let editedP = this.problems.find(p => p.id == this.curproblem.id);
            this.copyProblem(this.curproblem, editedP);
            this.showProblem(editedP);
          }
          else {
            let newProblem = Object.assign({}, this.curproblem);
            newProblem.id = ret.id;
            newProblem.uid = this.st.user.id;
            newProblem.uname = this.st.user.name;
            this.problems = [newProblem].concat(this.problems);
          }
          document.getElementById("modalNewprob").checked = false;
          this.infoMsg = "";
        }
      );
    },
    editProblem: function(prob) {
      // prob.diag might correspond to some other problem or be empty:
      this.setDiagram(prob); //V is loaded at this stage
      this.copyProblem(prob, this.curproblem);
      window.doClick("modalNewprob");
    },
    deleteProblem: function(prob) {
      if (confirm(this.st.tr["Are you sure?"])) {
        ajax("/problems", "DELETE", { id: prob.id }, () => {
          ArrayFun.remove(this.problems, p => p.id == prob.id);
          this.backToList();
        });
      }
    }
  }
};
</script>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 767px
  max-height: 100%

#inputFen
  width: 100%

textarea
  width: 100%

#diagram
  margin: 0 auto
  max-width: 400px

table#tProblems
  max-height: 100%

#controls
  margin: 0
  width: 100%
  text-align: center
  & > *
    margin: 0

p.oneInstructions
  margin: 0
  padding: 2px 5px
  background-color: lightgreen

#topPage
  span.vname
    font-weight: bold
    padding-left: var(--universal-margin)
  span.uname
    padding-left: var(--universal-margin)
  margin: 0 auto
  & > .nomargin
    margin: 0
  & > .marginleft
    margin: 0 0 0 15px

@media screen and (max-width: 767px)
  #topPage
    text-align: center
</style>
