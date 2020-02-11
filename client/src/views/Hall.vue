<template lang="pug">
main
  input#modalInfo.modal(type="checkbox")
  div#infoDiv(role="dialog" data-checkbox="modalInfo" aria-labelledby="infoMessage")
    .card.smallpad.small-modal.text-center
      label.modal-close(for="modalInfo")
      h3#infoMessage.section
        p(v-html="infoMessage")
  input#modalNewgame.modal(type="checkbox")
  div#newgameDiv(role="dialog" data-checkbox="modalNewgame"
      aria-labelledby="titleFenedit")
    .card.smallpad(@keyup.enter="newChallenge")
      label#closeNewgame.modal-close(for="modalNewgame")
      fieldset
        label(for="selectVariant") {{ st.tr["Variant"] }} *
        select#selectVariant(v-model="newchallenge.vid")
          option(v-for="v in st.variants" :value="v.id"
              :selected="newchallenge.vid==v.id")
            | {{ v.name }}
      fieldset
        label(for="cadence") {{ st.tr["Cadence"] }} *
        div#predefinedCadences
          button 3+2
          button 5+3
          button 15+5
        input#cadence(type="text" v-model="newchallenge.cadence"
          placeholder="5+0, 1h+30s, 7d+1d ...")
      fieldset(v-if="st.user.id > 0")
        label(for="selectPlayers") {{ st.tr["Play with?"] }}
        input#selectPlayers(type="text" v-model="newchallenge.to")
      fieldset(v-if="st.user.id > 0 && newchallenge.to.length > 0")
        label(for="inputFen") FEN
        input#inputFen(type="text" v-model="newchallenge.fen")
      button(@click="newChallenge") {{ st.tr["Send challenge"] }}
  .row
    .col-sm-12
      button#newGame(onClick="doClick('modalNewgame')") {{ st.tr["New game"] }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      div
        .button-group
          button(@click="(e) => setDisplay('c','live',e)" class="active")
            | {{ st.tr["Live challenges"] }}
          button(@click="(e) => setDisplay('c','corr',e)")
            | {{ st.tr["Correspondance challenges"] }}
        ChallengeList(v-show="cdisplay=='live'"
          :challenges="filterChallenges('live')" @click-challenge="clickChallenge")
        ChallengeList(v-show="cdisplay=='corr'"
          :challenges="filterChallenges('corr')" @click-challenge="clickChallenge")
      #people
        h3.text-center {{ st.tr["Who's there?"] }}
        #players
          p(v-for="sid in Object.keys(people)" v-if="!!people[sid].name")
            span {{ people[sid].name }}
            // Check: anonymous players cannot send individual challenges or be challenged individually
            button.player-action(
              v-if="sid != st.user.sid && !!st.user.name && people[sid].id > 0"
              @click="challOrWatch(sid)"
            )
              | {{ getActionLabel(sid) }}
          p.anonymous @nonymous ({{ anonymousCount }})
        #chat
          Chat(:newChat="newChat" @mychat="processChat")
        .clearer
      div
        .button-group
          button(@click="(e) => setDisplay('g','live',e)" class="active")
            | {{ st.tr["Live games"] }}
          button(@click="(e) => setDisplay('g','corr',e)")
            | {{ st.tr["Correspondance games"] }}
        GameList(v-show="gdisplay=='live'" :games="filterGames('live')"
          @show-game="showGame")
        GameList(v-show="gdisplay=='corr'" :games="filterGames('corr')"
          @show-game="showGame")
</template>

