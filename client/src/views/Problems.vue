<template lang="pug">
main
  input#modalNewprob.modal(type="checkbox" @change="infoMsg=''")
  div#newprobDiv(role="dialog" data-checkbox="modalNewprob")
    .card(@keyup.enter="sendProblem()")
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
    .col-sm-12.col-md-9.col-md-offset-3.col-lg-10.col-lg-offset-2
      #topPage
        span {{ curproblem.vname }}
        button.marginleft(@click="backToList()") {{ st.tr["Back to list"] }}
        button.nomargin(
          v-if="st.user.id == curproblem.uid"
          @click="editProblem(curproblem)"
        )
          | {{ st.tr["Edit"] }}
        button.nomargin(
          v-if="st.user.id == curproblem.uid"
          @click="deleteProblem(curproblem)"
        )
          | {{ st.tr["Delete"] }}
      p.clickable(
        v-html="curproblem.uname + ' : ' + parseHtml(curproblem.instruction)"
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
        button#newProblem(onClick="doClick('modalNewprob')")
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
      table
        tr
          th {{ st.tr["Variant"] }}
          th {{ st.tr["Instructions"] }}
        tr(
          v-for="p in problems"
          v-show="displayProblem(p)"
          @click="setHrefPid(p)"
        )
          td {{ p.vname }}
          td(v-html="p.instruction")
  BaseGame(v-if="showOne" :game="game" :vr="vr")
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
    BaseGame,
  },
  data: function() {
    return {
      st: store.state,
      emptyVar: {
        vid: 0,
        vname: "",
      },
      // Problem currently showed, or edited:
      curproblem: {
        id: 0, //used in case of edit
        vid: 0,
        fen: "",
        diag: "",
        instruction: "",
        solution: "",
        showSolution: false,
      },
      loadedVar: 0, //corresponding to loaded V
      selectedVar: 0, //to filter problems based on variant
      problems: [],
      onlyMines: false,
      showOne: false,
      infoMsg: "",
      vr: null, //"variant rules" object initialized from FEN
      game: {
        players:[{name:"Problem"},{name:"Problem"}],
        mode: "analyze",
      },
    };
  },
  created: function() {
    ajax("/problems", "GET", (res) => {
      this.problems = res.problems;
      if (this.st.variants.length > 0)
        this.problems.forEach(p => this.setVname(p));
      // Retrieve all problems' authors' names
      let names = {};
      this.problems.forEach(p => {
        if (p.uid != this.st.user.id)
          names[p.uid] = ""; //unknwon for now
        else { console.log("assign " + this.st.user.name);
          p.uname = this.st.user.name; console.log(p); console.log(this.problems); }
      });
      if (Object.keys(name).length > 0)
      {
        ajax("/users",
          "GET",
          { ids: Object.keys(names).join(",") },
          res2 => {
            res2.users.forEach(u => {names[u.id] = u.name});
            this.problems.forEach(p => p.uname = names[p.uid]);
          }
        );
      }
      const pid = this.$route.query["id"];
      if (!!pid)
        this.showProblem(this.problems.find(p => p.id == pid));
    });
  },
  mounted: function() {
    document.getElementById("newprobDiv").addEventListener("click", processModalClick);
  },
  watch: {
    // st.variants changes only once, at loading from [] to [...]
    "st.variants": function(variantArray) {
      // Set problems vname (either all are set or none)
      if (this.problems.length > 0 && this.problems[0].vname == "")
        this.problems.forEach(p => this.setVname(p));
    },
    "$route": function(to, from) { console.log("ddddd");
      const pid = to.query["id"];
      if (!!pid)
        this.showProblem(this.problems.find(p => p.id == pid));
      else
        this.showOne = false
    },
  },
  methods: {
    setVname: function(prob) {
      prob.vname = this.st.variants.find(v => v.id == prob.vid).name;
    },
    copyProblem: function(p1, p2) {
      for (let key in p1)
        p2[key] = p1[key];
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
      this.loadVariant(
        prob.vid,
        () => {
          // Set FEN if possible (might not be correct yet)
          if (V.IsGoodFen(prob.fen))
            this.setDiagram(prob);
        }
      );
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
        orientation: parsedFen.turn,
      };
      prob.diag = getDiagram(args);
    },
    displayProblem: function(p) {
      return ((this.selectedVar == 0 || p.vid == this.selectedVar) &&
        ((this.onlyMines && p.uid == this.st.user.id)
          || (!this.onlyMines && p.uid != this.st.user.id)));
    },
    showProblem: function(p) {
      this.loadVariant(
        p.vid,
        () => {
          // The FEN is already checked at this stage:
          this.vr = new V(p.fen);
          this.game.vname = p.vname;
          this.game.mycolor = this.vr.turn; //diagram orientation
          this.game.fen = p.fen;
          this.$set(this.game, "fenStart", p.fen);
          this.copyProblem(p, this.curproblem);
          this.showOne = true;
        }
      );
    },
    sendProblem: function() {
      const error = checkProblem(this.curproblem);
      if (!!error)
        return alert(error);
      const edit = this.curproblem.id > 0;
      this.infoMsg = "Processing... Please wait";
      ajax(
        "/problems",
        edit ? "PUT" : "POST",
        {prob: this.curproblem},
        (ret) => {
          if (edit)
          {
            let editedP = this.problems.find(p => p.id == this.curproblem.id);
            this.copyProblem(this.curproblem, editedP);
          }
          else //new problem
          {
            let newProblem = Object.assign({}, this.curproblem);
            newProblem.id = ret.id;
            newProblem.uid = this.st.user.id;
            newProblem.uname = this.st.user.name;
            this.problems = this.problems.concat(newProblem);
          }
          this.resetCurProb();
          this.infoMsg = "";
        }
      );
    },
    editProblem: function(prob) {
      if (!prob.diag)
        this.setDiagram(prob); //possible because V is loaded at this stage
      this.copyProblem(prob, this.curproblem);
      doClick('modalNewprob');
    },
    deleteProblem: function(prob) {
      if (confirm(this.st.tr["Are you sure?"]))
      {
        ajax("/problems", "DELETE", {id:prob.id}, () => {
          ArrayFun.remove(this.problems, p => p.id == prob.id);
          this.backToList();
        });
      }
    },
  },
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
#controls
  margin: 0
  width: 100%
  text-align: center
  & > *
    margin: 0
#topPage
  span
    font-weight: bold
    padding-left: var(--universal-margin)
  margin: 0 auto
  & > .nomargin
    margin: 0
  & > .marginleft
    margin: 0 0 0 15px

</style>
