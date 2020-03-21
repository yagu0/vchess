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
    .card
      p.text-center
        span.variantName {{ curChallToAccept.vname }} 
        span {{ curChallToAccept.cadence }} 
        span {{ st.tr["with"] + " " + curChallToAccept.from.name }}
      .diagram(
        v-if="!!curChallToAccept.fen"
        v-html="tchallDiag"
      )
      .button-group#buttonsTchall(:style="tchallButtonsMargin()")
        button.acceptBtn(@click="decisionChallenge(true)")
          span {{ st.tr["Accept challenge?"] }}
        button.refuseBtn(@click="decisionChallenge(false)")
          span {{ st.tr["Refuse"] }}
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
      div(@keyup.enter="issueNewChallenge()")
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
          label(for="selectRandomLevel") {{ st.tr["Randomness"] }} *
          select#selectRandomLevel(v-model="newchallenge.randomness")
            option(value="0") {{ st.tr["Deterministic"] }}
            option(value="1") {{ st.tr["Symmetric random"] }}
            option(value="2") {{ st.tr["Asymmetric random"] }}
        fieldset
          label(for="memorizeChall") {{ st.tr["Memorize"] }}
          input#memorizeChall(
            type="checkbox"
            v-model="newchallenge.memorize"
          )
        fieldset(v-if="st.user.id > 0")
          label(for="selectPlayers") {{ st.tr["Play with"] }}
          select#selectPlayersInList(
            v-model="newchallenge.to"
            @change="changeChallTarget()"
          )
            option(value="")
            option(
              v-for="p in Object.values(people)"
              :value="p.name"
            )
              | {{ p.name }}
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
      button(@click="issueNewChallenge()") {{ st.tr["Send challenge"] }}
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
            v-if="!!people[sid].name"
          )
            span {{ people[sid].name }}
            button.player-action(
              v-if="isGamer(sid)"
              @click="watchGame(sid)"
            )
              | {{ st.tr["Observe"] }}
            button.player-action(
              v-else-if="isFocusedOnHall(sid)"
              @click="challenge(sid)"
            )
              | {{ st.tr["Challenge"] }}
          p.anonymous @nonymous ({{ anonymousCount() }})
        #chat
          Chat(
            ref="chatcomp"
            @mychat="processChat"
            :pastChats="[]"
          )
        .clearer
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      .button-group
        button#peopleBtn(@click="openModalPeople()")
          | {{ st.tr["Who's there?"] }}
        button(@click="showNewchallengeForm()")
          | {{ st.tr["New game"] }}
  .row(v-if="presetChalls.length > 0")
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      h4.text-center {{ st.tr["Preset challenges"] }}
      table
        thead
          tr
            th {{ st.tr["Variant"] }}
            th {{ st.tr["Cadence"] }}
            th {{ st.tr["Random?"] }}
            th
        tbody
          tr(
            v-for="pc in presetChalls"
            @click="newChallFromPreset(pc)"
          )
            td {{ pc.vname }}
            td {{ pc.cadence }}
            td(:class="getRandomnessClass(pc)")
            td.remove-preset(@click="removePresetChall($event, pc)")
              img(src="/images/icons/delete.svg")
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
        div(v-show="gdisplay=='corr'")
          GameList(
            :games="filterGames('corr')"
            :showBoth="true"
            @show-game="showGame"
          )
          button#loadMoreBtn(
            v-if="hasMore"
            @click="loadMoreCorr()"
          )
            | {{ st.tr["Load more"] }}
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
      // timestamp of last showed (oldest) corr game:
      cursor: Number.MAX_SAFE_INTEGER,
      // hasMore == TRUE: a priori there could be more games to load
      hasMore: true,
      games: [],
      challenges: [],
      people: {},
      infoMessage: "",
      newchallenge: {
        fen: "",
        vid: parseInt(localStorage.getItem("vid")) || 0,
        to: "", //name of challenged player (if any)
        cadence: localStorage.getItem("cadence") || "",
        randomness: parseInt(localStorage.getItem("challRandomness")) || 2,
        // VariantRules object, stored to not interfere with
        // diagrams of targetted challenges:
        V: null,
        vname: "",
        diag: "", //visualizing FEN
        memorize: false //put settings in localStorage
      },
      tchallDiag: "",
      curChallToAccept: {from: {}},
      presetChalls: JSON.parse(localStorage.getItem("presetChalls") || "[]"),
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
        if (!o.vname) o.vname = this.getVname(o.vid);
      });
      if (!this.newchallenge.V && this.newchallenge.vid > 0)
        this.loadNewchallVariant();
    }
  },
  created: function() {
    if (this.st.variants.length > 0 && this.newchallenge.vid > 0)
      this.loadNewchallVariant();
    const my = this.st.user;
    this.$set(
      this.people,
      my.sid,
      {
        id: my.id,
        name: my.name,
        pages: [{ path: "/", focus: true }]
      }
    );
    const connectAndPoll = () => {
      this.send("connect");
      this.send("pollclientsandgamers");
    };
    // Initialize connection
    this.connexionString =
      params.socketUrl +
      "/?sid=" +
      this.st.user.sid +
      "&id=" +
      this.st.user.id +
      "&tmpId=" +
      getRandString() +
      "&page=" +
      // Hall: path is "/" (could be hard-coded as well)
      encodeURIComponent(this.$route.path);
    this.conn = new WebSocket(this.connexionString);
    this.conn.onopen = connectAndPoll;
    this.conn.addEventListener("message", this.socketMessageListener);
    this.conn.addEventListener("close", this.socketCloseListener);
  },
  mounted: function() {
    document.addEventListener('visibilitychange', this.visibilityChange);
    ["peopleWrap", "infoDiv", "newgameDiv"].forEach(eltName => {
      document.getElementById(eltName)
        .addEventListener("click", processModalClick);
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
    this.setDisplay('c', showCtype);
    this.setDisplay('g', showGtype);
    // Ask server for current corr games (all but mines)
    this.loadMoreCorr();
    // Also ask for corr challenges (open + sent by/to me)
    // List them all, because they are not supposed to be that many (TODO?)
    ajax(
      "/challenges",
      "GET",
      {
        data: { uid: this.st.user.id },
        success: (response) => {
          if (
            response.challenges.length > 0 &&
            this.challenges.length == 0 &&
            this.cdisplay == "live"
          ) {
            document
              .getElementById("btnCcorr")
              .classList.add("somethingnew");
          }
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
              {
                data: { ids: Object.keys(names).join(",") },
                success: (response2) => {
                  response2.users.forEach(u => {
                    names[u.id] = u.name;
                  });
                  addChallenges();
                }
              }
            );
          } else addChallenges();
        }
      }
    );
  },
  beforeDestroy: function() {
    document.removeEventListener('visibilitychange', this.visibilityChange);
    this.send("disconnect");
  },
  methods: {
    getRandomnessClass: function(pc) {
      return {
        ["random-" + pc.randomness]: true
      };
    },
    openModalPeople: function() {
      window.doClick("modalPeople");
      document.getElementById("inputChat").focus();
    },
    anonymousCount: function() {
      let count = 0;
      Object.values(this.people).forEach(p => {
        // Do not cound people who did not send their identity yet:
        count += (!p.name && p.id === 0) ? 1 : 0;
      });
      return count;
    },
    visibilityChange: function() {
      // TODO: Use document.hidden? https://webplatform.news/issues/2019-03-27
      this.send(
        document.visibilityState == "visible"
          ? "getfocus"
          : "losefocus"
      );
    },
    partialResetNewchallenge: function() {
      // Reset potential target and custom FEN:
      this.newchallenge.to = "";
      this.newchallenge.fen = "";
      this.newchallenge.diag = "";
      this.newchallenge.memorize = false;
    },
    showNewchallengeForm: function() {
      this.partialResetNewchallenge();
      window.doClick("modalNewgame");
    },
    addPresetChall: function(chall) {
      // Add only if not already existing:
      if (this.presetChalls.some(c =>
        c.vid == chall.vid &&
        c.cadence == chall.cadence &&
        c.randomness == chall.randomness
      )) {
        return;
      }
      const L = this.presetChalls.length;
      this.presetChalls.push({
        index: L,
        vid: chall.vid,
        vname: chall.vname, //redundant, but easier
        cadence: chall.cadence,
        randomness: chall.randomness
      });
      localStorage.setItem("presetChalls", JSON.stringify(this.presetChalls));
    },
    removePresetChall: function(e, pchall) {
      e.stopPropagation();
      const pchallIdx = this.presetChalls.findIndex(pc => pc.index == pchall.index);
      this.presetChalls.splice(pchallIdx, 1);
      localStorage.setItem("presetChalls", JSON.stringify(this.presetChalls));
    },
    tchallButtonsMargin: function() {
      if (!!this.curChallToAccept.fen) return { "margin-top": "10px" };
      return {};
    },
    changeChallTarget: function() {
      if (!this.newchallenge.to) {
        // Reset potential FEN + diagram
        this.newchallenge.fen = "";
        this.newchallenge.diag = "";
      }
    },
    cadenceFocusIfOpened: function() {
      if (event.target.checked)
        document.getElementById("cadence").focus();
    },
    send: function(code, obj) {
      if (!!this.conn) {
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
      // o: challenge or game
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
      if (!!elt.previousElementSibling)
        elt.previousElementSibling.classList.remove("active");
      else elt.nextElementSibling.classList.remove("active");
    },
    isGamer: function(sid) {
      return this.people[sid].pages
        .some(p => p.focus && p.path.indexOf("/game/") >= 0);
    },
    isFocusedOnHall: function(sid) {
      return (
        // This is meant to challenge people, thus the next 2 conditions:
        this.st.user.id > 0 &&
        sid != this.st.user.sid &&
        this.people[sid].pages.some(p => p.path == "/" && p.focus)
      );
    },
    challenge: function(sid) {
      this.partialResetNewchallenge();
      // Available, in Hall
      this.newchallenge.to = this.people[sid].name;
      // TODO: also store target sid to not re-search for it
      document.getElementById("modalPeople").checked = false;
      window.doClick("modalNewgame");
    },
    watchGame: function(sid) {
      // In some game, maybe playing maybe not: show a random one
      let gids = [];
      this.people[sid].pages.forEach(p => {
        if (p.focus) {
          const matchGid = p.path.match(/[a-zA-Z0-9]+$/);
          if (!!matchGid) gids.push(matchGid[0]);
        }
      });
      const gid = gids[Math.floor(Math.random() * gids.length)];
      const game = this.games.find(g => g.id == gid);
      if (!!game) this.showGame(game);
      else this.$router.push("/game/" + gid); //game vs. me
    },
    showGame: function(g) {
      // NOTE: we are an observer, since only games I don't play are shown here
      // ==> Moves sent by connected remote player(s) if live game
      this.$router.push("/game/" + g.id);
    },
    resetSocialColor: function() {
      // TODO: this is called twice, once on opening an once on closing
      document.getElementById("peopleBtn").classList.remove("somethingnew");
    },
    processChat: function(chat) {
      this.send("newchat", { data: chat });
    },
    getOppsid: function(c) {
      let oppsid = c.from.sid; //may not be defined if corr + offline opp
      if (!oppsid) {
        oppsid = Object.keys(this.people).find(
          sid => this.people[sid].id == c.from.id
        );
      }
      return oppsid;
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
          // TODO: shuffling and random filtering on server, if
          // the room is really crowded.
          data.sockIds.forEach(s => {
            const page = s.page || "/";
            if (s.sid != this.st.user.sid && !identityAsked[s.sid]) {
              this.send("askidentity", { target: s.sid, page: page });
              identityAsked[s.sid] = true;
            }
            if (!this.people[s.sid]) {
              // Do not set name or id: identity unknown yet
              this.people[s.sid] = { pages: [{path: page, focus: true}] };
            }
            else if (!(this.people[s.sid].pages.find(p => p.path == page)))
              this.people[s.sid].pages.push({ path: page, focus: true });
            if (!s.page)
              // Peer is in Hall
              this.send("askchallenges", { target: s.sid });
            // Peer is in Game: ask only if live game
            else if (!page.match(/\/[0-9]+$/))
              this.send("askgame", { target: s.sid, page: page });
          });
          break;
        }
        case "connect":
        case "gconnect": {
          const page = data.page || "/";
          if (data.code == "connect") {
            // Ask challenges only on first connexion:
            if (!this.people[data.from])
              this.send("askchallenges", { target: data.from });
          }
          // Ask game only if live:
          else if (!page.match(/\/[0-9]+$/))
            this.send("askgame", { target: data.from, page: page });
          if (!this.people[data.from])
            this.people[data.from] = { pages: [{ path: page, focus: true }] };
          else {
            // Append page if not already in list
            if (!(this.people[data.from].pages.find(p => p.path == page)))
              this.people[data.from].pages.push({ path: page, focus: true });
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
          const page = data.page || "/";
          ArrayFun.remove(this.people[data.from].pages, p => p.path == page);
          if (this.people[data.from].pages.length == 0)
            this.$delete(this.people, data.from);
          // Disconnect means no more tmpIds:
          if (data.code == "disconnect") {
            // Remove the live challenges sent by this player:
            ArrayFun.remove(
              this.challenges,
              c => c.type == "live" && c.from.sid == data.from,
              "all"
            );
          } else {
            // Remove the matching live game if now unreachable
            const gid = page.match(/[a-zA-Z0-9]+$/)[0];
            // Corr games are always reachable:
            if (!gid.match(/^[0-9]+$/)) {
              // Live games are reachable as long as someone is on the game page
              if (Object.values(this.people).every(p =>
                p.pages.every(pg => pg.path != page))) {
                ArrayFun.remove(this.games, g => g.id == gid);
              }
            }
          }
          break;
        }
        case "getfocus":
          // If user reload a page, focus may arrive earlier than connect
          if (!!this.people[data.from]) {
            this.people[data.from].pages
              .find(p => p.path == data.page).focus = true;
            this.$forceUpdate(); //TODO: shouldn't be required
          }
          break;
        case "losefocus":
          if (!!this.people[data.from]) {
            this.people[data.from].pages
              .find(p => p.path == data.page).focus = false;
            this.$forceUpdate(); //TODO: shouldn't be required
          }
          break;
        case "killed":
          // I logged in elsewhere:
          this.conn.removeEventListener("message", this.socketMessageListener);
          this.conn.removeEventListener("close", this.socketCloseListener);
          this.conn = null;
          alert(this.st.tr["New connexion detected: tab now offline"]);
          break;
        case "askidentity": {
          // Request for identification
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
          let player = this.people[user.sid];
          // player.pages is already set
          player.id = user.id;
          player.name = user.name;
          // TODO: this.$set(people, ...) fails. So forceUpdate.
          //       But this shouldn't be like that!
          this.$forceUpdate();
          // If I multi-connect, kill current connexion if no mark (I'm older)
          if (this.newConnect[user.sid]) {
            if (
              user.id > 0 &&
              user.id == this.st.user.id &&
              user.sid != this.st.user.sid &&
              !this.killed[this.st.user.sid]
            ) {
                this.send("killme", { sid: this.st.user.sid });
                this.killed[this.st.user.sid] = true;
            }
            delete this.newConnect[user.sid];
          }
          break;
        }
        case "askchallenges": {
          // Send my current live challenges (if any)
          const myChallenges = this.challenges
            .filter(c =>
              c.from.sid == this.st.user.sid && c.type == "live"
            )
            .map(c => {
              // NOTE: in principle, should only send targeted challenge to the target.
              // But we may not know yet the identity of the target (just name),
              // so cannot decide if data.from is the target or not.
              return {
                id: c.id,
                from: this.st.user.sid,
                to: c.to,
                randomness: c.randomness,
                fen: c.fen,
                vid: c.vid,
                cadence: c.cadence,
                added: c.added
              };
            });
          if (myChallenges.length > 0)
            this.send("challenges", { data: myChallenges, target: data.from });
          break;
        }
        case "challenges": //after "askchallenges"
          data.data.forEach(this.addChallenge);
          break;
        case "newchallenge":
          this.addChallenge(data.data);
          break;
        case "refusechallenge": {
          const cid = data.data;
          ArrayFun.remove(this.challenges, c => c.id == cid);
          alert(this.st.tr["Challenge declined"]);
          break;
        }
        case "deletechallenge_s": {
          // NOTE: the challenge(s) may be already removed
          const cref = data.data;
          if (!!cref.cid) ArrayFun.remove(this.challenges, c => c.id == cref.cid);
          else if (!!cref.sids) {
            cref.sids.forEach(s => {
              ArrayFun.remove(
                this.challenges,
                c => c.type == "live" && c.from.sid == s,
                "all"
              );
            });
          }
          break;
        }
        case "game": // Individual request
        case "newgame": {
          const game = data.data;
          // Ignore games where I play (will go in MyGames page),
          // and also games that I already received.
          if (
            game.players.every(p =>
              p.sid != this.st.user.sid && p.id != this.st.user.id) &&
            this.games.findIndex(g => g.id == game.id) == -1
          ) {
            let newGame = game;
            newGame.type = this.classifyObject(game);
            newGame.vname = this.getVname(game.vid);
            if (!game.score)
              // New game from Hall
              newGame.score = "*";
            this.games.push(newGame);
            if (
              (newGame.type == "live" && this.gdisplay == "corr") ||
              (newGame.type == "corr" && this.gdisplay == "live")
            ) {
              document
                .getElementById("btnG" + newGame.type)
                .classList.add("somethingnew");
            }
          }
          break;
        }
        case "result": {
          let g = this.games.find(g => g.id == data.gid);
          if (!!g) g.score = data.score;
          break;
        }
        case "startgame": {
          // New game just started, I'm involved
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
            document.getElementById("modalInfo").checked = true;
          }
          break;
        }
        case "newchat":
          this.$refs["chatcomp"].newChat(data.data);
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
    loadMoreCorr: function() {
      ajax(
        "/observedgames",
        "GET",
        {
          data: {
            uid: this.st.user.id,
            cursor: this.cursor
          },
          success: (res) => {
            const L = res.games.length;
            if (L > 0) {
              if (
                this.cursor == Number.MAX_SAFE_INTEGER &&
                this.games.length == 0 &&
                this.gdisplay == "live"
              ) {
                // First loading: show indicators
                document
                  .getElementById("btnGcorr")
                  .classList.add("somethingnew");
              }
              this.cursor = res.games[L - 1].created;
              let moreGames = res.games.map(g => {
                const vname = this.getVname(g.vid);
                return Object.assign(
                  {},
                  g,
                  {
                    type: "corr",
                    vname: vname
                  }
                );
              });
              this.games = this.games.concat(moreGames);
            } else this.hasMore = false;
          }
        }
      );
    },
    // Challenge lifecycle:
    addChallenge: function(chall) {
      // NOTE about next condition: see "askchallenges" case.
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
    },
    loadNewchallVariant: async function(cb) {
      const vname = this.getVname(this.newchallenge.vid);
      await import("@/variants/" + vname + ".js")
      .then((vModule) => {
        window.V = vModule[vname + "Rules"];
        this.newchallenge.V = window.V;
        this.newchallenge.vname = vname;
        if (!!cb) cb();
      });
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
        !!this.newchallenge.fen &&
        V.IsGoodFen(this.newchallenge.fen)
      ) {
        const parsedFen = V.ParseFen(this.newchallenge.fen);
        this.newchallenge.diag = getDiagram({
          position: parsedFen.position,
          orientation: parsedFen.turn
        });
      } else this.newchallenge.diag = "";
    },
    newChallFromPreset(pchall) {
      this.partialResetNewchallenge();
      this.newchallenge.vid = pchall.vid;
      this.newchallenge.cadence = pchall.cadence;
      this.newchallenge.randomness = pchall.randomness;
      this.loadNewchallVariant(this.issueNewChallenge);
    },
    issueNewChallenge: async function() {
      if (!!(this.newchallenge.cadence.match(/^[0-9]+$/)))
        this.newchallenge.cadence += "+0"; //assume minutes, no increment
      const ctype = this.classifyObject(this.newchallenge);
      // TODO: cadence still unchecked so ctype could be wrong...
      let error = "";
      if (!this.newchallenge.vid)
        error = this.st.tr["Please select a variant"];
      else if (ctype == "corr" && this.st.user.id <= 0)
        error = this.st.tr["Please log in to play correspondance games"];
      else if (!!this.newchallenge.to) {
        if (this.newchallenge.to == this.st.user.name)
          error = this.st.tr["Self-challenge is forbidden"];
        else if (
          ctype == "live" &&
          Object.values(this.people).every(p => p.name != this.newchallenge.to)
        ) {
          error = this.newchallenge.to + " " + this.st.tr["is not online"];
        }
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
      // Add only if not already issued (not counting target or FEN):
      if (this.challenges.some(c =>
        (c.from.sid == this.st.user.sid || c.from.id == this.st.user.id) &&
        c.vid == chall.vid &&
        c.cadence == chall.cadence &&
        c.randomness == chall.randomness
      )) {
        alert(this.st.tr["Challenge already exists"]);
        return;
      }
      if (this.newchallenge.memorize) this.addPresetChall(this.newchallenge);
      delete chall["V"];
      delete chall["diag"];
      const finishAddChallenge = cid => {
        chall.id = cid || "c" + getRandString();
        const MAX_ALLOWED_CHALLS = 3;
        // Remove oldest challenge if 3 found: only 3 at a time of a given type
        let countMyChalls = 0;
        let challToDelIdx = 0;
        let oldestAdded = Number.MAX_SAFE_INTEGER;
        for (let i=0; i<this.challenges.length; i++) {
          const c = this.challenges[i];
          if (
            c.type == ctype &&
            (c.from.sid == this.st.user.sid || c.from.id == this.st.user.id)
          ) {
            countMyChalls++;
            if (c.added < oldestAdded) {
              challToDelIdx = i;
              oldestAdded = c.added;
            }
          }
        }
        if (countMyChalls >= MAX_ALLOWED_CHALLS) {
          this.send(
            "deletechallenge_s",
            { data: { cid: this.challenges[challToDelIdx].id } }
          );
          if (ctype == "corr") {
            ajax(
              "/challenges",
              "DELETE",
              { data: { id: this.challenges[challToDelIdx].id } }
            );
          }
          this.challenges.splice(challToDelIdx, 1);
        }
        this.send("newchallenge", {
          data: Object.assign({ from: this.st.user.sid }, chall)
        });
        // Add new challenge:
        chall.from = {
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
        localStorage.setItem("challRandomness", chall.randomness);
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
        ajax(
          "/challenges",
          "POST",
          {
            data: { chall: chall },
            success: (response) => {
              finishAddChallenge(response.id);
            }
          }
        );
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
          sid: this.st.user.sid,
          id: this.st.user.id,
          name: this.st.user.name
        };
        this.launchGame(c);
        if (c.type == "live")
          // Remove all live challenges of both players
          this.send("deletechallenge_s", { data: { sids: [c.from.sid, c.seat.sid] } });
        else
          // Corr challenge: just remove the challenge
          this.send("deletechallenge_s", { data: { cid: c.id } });
      } else {
        const oppsid = this.getOppsid(c);
        if (!!oppsid)
          this.send("refusechallenge", { data: c.id, target: oppsid });
        if (c.type == "corr") {
          ajax(
            "/challenges",
            "DELETE",
            { data: { id: c.id } }
          );
        }
        this.send("deletechallenge_s", { data: { cid: c.id } });
      }
    },
    // TODO: if several players click same challenge at the same time: problem
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
        await import("@/variants/" + c.vname + ".js")
        .then((vModule) => {
          window.V = vModule[c.vname + "Rules"];
          if (!!c.to) {
            // c.to == this.st.user.name (connected)
            if (!!c.fen) {
              const parsedFen = V.ParseFen(c.fen);
              c.mycolor = V.GetOppCol(parsedFen.turn);
              this.tchallDiag = getDiagram({
                position: parsedFen.position,
                orientation: c.mycolor
              });
            }
            this.curChallToAccept = c;
            document.getElementById("modalAccept").checked = true;
          }
          else this.finishProcessingChallenge(c);
        });
      }
      else {
        // My challenge
        if (c.type == "corr") {
          ajax(
            "/challenges",
            "DELETE",
            { data: { id: c.id } }
          );
        }
        this.send("deletechallenge_s", { data: { cid: c.id } });
      }
      // In all cases, the challenge is consumed:
      ArrayFun.remove(this.challenges, ch => ch.id == c.id);
    },
    // NOTE: when launching game, the challenge is already being deleted
    launchGame: function(c) {
      // White player index 0, black player index 1:
      const players =
        !!c.mycolor
          ? (c.mycolor == "w" ? [c.seat, c.from] : [c.from, c.seat])
          : shuffle([c.from, c.seat]);
      // These game informations will be shared
      let gameInfo = {
        id: getRandString(),
        fen: c.fen || V.GenRandInitFen(c.randomness),
        randomness: c.randomness, //for rematch
        players: players,
        vid: c.vid,
        cadence: c.cadence
      };
      const notifyNewgame = () => {
        const oppsid = this.getOppsid(c);
        if (!!oppsid)
          // Opponent is online
          this.send("startgame", { data: gameInfo, target: oppsid });
        // If new corr game, notify Hall (except opponent and me)
        if (c.type == "corr") {
          this.send(
            "newgame",
            {
              data: gameInfo,
              excluded: [this.st.user.sid, oppsid]
            }
          );
        }
        // Notify MyGames page:
        this.send(
          "notifynewgame",
          {
            data: gameInfo,
            targets: gameInfo.players
          }
        );
        // NOTE: no need to send the game to the room, since I'll connect
        // on game just after, the main Hall will be notified.
      };
      if (c.type == "live") {
        notifyNewgame();
        this.startNewGame(gameInfo);
      } else {
        // corr: game only on server
        ajax(
          "/games",
          "POST",
          {
            // cid is useful to delete the challenge:
            data: {
              gameInfo: gameInfo,
              cid: c.id
            },
            success: (response) => {
              gameInfo.id = response.id;
              notifyNewgame();
              this.$router.push("/game/" + response.id);
            }
          }
        );
      }
    },
    // NOTE: for live games only (corr games start on the server)
    startNewGame: function(gameInfo) {
      const game = Object.assign(
        {},
        gameInfo,
        {
          // (other) Game infos: constant
          fenStart: gameInfo.fen,
          vname: this.getVname(gameInfo.vid),
          created: Date.now(),
          // Game state (including FEN): will be updated
          moves: [],
          clocks: [-1, -1], //-1 = unstarted
          score: "*"
        }
      );
      setTimeout(
        () => {
          GameStorage.add(game, (err) => {
            // If an error occurred, game is not added: a tab already
            // added the game. Maybe a focused one, maybe not.
            // We know for sure that it emitted the gong start sound.
            // ==> Do not play it again.
            if (!err && this.st.settings.sound)
              new Audio("/sounds/newgame.flac").play().catch(() => {});
            this.$router.push("/game/" + gameInfo.id);
          });
        },
        document.hidden ? 500 + 1000 * Math.random() : 0
      );
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
  // margin-top set dynamically (depends if diagram showed or not)
  & > button > span
    width: 100%
    text-align: center

.variantName
  font-weight: bold

.diagram
  margin: 0 auto
  max-width: 400px
  // width: 100% required for Firefox
  width: 100%

#inputFen
  width: 100%

#div2, #div3
  margin-top: 15px
@media screen and (max-width: 767px)
  #div2, #div3
    margin-top: 0

tr > td
  &.random-0
    background-color: #FF5733
  &.random-1
    background-color: #2B63B4
  &.random-2
    background-color: #33B42B

@media screen and (max-width: 767px)
  h4
    margin: 5px 0

button#loadMoreBtn
  display: block
  margin: 0 auto

td.remove-preset
  background-color: lightgrey
  text-align: center
  & > img
    height: 1em
</style>
