<template lang="pug">
main
  input#modalInfo.modal(type="checkbox")
  div#infoDiv(
    role="dialog"
    data-checkbox="modalInfo"
  )
    .card.text-center
      label.modal-close(for="modalInfo")
      p(v-html="infoMessage")
  input#modalAccept.modal(type="checkbox")
  div#acceptDiv(role="dialog")
    .card.text-center
      p
        span.variantName {{ curChallToAccept.vname }} 
        span {{ curChallToAccept.cadence }} 
        span {{ st.tr["with"] + " " + curChallToAccept.from.name }}
      .diagram(v-html="tchallDiag")
      .button-group#buttonsTchall
        button.acceptBtn(@click="decisionChallenge(true)") {{ st.tr["Accept challenge?"] }}
        button.refuseBtn(@click="decisionChallenge(false)") {{ st.tr["Refuse"] }}
  input#modalNewgame.modal(
    type="checkbox"
    @change="cadenceFocusIfOpened($event)"
  )
  div#newgameDiv(
    role="dialog"
    data-checkbox="modalNewgame"
  )
    .card
      label#closeNewgame.modal-close(for="modalNewgame")
      div(@keyup.enter="newChallenge()")
        fieldset
          label(for="selectVariant") {{ st.tr["Variant"] }} *
          select#selectVariant(
            @change="loadNewchallVariant(trySetNewchallDiag)"
            v-model="newchallenge.vid"
          )
            option(
              v-for="v in st.variants"
              :value="v.id"
              :selected="newchallenge.vid==v.id"
            )
              | {{ v.name }}
        fieldset
          label(for="cadence") {{ st.tr["Cadence"] }} *
          div#predefinedCadences
            button(type="button") 15+5
            button(type="button") 45+30
            button(type="button") 3d
            button(type="button") 7d
          input#cadence(
            type="text"
            v-model="newchallenge.cadence"
            placeholder="5+0, 1h+30s, 5d ..."
          )
        fieldset
          label(for="selectRandomLevel") {{ st.tr["Randomness"] }}
          select#selectRandomLevel(v-model="newchallenge.randomness")
            option(value="0") {{ st.tr["Deterministic"] }}
            option(value="1") {{ st.tr["Symmetric random"] }}
            option(value="2") {{ st.tr["Asymmetric random"] }}
        fieldset(v-if="st.user.id > 0")
          label(for="selectPlayers") {{ st.tr["Play with?"] }}
          input#selectPlayers(
            type="text"
            v-model="newchallenge.to"
          )
        fieldset(v-if="st.user.id > 0 && newchallenge.to.length > 0")
          input#inputFen(
            placeholder="FEN"
            @input="trySetNewchallDiag()"
            type="text"
            v-model="newchallenge.fen"
          )
        .diagram(v-html="newchallenge.diag")
      button(@click="newChallenge()") {{ st.tr["Send challenge"] }}
  input#modalPeople.modal(
    type="checkbox"
    @click="resetSocialColor()"
  )
  div#peopleWrap(
    role="dialog"
    data-checkbox="modalPeople"
  )
    .card
      label.modal-close(for="modalPeople")
      #people
        #players
          p(
            v-for="sid in Object.keys(people)"
            v-if="people[sid].name"
          )
            span {{ people[sid].name }}
            button.player-action(
              v-if="isGamer(sid) || (st.user.id > 0 && sid!=st.user.sid)"
              @click="challOrWatch(sid)"
            )
              | {{ getActionLabel(sid) }}
          p.anonymous @nonymous ({{ anonymousCount }})
        #chat
          Chat(
            :newChat="newChat"
            @mychat="processChat"
            :pastChats="[]"
          )
        .clearer
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button#peopleBtn(onClick="window.doClick('modalPeople')")
          | {{ st.tr["Who's there?"] }}
        button(onClick="window.doClick('modalNewgame')")
          | {{ st.tr["New game"] }}
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      div#div2
        .button-group
          button.tabbtn#btnClive(@click="setDisplay('c','live',$event)")
            | {{ st.tr["Live challenges"] }}
          button.tabbtn#btnCcorr(@click="setDisplay('c','corr',$event)")
            | {{ st.tr["Correspondance challenges"] }}
        ChallengeList(
          v-show="cdisplay=='live'"
          :challenges="filterChallenges('live')"
          @click-challenge="clickChallenge"
        )
        ChallengeList(
          v-show="cdisplay=='corr'"
          :challenges="filterChallenges('corr')"
          @click-challenge="clickChallenge"
        )
      div#div3
        .button-group
          button.tabbtn#btnGlive(@click="setDisplay('g','live',$event)")
            | {{ st.tr["Live games"] }}
          button.tabbtn#btnGcorr(@click="setDisplay('g','corr',$event)")
            | {{ st.tr["Correspondance games"] }}
        GameList(
          v-show="gdisplay=='live'"
          :games="filterGames('live')"
          :showBoth="true"
          @show-game="showGame"
        )
        GameList(
          v-show="gdisplay=='corr'"
          :games="filterGames('corr')"
          :showBoth="true"
          @show-game="showGame"
        )
