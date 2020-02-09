<template lang="pug">
main
  .row
    .col-sm-12
      #fenDiv
        input#fen(v-model="curFen" @input="adjustFenSize")
        button(@click="gotoFen") {{ st.tr["Go"] }}
  BaseGame(:game="game" :vr="vr" ref="basegame")
</template>

<script>
import BaseGame from "@/components/BaseGame.vue";
import { store } from "@/store";
import { ArrayFun } from "@/utils/array";

export default {
  name: 'my-analyze',
  components: {
    BaseGame,
  },
  // gameRef: to find the game in (potentially remote) storage
  data: function() {
    return {
      st: store.state,
      gameRef: { //given in URL (rid = remote ID)
        vname: "",
        fen: ""
      },
      game: {
        players:[{name:"Analyze"},{name:"Analyze"}],
        mode: "analyze"
      },
      vr: null, //"variant rules" object initialized from FEN
      curFen: "",
      //people: [], //players + observers //TODO later: interactive analyze...
    };
  },
  watch: {
    // NOTE: no watcher for $route change, because if fenStart doesn't change
    // then it doesn't trigger BaseGame.re_init() and the result is weird.
    "vr.movesCount": function(fen) {
      this.curFen = this.vr.getFen();
      this.adjustFenSize();
    },
  },
  created: function() {
    this.gameRef.vname = this.$route.params["vname"];
    if (this.gameRef.vname == "Dark")
    {
      alert(this.st.tr["Analyze in Dark mode makes no sense!"]);
      history.back(); //or this.$router.go(-1)
    }
    else
    {
      this.gameRef.fen = this.$route.query["fen"].replace(/_/g, " ");
      this.initialize();
    }
  },
  methods: {
    initialize: async function() {
      // Obtain VariantRules object
      const vModule = await import("@/variants/" + this.gameRef.vname + ".js");
      window.V = vModule.VariantRules;
      this.loadGame();
    },
    loadGame: function() {
      // NOTE: no need to set score (~unused)
      this.game.vname = this.gameRef.vname;
      this.game.fen = this.gameRef.fen;
      this.curFen = this.game.fen;
      this.adjustFenSize();
      this.vr = new V(this.game.fen);
      this.game.mycolor = this.vr.turn;
      this.$set(this.game, "fenStart", this.gameRef.fen);
    },
    adjustFenSize: function() {
      let fenInput = document.getElementById("fen");
      fenInput.style.width = this.curFen.length + "ch";
    },
    gotoFen: function() {
      this.gameRef.fen = this.curFen;
      this.loadGame();
    },
  },
};
</script>

<style lang="sass" scoped>
#fenDiv
  text-align: center
</style>