<script>
import { store } from "@/store";
import { checkChallenge } from "@/data/challengeCheck";
import { ArrayFun } from "@/utils/array";
import { ajax } from "@/utils/ajax";
import params from "@/parameters";
import { getRandString, shuffle } from "@/utils/alea";
import Chat from "@/components/Chat.vue";
import GameList from "@/components/GameList.vue";
import ChallengeList from "@/components/ChallengeList.vue";
import { GameStorage } from "@/utils/gameStorage";
import { processModalClick } from "@/utils/modalClick";
export default {
  name: "my-hall",
  components: {
    Chat,
    GameList,
    ChallengeList,
  },
  data: function () {
    return {
      st: store.state,
      cdisplay: "live", //or corr
      gdisplay: "live",
      games: [],
      challenges: [],
      people: {},
      infoMessage: "",
      newchallenge: {
        fen: "",
        vid: localStorage.getItem("vid") || "",
        to: "", //name of challenged player (if any)
        cadence: localStorage.getItem("cadence") || "",
      },
      newChat: "",
      conn: null,
    };
  },
  watch: {
    // st.variants changes only once, at loading from [] to [...]
    "st.variants": function(variantArray) {
      // Set potential challenges and games variant names:
      this.challenges.concat(this.games).forEach(o => {
        if (o.vname == "")
          o.vname = this.getVname(o.vid);
      });
    },
  },
  computed: {
    anonymousCount: function() {
      let count = 0;
      Object.values(this.people).forEach(p => { count += (!p.name ? 1 : 0); });
      return count;
    },
  },
  created: function() {
    const my = this.st.user;
    this.$set(this.people, my.sid, {id:my.id, name:my.name, pages:["/"]});
    // Ask server for current corr games (all but mines)
    ajax(
      "/games",
      "GET",
      {uid: this.st.user.id, excluded: true},
      response => {
        this.games = this.games.concat(response.games.map(g => {
          const type = this.classifyObject(g);
          const vname = this.getVname(g.vid);
          return Object.assign({}, g, {type: type, vname: vname});
        }));
      }
    );
    // Also ask for corr challenges (open + sent by/to me)
    ajax(
      "/challenges",
      "GET",
      {uid: this.st.user.id},
      response => {
        // Gather all senders names, and then retrieve full identity:
        // (TODO [perf]: some might be online...)
        let names = {};
        response.challenges.forEach(c => {
          if (c.uid != this.st.user.id)
            names[c.uid] = ""; //unknwon for now
          else if (!!c.target && c.target != this.st.user.id)
            names[c.target] = "";
        });
        const addChallenges = (newChalls) => {
          names[this.st.user.id] = this.st.user.name; //in case of
          this.challenges = this.challenges.concat(
            response.challenges.map(c => {
              const from = {name: names[c.uid], id: c.uid}; //or just name
              const type = this.classifyObject(c);
              const vname = this.getVname(c.vid);
              return Object.assign({},
                {
                  type: type,
                  vname: vname,
                  from: from,
                  to: (!!c.target ? names[c.target] : ""),
                },
                c);
            })
          );
        };
        if (names !== {})
        {
          ajax("/users",
            "GET",
            { ids: Object.keys(names).join(",") },
            response2 => {
              response2.users.forEach(u => {names[u.id] = u.name});
              addChallenges();
            }
          );
        }
        else
          addChallenges();
      }
    );
    const connectAndPoll = () => {
      this.send("connect");
      this.send("pollclientsandgamers");
    };
    // Initialize connection
    const connexionString = params.socketUrl +
      "/?sid=" + this.st.user.sid +
      "&tmpId=" + getRandString() +
      "&page=" + encodeURIComponent(this.$route.path);
    this.conn = new WebSocket(connexionString);
    this.conn.onopen = connectAndPoll;
    this.conn.onmessage = this.socketMessageListener;
    const socketCloseListener = () => {
      this.conn = new WebSocket(connexionString);
      this.conn.addEventListener('message', this.socketMessageListener);
      this.conn.addEventListener('close', socketCloseListener);
    };
    this.conn.onclose = socketCloseListener;
  },
  mounted: function() {
    [document.getElementById("infoDiv"),document.getElementById("newgameDiv")]
      .forEach(elt => elt.addEventListener("click", processModalClick));
    document.querySelectorAll("#predefinedCadences > button").forEach(
      (b) => { b.addEventListener("click",
        () => { this.newchallenge.cadence = b.innerHTML; }
      )}
    );
  },
  beforeDestroy: function() {
    this.send("disconnect");
  },
  methods: {
    // Helpers:
    send: function(code, obj) {
      this.conn.send(JSON.stringify(
        Object.assign(
          {code: code},
          obj,
        )
      ));
    },
    getVname: function(vid) {
      const variant = this.st.variants.find(v => v.id == vid);
      // this.st.variants might be uninitialized (variant == null)
      return (!!variant ? variant.name : "");
    },
    filterChallenges: function(type) {
      return this.challenges.filter(c => c.type == type);
    },
    filterGames: function(type) {
      return this.games.filter(g => g.type == type);
    },
    classifyObject: function(o) { //challenge or game
      return (o.cadence.indexOf('d') === -1 ? "live" : "corr");
    },
    setDisplay: function(letter, type, e) {
      this[letter + "display"] = type;
      e.target.classList.add("active");
      if (!!e.target.previousElementSibling)
        e.target.previousElementSibling.classList.remove("active");
      else
        e.target.nextElementSibling.classList.remove("active");
    },
    getActionLabel: function(sid) {
      return this.people[sid].pages.some(p => p == "/")
        ? "Challenge"
        : "Observe";
    },
    challOrWatch: function(sid) {
      if (this.people[sid].pages.some(p => p == "/"))
      {
        // Available, in Hall
        this.newchallenge.to = this.people[sid].name;
        doClick("modalNewgame");
      }
      else
      {
        // In some game, maybe playing maybe not
        const gid = this.people[sid].page.match(/[a-zA-Z0-9]+$/)[0];
        this.showGame(this.games.find(g => g.id == gid)), sid;
      }
    },
    showGame: function(g, obsId) {
      // NOTE: we are an observer, since only games I don't play are shown here
      // ==> Moves sent by connected remote player(s) if live game
      let url = "/game/" + g.id;
      if (g.type == "live")
      {
        let rids = [];
        for (let i of [0,1])
        {
          if (this.people[g.players[i].sid].pages.indexOf(url) >= 0)
            rids.push(g.players[i].sid);
        }
        if (!!obsId)
          rids.push(obsId); //observer can provide game too
        const ridIdx = Math.floor(Math.random() * rids.length);
        url += "?rid=" + rids[ridIdx];
      }
      this.$router.push(url);
    },
    processChat: function(chat) {
      this.send("newchat", {data:chat});
    },
    // Messaging center:
    socketMessageListener: function(msg) {
      const data = JSON.parse(msg.data);
      switch (data.code)
      {
        case "pollclientsandgamers":
        {
          let identityAsked = {};
          data.sockIds.forEach(s => {
            if (s.sid != this.st.user.sid && !identityAsked[s.sid])
            {
              identityAsked[s.sid] = true;
              this.send("askidentity", {target:s.sid});
            }
            if (!this.people[s.sid])
              this.$set(this.people, s.sid, {id:0, name:"", pages:[s.page || "/"]});
            else if (!!s.page && this.people[s.sid].pages.indexOf(s.page) < 0)
              this.people[s.sid].pages.push(s.page);
            if (!s.page)
              this.send("askchallenge", {target:s.sid});
            else
              this.send("askgame", {target:s.sid});
          });
          break;
        }
        case "connect":
        case "gconnect":
          // NOTE: player could have been polled earlier, but might have logged in then
          // So it's a good idea to ask identity if he was anonymous.
          // But only ask game / challenge if currently disconnected.
          if (!this.people[data.from])
          {
            this.$set(this.people, data.from, {name:"", id:0, pages:[data.page]});
            if (data.code == "connect")
              this.send("askchallenge", {target:data.from});
            else
              this.send("askgame", {target:data.from});
          }
          else
          {
            // append page if not already in list
            if (this.people[data.from].pages.indexOf(data.page) < 0)
              this.people[data.from].pages.push(data.page);
          }
          if (this.people[data.from].id == 0)
            this.send("askidentity", {target:data.from});
          break;
        case "disconnect":
        case "gdisconnect":
          // Disconnect means no more tmpIds:
          if (data.code == "disconnect")
          {
            this.$delete(this.people, data.from);
            // Also remove all challenges sent by this player:
            ArrayFun.remove(this.challenges, c => c.from.sid == data.from);
          }
          else
          {
            const pidx = this.people[data.from].pages.indexOf(data.page);
            this.people[data.from].pages.splice(pageIdx, 1);
            if (this.people[data.from].pages.length == 0)
            {
              this.$delete(this.people, data.from);
              // And all live games where he plays and no other opponent is online
              ArrayFun.remove(this.games, g =>
                g.type == "live" && (g.players.every(p => p.sid == data.from
                  || !this.people[p.sid])), "all");
            }
          }
          break;
        case "askidentity":
          // Request for identification: reply if I'm not anonymous
          if (this.st.user.id > 0)
          {
            const me = {
              // NOTE: decompose to avoid revealing email
              name: this.st.user.name,
              sid: this.st.user.sid,
              id: this.st.user.id,
            };
            this.send("identity", {data:me, target:data.from});
          }
          break;
        case "identity":
        {
          const user = data.data;
          this.$set(this.people, user.sid,
            {
              id: user.id,
              name: user.name,
              pages: this.people[user.sid].pages,
            });

//          // TODO: smarter, if multi-connect, send to all instances... (several sid's)
//          // Or better: just prevent multi-connect.
//          // Fix anomaly: if registered player multi-connect, should be left only one
//          const anomalies = Object.keys(this.people).filter(sid => this.people[sid].id == user.id);
//          if (anomalies.length == 2)
//            this.$delete(this.people, anomalies[0]);
//          // --> this isn't good, some sid's are just forgetted

          break;
        }
        case "askchallenge":
        {
          // Send my current live challenge (if any)
          const cIdx = this.challenges.findIndex(c =>
            c.from.sid == this.st.user.sid && c.type == "live");
          if (cIdx >= 0)
          {
            const c = this.challenges[cIdx];
            // NOTE: in principle, should only send targeted challenge to the target.
            // But we may not know yet the identity of the target (just name),
            // so cannot decide if data.from is the target or not.
            const myChallenge =
            {
              id: c.id,
              from: this.st.user.sid,
              to: c.to,
              fen: c.fen,
              vid: c.vid,
              cadence: c.cadence,
              added: c.added,
            };
            this.send("challenge", {data:myChallenge, target:data.from});
          }
          break;
        }
        case "challenge": //after "askchallenge"
        case "newchallenge":
        {
          // NOTE about next condition: see "askchallenge" case.
          const chall = data.data;
          if (!chall.to || (this.people[chall.from].id > 0 &&
            (chall.from == this.st.user.sid || chall.to == this.st.user.name)))
          {
            let newChall = Object.assign({}, chall);
            newChall.type = this.classifyObject(chall);
            newChall.added = Date.now();
            let fromValues = Object.assign({}, this.people[chall.from]);
            delete fromValues["pages"]; //irrelevant in this context
            newChall.from = Object.assign({sid:chall.from}, fromValues);
            newChall.vname = this.getVname(newChall.vid);
            this.challenges.push(newChall);
          }
          break;
        }
        case "refusechallenge":
        {
          const cid = data.data;
          ArrayFun.remove(this.challenges, c => c.id == cid);
          alert(this.st.tr["Challenge declined"]);
          break;
        }
        case "deletechallenge":
        {
          // NOTE: the challenge may be already removed
          const cid = data.data;
          ArrayFun.remove(this.challenges, c => c.id == cid);
          break;
        }
        case "game": //individual request
        case "newgame":
        {
          // NOTE: it may be live or correspondance
          const game = data.data;
          if (this.games.findIndex(g => g.id == game.id) < 0)
          {
            let newGame = game;
            newGame.type = this.classifyObject(game);
            newGame.vname = this.getVname(game.vid);
            if (!game.score) //if new game from Hall
              newGame.score = "*";
            this.games.push(newGame);
          }
          break;
        }
        case "startgame":
        {
          // New game just started: data contain all information
          const gameInfo = data.data;
          if (this.classifyObject(gameInfo) == "live")
            this.startNewGame(gameInfo);
          else
          {
            this.infoMessage = this.st.tr["New correspondance game:"] +
              " <a href='#/game/" + gameInfo.id + "'>" +
              "#/game/" + gameInfo.id + "</a>";
            let modalBox = document.getElementById("modalInfo");
            modalBox.checked = true;
            setTimeout(() => { modalBox.checked = false; }, 3000);
          }
          break;
        }
        case "newchat":
          this.newChat = data.data;
          break;
      }
    },
    // Challenge lifecycle:
    newChallenge: async function() {
      if (this.newchallenge.vid == "")
        return alert(this.st.tr["Please select a variant"]);
      if (!!this.newchallenge.to && this.newchallenge.to == this.st.user.name)
        return alert(this.st.tr["Self-challenge is forbidden"]);
      const vname = this.getVname(this.newchallenge.vid);
      const vModule = await import("@/variants/" + vname + ".js");
      window.V = vModule.VariantRules;
      if (!!this.newchallenge.cadence.match(/^[0-9]+$/))
        this.newchallenge.cadence += "+0"; //assume minutes, no increment
      const error = checkChallenge(this.newchallenge);
      if (!!error)
        return alert(error);
      const ctype = this.classifyObject(this.newchallenge);
      if (ctype == "corr" && this.st.user.id <= 0)
        return alert(this.st.tr["Please log in to play correspondance games"]);
      // NOTE: "from" information is not required here
      let chall = Object.assign({}, this.newchallenge);
      const finishAddChallenge = (cid) => {
        chall.id = cid || "c" + getRandString();
        // Remove old challenge if any (only one at a time of a given type):
        const cIdx = this.challenges.findIndex(c =>
          (c.from.sid == this.st.user.sid || c.from.id == this.st.user.id) && c.type == ctype);
        if (cIdx >= 0)
        {
          // Delete current challenge (will be replaced now)
          this.send("deletechallenge", {data:this.challenges[cIdx].id});
          if (ctype == "corr")
          {
            ajax(
              "/challenges",
              "DELETE",
              {id: this.challenges[cIdx].id}
            );
          }
          this.challenges.splice(cIdx, 1);
        }
        this.send("newchallenge", {data:Object.assign({from:this.st.user.sid}, chall)});
        // Add new challenge:
        chall.from = { //decompose to avoid revealing email
          sid: this.st.user.sid,
          id: this.st.user.id,
          name: this.st.user.name,
        };
        chall.added = Date.now();
        // NOTE: vname and type are redundant (can be deduced from cadence + vid)
        chall.type = ctype;
        chall.vname = vname;
        this.challenges.push(chall);
        // Remember cadence  + vid for quicker further challenges:
        localStorage.setItem("cadence", chall.cadence);
        localStorage.setItem("vid", chall.vid);
        document.getElementById("modalNewgame").checked = false;
      };
      if (ctype == "live")
      {
        // Live challenges have a random ID
        finishAddChallenge(null);
      }
      else
      {
        // Correspondance game: send challenge to server
        ajax(
          "/challenges",
          "POST",
          { chall: chall },
          response => { finishAddChallenge(response.cid); }
        );
      }
    },
    clickChallenge: function(c) {
      const myChallenge = (c.from.sid == this.st.user.sid //live
        || (this.st.user.id > 0 && c.from.id == this.st.user.id)); //corr
      if (!myChallenge)
      {
        if (c.type == "corr" && this.st.user.id <= 0)
          return alert(this.st.tr["Please log in to accept corr challenges"]);
        c.accepted = true;
        if (!!c.to) //c.to == this.st.user.name (connected)
        {
          // TODO: if special FEN, show diagram after loading variant
          c.accepted = confirm("Accept challenge?");
        }
        if (c.accepted)
        {
          c.seat = { //again, avoid c.seat = st.user to not reveal email
            sid: this.st.user.sid,
            id: this.st.user.id,
            name: this.st.user.name,
          };
          this.launchGame(c);
        }
        else
        {
          this.send("refusechallenge", {data:c.id, target:c.from.sid});
        }
        this.send("deletechallenge", {data:c.id});
      }
      else //my challenge
      {
        if (c.type == "corr")
        {
          ajax(
            "/challenges",
            "DELETE",
            {id: c.id}
          );
        }
        this.send("deletechallenge", {data:c.id});
      }
      // In all cases, the challenge is consumed:
      ArrayFun.remove(this.challenges, ch => ch.id == c.id);
    },
    // NOTE: when launching game, the challenge is already being deleted
    launchGame: async function(c) {
      const vModule = await import("@/variants/" + c.vname + ".js");
      window.V = vModule.VariantRules;
      // These game informations will be shared
      let gameInfo =
      {
        id: getRandString(),
        fen: c.fen || V.GenRandInitFen(),
        players: shuffle([c.from, c.seat]), //white then black
        vid: c.vid,
        cadence: c.cadence,
      };
      let oppsid = c.from.sid; //may not be defined if corr + offline opp
      if (!oppsid)
      {
        oppsid = Object.keys(this.people).find(sid =>
          this.people[sid].id == c.from.id);
      }
      const notifyNewgame = () => {
        if (!!oppsid) //opponent is online
          this.send("startgame", {data:gameInfo, target:oppsid});
        // Send game info (only if live) to everyone except me in this tab
        this.send("newgame", {data:gameInfo});
      };
      if (c.type == "live")
      {
        notifyNewgame();
        this.startNewGame(gameInfo);
      }
      else //corr: game only on server
      {
        ajax(
          "/games",
          "POST",
          {gameInfo: gameInfo, cid: c.id}, //cid useful to delete challenge
          response => {
            gameInfo.id = response.gameId;
            notifyNewgame();
            this.$router.push("/game/" + response.gameId);
          }
        );
      }
    },
    // NOTE: for live games only (corr games start on the server)
    startNewGame: function(gameInfo) {
      const game = Object.assign({}, gameInfo, {
        // (other) Game infos: constant
        fenStart: gameInfo.fen,
        vname: this.getVname(gameInfo.vid),
        created: Date.now(),
        // Game state (including FEN): will be updated
        moves: [],
        clocks: [-1, -1], //-1 = unstarted
        initime: [0, 0], //initialized later
        score: "*",
      });
      GameStorage.add(game);
      if (this.st.settings.sound >= 1)
        new Audio("/sounds/newgame.mp3").play().catch(err => {});
      this.$router.push("/game/" + gameInfo.id);
    },
  },
};
</script>

<style lang="sass" scoped>
.active
  color: #42a983
#newGame
  display: block
  margin: 10px auto 5px auto
#people
  width: 100%
#players
  width: 50%
  position: relative
  float: left
#chat
  width: 50%
  float: left
  position: relative
@media screen and (max-width: 767px)
  #players, #chats
    width: 100%
#chat > .card
  max-width: 100%
  margin: 0;
  border: none;
#players > p
  margin-left: 5px
.anonymous
  font-style: italic
button.player-action
  margin-left: 32px
</style>
