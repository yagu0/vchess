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
        label(for="inputFen") FEN
        input#inputFen(
          type="text"
          v-model="curproblem.fen"
          @input="trySetDiagram(curproblem)"
        )
        div(v-html="curproblem.diag")
      fieldset
        textarea#instructions(
          :placeholder="st.tr['Instructions']"
          v-model="curproblem.instruction"
        )
        p(v-html="parseHtml(curproblem.instruction)")
      fieldset
        textarea#solution(
          :placeholder="st.tr['Solution']"
          v-model="curproblem.solution"
        )
        p(v-html="parseHtml(curproblem.solution)")
      button(@click="sendProblem()") {{ st.tr["Send"] }}
      #dialog.text-center {{ st.tr[infoMsg] }}
  .row
    .col-sm-12
      button#newProblem(onClick="doClick('modalNewprob')")
        | {{ st.tr["New problem"] }}
  .row(v-if="showOne")
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      #actions
        button(@click="showOne=false") {{ st.tr["Back to list"] }}
        button(
          v-if="st.user.id == curproblem.uid"
          @click="editProblem(curproblem)"
        )
          | {{ st.tr["Edit"] }}
        button(
          v-if="st.user.id == curproblem.uid"
          @click="deleteProblem(curproblem)"
        )
          | {{ st.tr["Delete"] }}
      h4 {{ curproblem.vname }}
      p(v-html="parseHtml(curproblem.instruction)")
      h4(@click="curproblem.showSolution=!curproblem.showSolution")
        | {{ st.tr["Show solution"] }}
      p(
        v-show="curproblem.showSolution"
        v-html="parseHtml(curproblem.solution)"
      )
  .row(v-else)
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
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
      div(
        v-for="p in problems"
        v-show="displayProblem(p)"
        @click="showProblem(p)"
      )
        h4 {{ p.vname }}
        p {{ p.fen }}
        p(v-html="p.instruction")
  BaseGame(v-if="showOne" :game="game" :vr="vr")
</template>

<script>
// TODO: si showProblem(p), changer URL (ajouter problem ID)
// Et si au lancement l'URL comprend un pid, alors showOne=true et curproblem=...
// TODO: also style problem div (in the list, similar to variants page + clickable)

import { store } from "@/store";
import { ajax } from "@/utils/ajax";
import { checkProblem } from "@/data/problemCheck";
import { getDiagram } from "@/utils/printDiagram";
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
        this.problems.forEach(p => this.setVname(p))
    });
  },
  watch: {
    // st.variants changes only once, at loading from [] to [...]
    "st.variants": function(variantArray) {
      // Set problems vname (either all are set or none)
      if (this.problems.length > 0 && this.problems[0].vname == "")
        this.problems.forEach(p => this.setVname(p));
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
        ajax("/problems", "DELETE", {pid:prob.id});
    },
  },
};
</script>

<style lang="sass" scoped>
#newProblem
  display: block
  margin: 10px auto 5px auto
</style>
