<template lang="pug">
main
  input#modalNewprob.modal(type="checkbox" @change="infoMsg=''")
  div#newprobDiv(role="dialog" data-checkbox="modalNewprob")
    .card(@keyup.enter="newProblem()")
      label#closeNewprob.modal-close(for="modalNewprob")
      form(@submit.prevent="newProblem()" @keyup.enter="newProblem()")
        fieldset
          label(for="selectVariant") {{ st.tr["Variant"] }}
          select#selectVariant(v-model="newproblem.vid" @change="loadVariant()")
            option(v-for="v in [emptyVar].concat(st.variants)" :value="v.id"
                :selected="newproblem.vid==v.id")
              | {{ v.name }}
        fieldset
          label(for="inputFen") FEN
          input#inputFen(type="text" v-model="newproblem.fen" @input="tryGetDiagram()")
        fieldset
          textarea#instructions(:placeholder="st.tr['Instructions']")
          textarea#solution(:placeholder="st.tr['Solution']")
      #preview
        div(v-html="curDiag")
        p instru: v-html=... .replace("\n", "<br/>") --> si pas de tags détectés !
        p solution: v-html=...
      button(@click="newProblem()") {{ st.tr["Send problem"] }}
      #dialog.text-center {{ st.tr[infoMsg] }}
  .row
    .col-sm-12
      button#newProblem(onClick="doClick('modalNewprob')") {{ st.tr["New problem"] }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      label(for="checkboxMine") {{ st.tr["My problems"] }}
      input#checkboxMine(type="checkbox" v-model="onlyMines")
      label(for="selectVariant") {{ st.tr["Variant"] }}
      select#selectVariant(v-model="newproblem.vid")
        option(v-for="v in [emptyVar].concat(st.variants)" :value="v.id")
          | {{ v.name }}
      // TODO: nice problems printing :: same as in preview ==> subComponent (inlined?)
      div(v-for="p in problems" v-show="showProblem(p)")
        p {{ p.vid }}
        p {{ p.fen }}
        p {{ p.instruction }}
        p {{ p.solution }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
import { checkProblem } from "@/data/problemCheck";
import { getDiagram } from "@/utils/printDiagram";
export default {
  name: "my-problems",
  data: function() {
    return {
      emptyVar: {
        vid: 0,
        vname: "",
      },
      newproblem: {
        vid: 0,
        fen: "",
        instruction: "",
        solution: "",
      },
      onlyMines: false,
      st: store.state,
      problems: [],
      infoMsg: "",
      curVar: 0,
      curDiag: "",
    };
  },
  created: function() {
    ajax("/problems", "GET", (res) => {
      this.problems = res.problems;
    });
  },
  methods: {
    showProblem: function(p) {
      return (this.vid == 0 || p.vid == this.vid) &&
        (!this.onlyMines || p.uid != this.st.user.id);
    },
    loadVariant: async function() {
      if (this.newproblem.vid == 0)
        return;
      this.curVar = 0;
      const variant = this.st.variants.find(v => v.id == this.newproblem.vid);
      const vModule = await import("@/variants/" + variant.name + ".js");
      window.V = vModule.VariantRules;
      this.curVar = this.newproblem.vid;
      this.tryGetDiagram(); //the FEN might be already filled
    },
    tryGetDiagram: async function() {
      if (this.newproblem.vid == 0)
        return;
      // Check through curVar if V is ready:
      if (this.curVar == this.newproblem.vid && V.IsGoodFen(this.newproblem.fen))
      {
        const parsedFen = V.ParseFen(this.newproblem.fen);
        const args = {
          position: parsedFen.position,
          orientation: parsedFen.turn,
        };
        this.curDiag = getDiagram(args);
      }
      else
        this.curDiag = "<p>FEN not yet correct</p>";
    },
    newProblem: function() {
      const error = checkProblem(this.newproblem);
      if (!!error)
        return alert(error);
      ajax("/problems", "POST", {prob:this.newproblem}, (ret) => {
        this.infoMsg = this.st.tr["Problem sent!"];
        let newProblem = Object.Assign({}, this.newproblem);
        newProblem.id = ret.id;
        this.problems = this.problems.concat(newProblem);
      });
    },
  },
};
</script>

<style lang="sass" scoped>
#newProblem
  display: block
  margin: 10px auto 5px auto
</style>
