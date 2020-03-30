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
            v-if="!v.noProblems"
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
        .button-group(v-if="canIedit(curproblem.uid)")
          button(@click="editProblem(curproblem)") {{ st.tr["Edit"] }}
          button(@click="deleteProblem(curproblem)") {{ st.tr["Delete"] }}
        span.vname {{ curproblem.vname }}
        span.uname ({{ curproblem.uname }})
        button.marginleft(@click="backToList()") {{ st.tr["Back to list"] }}
        button.nomargin(@click="gotoPrevNext(curproblem,1)")
          | {{ st.tr["Previous_p"] }}
        button.nomargin(@click="gotoPrevNext(curproblem,-1)")
          | {{ st.tr["Next_p"] }}
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
        div#myProblems(v-if="st.user.id > 0")
          label(for="checkboxMine") {{ st.tr["My problems"] }}
          input#checkboxMine(
            type="checkbox"
            v-model="onlyMine"
          )
        label(for="selectVariant") {{ st.tr["Variant"] }}
        select#selectVariant(v-model="selectedVar")
          option(
            v-for="v in [emptyVar].concat(st.variants)"
            v-if="!v.noProblems"
            :value="v.id"
          )
            | {{ v.name }}
      table#tProblems
        tr
          th {{ st.tr["Variant"] }}
          th {{ st.tr["Instructions"] }}
          th {{ st.tr["Number"] }}
        tr(
          v-for="p in problems[onlyMine ? 'mine' : 'others']"
          v-show="onlyMine || !selectedVar || p.vid == selectedVar"
          @click="setHrefPid(p)"
        )
          td {{ p.vname }}
          td {{ firstChars(p.instruction) }}
          td {{ p.id }}
      button#loadMoreBtn(
        v-if="hasMore[onlyMine ? 'mine' : 'others']"
        @click="loadMore(onlyMine ? 'mine' : 'others')"
      )
        | {{ st.tr["Load more"] }}
  BaseGame(
    ref="basegame"
    v-if="showOne"
    :game="game"
  )
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
import { checkProblem } from "@/data/problemCheck";
import params from "@/parameters";
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
      problems: { "mine": [], "others": [] },
      // timestamp of oldest showed problem:
      cursor: {
        mine: Number.MAX_SAFE_INTEGER,
        others: Number.MAX_SAFE_INTEGER
      },
      // hasMore == TRUE: a priori there could be more problems to load
      hasMore: { mine: true, others: true },
      onlyMine: false,
      showOne: false,
      infoMsg: "",
      game: {
        players: [{ name: "Problem" }, { name: "Problem" }],
        mode: "analyze"
      }
    };
  },
  created: function() {
    const pid = this.$route.query["id"];
    if (!!pid) this.showProblem(pid);
    else this.loadMore("others", () => { this.loadMore("mine"); });
  },
  mounted: function() {
    document.getElementById("newprobDiv")
      .addEventListener("click", processModalClick);
  },
  watch: {
    // st.variants changes only once, at loading from [] to [...]
    "st.variants": function() {
      // Set problems vname (either all are set or none)
      let problems = this.problems["others"].concat(this.problems["mine"]);
      if (problems.length > 0 && problems[0].vname == "")
        problems.forEach(p => this.setVname(p));
    },
    $route: function(to) {
      const pid = to.query["id"];
      if (!!pid) this.showProblem(pid);
      else {
        if (this.cursor["others"] == Number.MAX_SAFE_INTEGER)
          // Back from a single problem view at initial loading:
          // problems lists are empty!
          this.loadMore("others", () => { this.loadMore("mine"); });
        this.showOne = false;
      }
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
    // Add vname and user names:
    decorate: function(problems, callback) {
      if (this.st.variants.length > 0)
        problems.forEach(p => this.setVname(p));
      // Retrieve all problems' authors' names
      let names = {};
      problems.forEach(p => {
        if (p.uid != this.st.user.id) names[p.uid] = "";
        else p.uname = this.st.user.name;
      });
      if (Object.keys(names).length > 0) {
        ajax(
          "/users",
          "GET",
          {
            data: { ids: Object.keys(names).join(",") },
            success: (res2) => {
              res2.users.forEach(u => {
                names[u.id] = u.name;
              });
              problems.forEach(p => {
                if (!p.uname)
                  p.uname = names[p.uid];
              });
              if (!!callback) callback();
            }
          }
        );
      } else if (!!callback) callback();
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
        else prob.diag = "";
      });
    },
    loadVariant: async function(vid, cb) {
      // Condition: vid is a valid variant ID
      this.loadedVar = 0;
      const variant = this.st.variants.find(v => v.id == vid);
      await import("@/variants/" + variant.name + ".js")
      .then((vModule) => {
        window.V = vModule[variant.name + "Rules"];
        this.loadedVar = vid;
        cb();
      });
    },
    trySetDiagram: function(prob) {
      // Problem edit: FEN could be wrong or incomplete,
      // variant could not be ready, or not defined
      if (prob.vid > 0 && this.loadedVar == prob.vid && V.IsGoodFen(prob.fen))
        this.setDiagram(prob);
      else prob.diag = "";
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
    showProblem: function(p_id) {
      const processWhenWeHaveProb = () => {
        this.loadVariant(p.vid, () => {
          this.onlyMine = (p.uid == this.st.user.id);
          // The FEN is already checked at this stage:
          this.game.vname = p.vname;
          this.game.mycolor = V.ParseFen(p.fen).turn; //diagram orientation
          this.game.fenStart = p.fen;
          this.game.fen = p.fen;
          this.showOne = true;
          // $nextTick to be sure $refs["basegame"] exists
          this.$nextTick(() => {
            this.$refs["basegame"].re_setVariables(this.game); });
          this.curproblem.showSolution = false; //in case of
          this.copyProblem(p, this.curproblem);
        });
      };
      let p = undefined;
      if (typeof p_id == "object") p = p_id;
      else {
        const problems = this.problems["others"].concat(this.problems["mine"]);
        p = problems.find(prob => prob.id == p_id);
      }
      if (!p) {
        // Bad luck: problem not in list. Get from server
        ajax(
          "/problems",
          "GET",
          {
            data: { id: p_id },
            success: (res) => {
              this.decorate([res.problem], () => {
                p = res.problem;
                const mode = (p.uid == this.st.user.id ? "mine" : "others");
                this.problems[mode].push(p);
                processWhenWeHaveProb();
              });
            }
          }
        );
      } else processWhenWeHaveProb();
    },
    gotoPrevNext: function(prob, dir) {
      const mode = (this.onlyMine ? "mine" : "others");
      const problems = this.problems[mode];
      const startIdx = problems.findIndex(p => p.id == prob.id);
      const nextIdx = startIdx + dir;
      if (nextIdx >= 0 && nextIdx < problems.length)
        this.setHrefPid(problems[nextIdx]);
      else if (this.hasMore[mode]) {
        this.loadMore(
          mode,
          (nbProbs) => {
            if (nbProbs > 0) this.gotoPrevNext(prob, dir);
            else alert(this.st.tr["No more problems"]);
          }
        );
      }
      else alert(this.st.tr["No more problems"]);
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
        {
          data: { prob: this.curproblem },
          success: (ret) => {
            if (edit) {
              let editedP = this.problems["mine"]
                .find(p => p.id == this.curproblem.id);
              if (!editedP)
                // I'm an admin and edit another user' problem
                editedP = this.problems["others"]
                  .find(p => p.id == this.curproblem.id);
              this.copyProblem(this.curproblem, editedP);
              this.showProblem(editedP);
            }
            else {
              let newProblem = Object.assign({}, this.curproblem);
              newProblem.id = ret.id;
              newProblem.uid = this.st.user.id;
              newProblem.uname = this.st.user.name;
              this.problems["mine"] =
                [newProblem].concat(this.problems["mine"]);
            }
            document.getElementById("modalNewprob").checked = false;
            this.infoMsg = "";
          }
        }
      );
    },
    canIedit: function(puid) {
      return params.devs.concat([puid]).includes(this.st.user.id);
    },
    editProblem: function(prob) {
      // prob.diag might correspond to some other problem or be empty:
      this.setDiagram(prob); //V is loaded at this stage
      this.copyProblem(prob, this.curproblem);
      window.doClick("modalNewprob");
    },
    deleteProblem: function(prob) {
      if (confirm(this.st.tr["Are you sure?"])) {
        ajax(
          "/problems",
          "DELETE",
          {
            data: { id: prob.id },
            success: () => {
              const mode = prob.uid == (this.st.user.id ? "mine" : "others");
              ArrayFun.remove(this.problems[mode], p => p.id == prob.id);
              this.backToList();
            }
          }
        );
      }
    },
    loadMore: function(mode, cb) {
      ajax(
        "/problems",
        "GET",
        {
          data: {
            uid: this.st.user.id,
            mode: mode,
            cursor: this.cursor[mode]
          },
          success: (res) => {
            const L = res.problems.length;
            if (L > 0) {
              this.cursor[mode] = res.problems[L - 1].added;
              // Remove potential duplicates:
              const pids = this.problems[mode].map(p => p.id);
              ArrayFun.remove(res.problems, p => pids.includes(p.id), "all");
              this.decorate(res.problems);
              this.problems[mode] =
                this.problems[mode].concat(res.problems)
                // TODO: problems are alrady sorted, would just need to insert
                // the current individual problem in list; more generally
                // there is probably only one misclassified problem.
                // (Unless the user navigated several times by URL to show a
                // single problem...)
                .sort((p1, p2) => p2.added - p1.added);
            } else this.hasMore[mode] = false;
            if (!!cb) cb(L);
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

#inputFen
  width: 100%

textarea
  width: 100%

#diagram
  margin: 0 auto
  max-width: 400px

table#tProblems
  max-height: 100%

button#loadMoreBtn
  display: block
  margin: 0 auto

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

#myProblems
  display: inline-block

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