</template>

<script>
import { store } from "@/store";
import { checkChallenge } from "@/data/challengeCheck";
import { ArrayFun } from "@/utils/array";
import { ajax } from "@/utils/ajax";
import params from "@/parameters";
import { getRandString, shuffle } from "@/utils/alea";
import { getDiagram } from "@/utils/printDiagram";
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
    ChallengeList
  },
  data: function() {
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
        vid: parseInt(localStorage.getItem("vid")) || 0,
        to: "", //name of challenged player (if any)
        cadence: localStorage.getItem("cadence") || "",
        randomness: parseInt(localStorage.getItem("randomness")) || 2,
        // VariantRules object, stored to not interfere with
        // diagrams of targetted challenges:
        V: null,
        vname: "",
        diag: "" //visualizing FEN
      },
      tchallDiag: "",
      curChallToAccept: {from: {}},
      newChat: "",
      conn: null,
      connexionString: "",
      // Related to (killing of) self multi-connects:
      newConnect: {},
      killed: {}
    };
  },
  watch: {
    // st.variants changes only once, at loading from [] to [...]
    "st.variants": function() {
      // Set potential challenges and games variant names:
      this.challenges.concat(this.games).forEach(o => {
        if (o.vname == "") o.vname = this.getVname(o.vid);
      });
      if (!this.newchallenge.V && this.newchallenge.vid > 0)
        this.loadNewchallVariant();
    }
  },
  computed: {
    anonymousCount: function() {
      let count = 0;
      Object.values(this.people).forEach(p => {
        // Do not cound people who did not send their identity yet:
        count += (!p.name && p.id === 0) ? 1 : 0;
      });
      return count;
    }
  },
  created: function() {
    if (this.st.variants.length > 0 && this.newchallenge.vid > 0)
      this.loadNewchallVariant();
    const my = this.st.user;
    this.$set(this.people, my.sid, { id: my.id, name: my.name, pages: ["/"] });
    // Ask server for current corr games (all but mines)
    ajax(
      "/games",
      "GET",
      { uid: this.st.user.id, excluded: true },
      response => {
        this.games = this.games.concat(
          response.games.map(g => {
            const type = this.classifyObject(g);
            const vname = this.getVname(g.vid);
            return Object.assign({}, g, { type: type, vname: vname });
          })
        );
      }
    );
    // Also ask for corr challenges (open + sent by/to me)
    ajax("/challenges", "GET", { uid: this.st.user.id }, response => {
      // Gather all senders names, and then retrieve full identity:
      // (TODO [perf]: some might be online...)
      let names = {};
      response.challenges.forEach(c => {
        if (c.uid != this.st.user.id) names[c.uid] = "";
        else if (!!c.target && c.target != this.st.user.id)
          names[c.target] = "";
      });
      const addChallenges = () => {
        names[this.st.user.id] = this.st.user.name; //in case of
        this.challenges = this.challenges.concat(
          response.challenges.map(c => {
            const from = { name: names[c.uid], id: c.uid }; //or just name
            const type = this.classifyObject(c);
            const vname = this.getVname(c.vid);
            return Object.assign(
              {},
              {
                type: type,
                vname: vname,
                from: from,
                to: c.target ? names[c.target] : ""
              },
              c
            );
          })
        );
      };
      if (Object.keys(names).length > 0) {
        ajax(
          "/users",
          "GET",
          { ids: Object.keys(names).join(",") },
          response2 => {
            response2.users.forEach(u => {
              names[u.id] = u.name;
            });
            addChallenges();
          }
        );
      } else addChallenges();
    });
    const connectAndPoll = () => {
      this.send("connect");
      this.send("pollclientsandgamers");
    };
    // Initialize connection
    this.connexionString =
      params.socketUrl +
      "/?sid=" +
      this.st.user.sid +
      "&tmpId=" +
      getRandString() +
      "&page=" +
      encodeURIComponent(this.$route.path);
    this.conn = new WebSocket(this.connexionString);
    this.conn.onopen = connectAndPoll;
    this.conn.onmessage = this.socketMessageListener;
    this.conn.onclose = this.socketCloseListener;
  },
  mounted: function() {
    ["peopleWrap", "infoDiv", "newgameDiv"].forEach(eltName => {
      let elt = document.getElementById(eltName);
      elt.addEventListener("click", processModalClick);
    });
    document.querySelectorAll("#predefinedCadences > button").forEach(b => {
      b.addEventListener("click", () => {
        this.newchallenge.cadence = b.innerHTML;
      });
    });
    const dispCorr = this.$route.query["disp"];
    const showCtype =
      dispCorr || localStorage.getItem("type-challenges") || "live";
    const showGtype =
      dispCorr || localStorage.getItem("type-games") || "live";
    this.setDisplay("c", showCtype);
    this.setDisplay("g", showGtype);
  },
  beforeDestroy: function() {
    this.send("disconnect");
  },
  methods: {
    // Helpers:
    cadenceFocusIfOpened: function() {
      if (event.target.checked)
        document.getElementById("cadence").focus();
    },
    send: function(code, obj) {
      if (this.conn) {
        this.conn.send(JSON.stringify(Object.assign({ code: code }, obj)));
      }
    },
    getVname: function(vid) {
      const variant = this.st.variants.find(v => v.id == vid);
      // this.st.variants might be uninitialized (variant == null)
      return variant ? variant.name : "";
    },
    filterChallenges: function(type) {
      return this.challenges.filter(c => c.type == type);
    },
    filterGames: function(type) {
      return this.games.filter(g => g.type == type);
    },
    classifyObject: function(o) {
      //challenge or game
      return o.cadence.indexOf("d") === -1 ? "live" : "corr";
    },
    setDisplay: function(letter, type, e) {
      this[letter + "display"] = type;
      localStorage.setItem(
        "type-" + (letter == "c" ? "challenges" : "games"),
        type
      );
      let elt = e
        ? e.target
        : document.getElementById("btn" + letter.toUpperCase() + type);
      elt.classList.add("active");
      elt.classList.remove("somethingnew"); //in case of
      if (elt.previousElementSibling)
        elt.previousElementSibling.classList.remove("active");
      else elt.nextElementSibling.classList.remove("active");
    },
    isGamer: function(sid) {
      return this.people[sid].pages.some(p => p.indexOf("/game/") >= 0);
    },
    getActionLabel: function(sid) {


console.log(this.people[sid]);


      return this.people[sid].pages.some(p => p == "/")
        ? "Challenge"
        : "Observe";
    },
    challOrWatch: function(sid) {
      if (this.people[sid].pages.some(p => p == "/")) {
        // Available, in Hall
        this.newchallenge.to = this.people[sid].name;
        document.getElementById("modalPeople").checked = false;
        window.doClick("modalNewgame");
      } else {
        // In some game, maybe playing maybe not: show a random one
        let gids = [];
        this.people[sid].pages.forEach(p => {
          const matchGid = p.match(/[a-zA-Z0-9]+$/);
          if (matchGid) gids.push(matchGid[0]);
        });
        const gid = gids[Math.floor(Math.random() * gids.length)];
        const game = this.games.find(g => g.id == gid);
        if (game) this.showGame(game);
        else this.$router.push("/game/" + gid); //game vs. me
      }
    },
    showGame: function(g) {
      // NOTE: we are an observer, since only games I don't play are shown here
      // ==> Moves sent by connected remote player(s) if live game
      let url = "/game/" + g.id;
      if (g.type == "live")
        url += "?rid=" + g.rids[Math.floor(Math.random() * g.rids.length)];
      this.$router.push(url);
    },
    resetSocialColor: function() {
      // TODO: this is called twice, once on opening an once on closing
      document.getElementById("peopleBtn").classList.remove("somethingnew");
    },
    processChat: function(chat) {
      this.send("newchat", { data: chat });
    },
    // Messaging center:
    socketMessageListener: function(msg) {
      if (!this.conn) return;
      const data = JSON.parse(msg.data);
      switch (data.code) {
        case "pollclientsandgamers": {
          // Since people can be both in Hall and Game,
          // need to track "askIdentity" requests:
          let identityAsked = {};
          data.sockIds.forEach(s => {
            const page = s.page || "/";
            if (s.sid != this.st.user.sid && !identityAsked[s.sid]) {
              this.send("askidentity", { target: s.sid, page: page });
              identityAsked[s.sid] = true;
            }
            if (!this.people[s.sid])
              // Do not set name or id: identity unknown yet
              this.$set(this.people, s.sid, { pages: [page] });
            else if (this.people[s.sid].pages.indexOf(page) < 0)
              this.people[s.sid].pages.push(page);
            if (!s.page)
              // Peer is in Hall
              this.send("askchallenge", { target: s.sid });
            // Peer is in Game
            else this.send("askgame", { target: s.sid, page: page });
          });
          break;
        }
        case "connect":
        case "gconnect": {
          const page = data.page || "/";
          // NOTE: player could have been polled earlier, but might have logged in then
          // So it's a good idea to ask identity if he was anonymous.
          // But only ask game / challenge if currently disconnected.
          if (!this.people[data.from]) {
            this.$set(this.people, data.from, { pages: [page] });
            if (data.code == "connect")
              this.send("askchallenge", { target: data.from });
            else this.send("askgame", { target: data.from, page: page });
          } else {
            // Append page if not already in list
            if (this.people[data.from].pages.indexOf(page) < 0)
              this.people[data.from].pages.push(page);
          }
          if (!this.people[data.from].name && this.people[data.from].id !== 0) {
            // Identity not known yet
            this.newConnect[data.from] = true; //for self multi-connects tests
            this.send("askidentity", { target: data.from, page: page });
          }
          break;
        }
        case "disconnect":
        case "gdisconnect": {
          // If the user reloads the page twice very quickly (experienced with Firefox),
          // the first reload won't have time to connect but will trigger a "close" event anyway.
          // ==> Next check is required.
          if (!this.people[data.from]) return;
          // Disconnect means no more tmpIds:
          if (data.code == "disconnect") {
            // Remove the live challenge sent by this player:
            ArrayFun.remove(this.challenges, c => c.from.sid == data.from);
          } else {
            // Remove the matching live game if now unreachable
            const gid = data.page.match(/[a-zA-Z0-9]+$/)[0];
            const gidx = this.games.findIndex(g => g.id == gid);
            if (gidx >= 0) {
              const game = this.games[gidx];
              if (
                game.type == "live" &&
                game.rids.length == 1 &&
                game.rids[0] == data.from
              ) {
                this.games.splice(gidx, 1);
              }
            }
          }
          const page = data.page || "/";
          ArrayFun.remove(this.people[data.from].pages, p => p == page);
          if (this.people[data.from].pages.length == 0)
            this.$delete(this.people, data.from);
          break;
        }
        case "killed":
          // I logged in elsewhere:
          this.conn = null;
          alert(this.st.tr["New connexion detected: tab now offline"]);
          break;
        case "askidentity": {
          // Request for identification (TODO: anonymous shouldn't need to reply)
          const me = {
            // Decompose to avoid revealing email
            name: this.st.user.name,
            sid: this.st.user.sid,
            id: this.st.user.id
          };
          this.send("identity", { data: me, target: data.from });
          break;
        }
        case "identity": {
          const user = data.data;
          this.$set(this.people, user.sid, {
            id: user.id,
            name: user.name,
            pages: this.people[user.sid].pages
          });
          if (user.name) {
            // If I multi-connect, kill current connexion if no mark (I'm older)
            if (
              this.newConnect[user.sid] &&
              user.id > 0 &&
              user.id == this.st.user.id &&
              user.sid != this.st.user.sid
            ) {
              if (!this.killed[this.st.user.sid]) {
                this.send("killme", { sid: this.st.user.sid });
                this.killed[this.st.user.sid] = true;
              }
            }
          }
          delete this.newConnect[user.sid];
          break;
        }
        case "askchallenge": {
          // Send my current live challenge (if any)
          const cIdx = this.challenges.findIndex(
            c => c.from.sid == this.st.user.sid && c.type == "live"
          );
          if (cIdx >= 0) {
            const c = this.challenges[cIdx];
            // NOTE: in principle, should only send targeted challenge to the target.
            // But we may not know yet the identity of the target (just name),
            // so cannot decide if data.from is the target or not.
            const myChallenge = {
              id: c.id,
              from: this.st.user.sid,
              to: c.to,
              randomness: c.randomness,
              fen: c.fen,
              vid: c.vid,
              cadence: c.cadence,
              added: c.added
            };
            this.send("challenge", { data: myChallenge, target: data.from });
          }
          break;
        }
        case "challenge": //after "askchallenge"
        case "newchallenge": {
          // NOTE about next condition: see "askchallenge" case.
          const chall = data.data;
          if (
            !chall.to ||
            (this.people[chall.from].id > 0 &&
              (chall.from == this.st.user.sid || chall.to == this.st.user.name))
          ) {
            let newChall = Object.assign({}, chall);
            newChall.type = this.classifyObject(chall);
            newChall.randomness = chall.randomness;
            newChall.added = Date.now();
            let fromValues = Object.assign({}, this.people[chall.from]);
            delete fromValues["pages"]; //irrelevant in this context
            newChall.from = Object.assign({ sid: chall.from }, fromValues);
            newChall.vname = this.getVname(newChall.vid);
            this.challenges.push(newChall);
            if (
              (newChall.type == "live" && this.cdisplay == "corr") ||
              (newChall.type == "corr" && this.cdisplay == "live")
            ) {
              document
                .getElementById("btnC" + newChall.type)
                .classList.add("somethingnew");
            }
          }
          break;
        }
        case "refusechallenge": {
          const cid = data.data;
          ArrayFun.remove(this.challenges, c => c.id == cid);
          alert(this.st.tr["Challenge declined"]);
          break;
        }
        case "deletechallenge": {
          // NOTE: the challenge may be already removed
          const cid = data.data;
          ArrayFun.remove(this.challenges, c => c.id == cid);
          break;
        }
        case "game": //individual request
        case "newgame": {
          // NOTE: it may be live or correspondance
          const game = data.data;
          // Ignore games where I play (corr games)
          if (game.players.every(p =>
            p.sid != this.st.user.sid || p.id != this.st.user.id))
          {
            let locGame = this.games.find(g => g.id == game.id);
            if (!locGame) {
              let newGame = game;
              newGame.type = this.classifyObject(game);
              newGame.vname = this.getVname(game.vid);
              if (!game.score)
                //if new game from Hall
                newGame.score = "*";
              newGame.rids = [game.rid];
              delete newGame["rid"];
              this.games.push(newGame);
              if (
                (newGame.type == "live" && this.gdisplay == "corr") ||
                (newGame.type == "corr" && this.gdisplay == "live")
              ) {
                document
                  .getElementById("btnG" + newGame.type)
                  .classList.add("somethingnew");
              }
            } else {
              // Append rid (if not already in list)
              if (!locGame.rids.includes(game.rid)) locGame.rids.push(game.rid);
            }
          }
          break;
        }
        case "result": {
          let g = this.games.find(g => g.id == data.gid);
          if (g) g.score = data.score;
          break;
        }
        case "startgame": {
          // New game just started: data contain all information
          const gameInfo = data.data;
          if (this.classifyObject(gameInfo) == "live")
            this.startNewGame(gameInfo);
          else {
            this.infoMessage =
              this.st.tr["New correspondance game:"] +
              " <a href='#/game/" +
              gameInfo.id +
              "'>" +
              "#/game/" +
              gameInfo.id +
              "</a>";
            let modalBox = document.getElementById("modalInfo");
            modalBox.checked = true;
          }
          break;
        }
        case "newchat":
          this.newChat = data.data;
          if (!document.getElementById("modalPeople").checked)
            document.getElementById("peopleBtn").classList.add("somethingnew");
          break;
      }
    },
    socketCloseListener: function() {
      if (!this.conn) return;
      this.conn = new WebSocket(this.connexionString);
      this.conn.addEventListener("message", this.socketMessageListener);
      this.conn.addEventListener("close", this.socketCloseListener);
    },
    // Challenge lifecycle:
    loadNewchallVariant: async function(cb) {
      const vname = this.getVname(this.newchallenge.vid);
      const vModule = await import("@/variants/" + vname + ".js");
      this.newchallenge.V = vModule.VariantRules;
      this.newchallenge.vname = vname;
      if (cb)
        cb();
    },
    trySetNewchallDiag: function() {
      if (!this.newchallenge.fen) {
        this.newchallenge.diag = "";
        return;
      }
      // If vid > 0 then the variant is loaded (function above):
      window.V = this.newchallenge.V;
      if (
        this.newchallenge.vid > 0 &&
        this.newchallenge.fen &&
        V.IsGoodFen(this.newchallenge.fen)
      ) {
        const parsedFen = V.ParseFen(this.newchallenge.fen);
        this.newchallenge.diag = getDiagram({
          position: parsedFen.position,
          orientation: V.GetOppCol(parsedFen.turn)
        });
      }
    },
    newChallenge: async function() {
      if (this.newchallenge.cadence.match(/^[0-9]+$/))
        this.newchallenge.cadence += "+0"; //assume minutes, no increment
      const ctype = this.classifyObject(this.newchallenge);
      // TODO: cadence still unchecked so ctype could be wrong...
      let error = "";
      if (!this.newchallenge.vid)
        error = this.st.tr["Please select a variant"];
      else if (ctype == "corr" && this.st.user.id <= 0)
        error = this.st.tr["Please log in to play correspondance games"];
      else if (this.newchallenge.to) {
        if (this.newchallenge.to == this.st.user.name)
          error = this.st.tr["Self-challenge is forbidden"];
        else if (
          ctype == "live" &&
          Object.values(this.people).every(p => p.name != this.newchallenge.to)
        )
          error = this.newchallenge.to + " " + this.st.tr["is not online"];
      }
      if (error) {
        alert(error);
        return;
      }
      window.V = this.newchallenge.V;
      error = checkChallenge(this.newchallenge);
      if (error) {
        alert(error);
        return;
      }
      // NOTE: "from" information is not required here
      let chall = Object.assign({}, this.newchallenge);
      delete chall["V"];
      delete chall["diag"];
      const finishAddChallenge = cid => {
        chall.id = cid || "c" + getRandString();
        // Remove old challenge if any (only one at a time of a given type):
        const cIdx = this.challenges.findIndex(
          c =>
            (c.from.sid == this.st.user.sid || c.from.id == this.st.user.id) &&
            c.type == ctype
        );
        if (cIdx >= 0) {
          // Delete current challenge (will be replaced now)
          this.send("deletechallenge", { data: this.challenges[cIdx].id });
          if (ctype == "corr") {
            ajax("/challenges", "DELETE", { id: this.challenges[cIdx].id });
          }
          this.challenges.splice(cIdx, 1);
        }
        this.send("newchallenge", {
          data: Object.assign({ from: this.st.user.sid }, chall)
        });
        // Add new challenge:
        chall.from = {
          // Decompose to avoid revealing email
          sid: this.st.user.sid,
          id: this.st.user.id,
          name: this.st.user.name
        };
        chall.added = Date.now();
        // NOTE: vname and type are redundant (can be deduced from cadence + vid)
        chall.type = ctype;
        chall.vname = this.newchallenge.vname;
        this.challenges.push(chall);
        // Remember cadence  + vid for quicker further challenges:
        localStorage.setItem("cadence", chall.cadence);
        localStorage.setItem("vid", chall.vid);
        localStorage.setItem("randomness", chall.randomness);
        document.getElementById("modalNewgame").checked = false;
        // Show the challenge if not on current display
        if (
          (ctype == "live" && this.cdisplay == "corr") ||
          (ctype == "corr" && this.cdisplay == "live")
        ) {
          this.setDisplay('c', ctype);
        }
      };
      if (ctype == "live") {
        // Live challenges have a random ID
        finishAddChallenge(null);
      } else {
        // Correspondance game: send challenge to server
        ajax("/challenges", "POST", { chall: chall }, response => {
          finishAddChallenge(response.cid);
        });
      }
    },
    // Callback function after a diagram was showed to accept
    // or refuse targetted challenge:
    decisionChallenge: function(accepted) {
      this.curChallToAccept.accepted = accepted;
      this.finishProcessingChallenge(this.curChallToAccept);
      document.getElementById("modalAccept").checked = false;
    },
    finishProcessingChallenge: function(c) {
      if (c.accepted) {
        c.seat = {
          // Again, avoid c.seat = st.user to not reveal email
          sid: this.st.user.sid,
          id: this.st.user.id,
          name: this.st.user.name
        };
        this.launchGame(c);
      } else {
        this.send("refusechallenge", { data: c.id, target: c.from.sid });
      }
      this.send("deletechallenge", { data: c.id });
    },
    clickChallenge: async function(c) {
      const myChallenge =
        c.from.sid == this.st.user.sid || //live
        (this.st.user.id > 0 && c.from.id == this.st.user.id); //corr
      if (!myChallenge) {
        if (c.type == "corr" && this.st.user.id <= 0) {
          alert(this.st.tr["Please log in to accept corr challenges"]);
          return;
        }
        c.accepted = true;
        const vModule = await import("@/variants/" + c.vname + ".js");
        window.V = vModule.VariantRules;
        if (c.to) {
          // c.to == this.st.user.name (connected)
          if (c.fen) {
            const parsedFen = V.ParseFen(c.fen);
            c.mycolor = V.GetOppCol(parsedFen.turn);
            this.tchallDiag = getDiagram({
              position: parsedFen.position,
              orientation: c.mycolor
            });
            this.curChallToAccept = c;
            document.getElementById("modalAccept").checked = true;
          }
          else {
            if (!confirm(this.st.tr["Accept challenge?"]))
              c.accepted = false;
            this.finishProcessingChallenge(c);
          }
        }
        else
          this.finishProcessingChallenge(c);
      }
      else {
        // My challenge
        if (c.type == "corr") {
          ajax("/challenges", "DELETE", { id: c.id });
        }
        this.send("deletechallenge", { data: c.id });
      }
      // In all cases, the challenge is consumed:
      ArrayFun.remove(this.challenges, ch => ch.id == c.id);
    },
    // NOTE: when launching game, the challenge is already being deleted
    launchGame: function(c) {
      // These game informations will be shared
      let gameInfo = {
        id: getRandString(),
        fen: c.fen || V.GenRandInitFen(c.randomness),
        // White player index 0, black player index 1:
        players: c.mycolor
          ? (c.mycolor == "w" ? [c.seat, c.from] : [c.from, c.seat])
          : shuffle([c.from, c.seat]),
        vid: c.vid,
        cadence: c.cadence
      };
      let oppsid = c.from.sid; //may not be defined if corr + offline opp
      if (!oppsid) {
        oppsid = Object.keys(this.people).find(
          sid => this.people[sid].id == c.from.id
        );
      }
      const notifyNewgame = () => {
        if (oppsid)
          //opponent is online
          this.send("startgame", { data: gameInfo, target: oppsid });
        // Send game info (only if live) to everyone except me in this tab
        this.send("newgame", { data: gameInfo });
      };
      if (c.type == "live") {
        notifyNewgame();
        this.startNewGame(gameInfo);
      } //corr: game only on server
      else {
        ajax(
          "/games",
          "POST",
          { gameInfo: gameInfo, cid: c.id }, //cid useful to delete challenge
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
        score: "*"
      });
      GameStorage.add(game, (err) => {
        // If an error occurred, game is not added: abort
        if (!err) {
          if (this.st.settings.sound)
            new Audio("/sounds/newgame.flac").play().catch(() => {});
          this.$router.push("/game/" + gameInfo.id);
        }
      });
    }
  }
};
</script>

<style lang="sass" scoped>
.active
  color: #42a983

#infoDiv > .card
  padding: 15px 0
  max-width: 430px

#newgameDiv > .card, #acceptDiv > .card
  max-width: 767px
  max-height: 100%

div#peopleWrap > .card
  max-height: 100%

@media screen and (min-width: 1281px)
  div#peopleWrap > .card
    max-width: 66.67%

@media screen and (max-width: 1280px)
  div#peopleWrap > .card
    max-width: 83.33%

@media screen and (max-width: 767px)
  div#peopleWrap > .card
    max-width: 100%

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

.somethingnew
  background-color: #c5fefe !important

.tabbtn
  background-color: #f9faee

button.acceptBtn
  background-color: lightgreen
button.refuseBtn
  background-color: red

#buttonsTchall
  margin-top: 10px

.variantName
  font-weight: bold

.diagram
  margin: 0 auto
  max-width: 400px

#inputFen
  width: 100%

#div2, #div3
  margin-top: 15px
@media screen and (max-width: 767px)
  #div2, #div3
    margin-top: 0
</style>
