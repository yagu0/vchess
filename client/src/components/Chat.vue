<template lang="pug">
div
  button(@click="clearHistory()")
    | {{ st.tr["Clear history"] }}
  input#inputChat(
    type="text"
    :placeholder="st.tr['Chat here']"
    @keyup.enter="sendChat()"
  )
  button(@click="sendChat()") {{ st.tr["Send"] }}
  p(v-for="chat in chats.concat(pastChats)")
    span.name {{ chat.name || "@nonymous" }} :&nbsp;
    span(
      :class="classObject(chat)"
      v-html="chat.msg"
    )
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-chat",
  // Prop 'pastChats' for corr games where chats are on server
  props: ["players", "pastChats"],
  data: function() {
    return {
      st: store.state,
      chats: [] //chat messages after human game
    };
  },
  methods: {
    classObject: function(chat) {
      return {
        "my-chatmsg": (
          !!chat.name && chat.name == this.st.user.name ||
          !!chat.sid && chat.sid == this.st.user.sid
        ),
        "opp-chatmsg":
          !!this.players &&
          this.players.some(
            p => {
              return (
                (
                  !!p.name &&
                  p.name == chat.name &&
                  p.name != this.st.user.name
                )
                ||
                (
                  !!p.sid &&
                  p.sid == chat.sid &&
                  p.sid != this.st.user.sid
                )
              );
            }
          )
      };
    },
    sendChat: function() {
      let chatInput = document.getElementById("inputChat");
      const chatTxt = chatInput.value.trim();
      chatInput.focus(); //required on smartphones
      if (chatTxt == "") return; //nothing to send
      chatInput.value = "";
      const chat = {
        msg: chatTxt,
        name: this.st.user.name,
        // SID is required only for anonymous users (in live games)
        sid: this.st.user.id == 0 ? this.st.user.sid : null
      };
      this.$emit("mychat", chat);
      this.chats.unshift(chat);
    },
    newChat: function(chat) {
      if (chat.msg != "") this.chats.unshift(chat);
    },
    clearHistory: function() {
      this.chats = [];
      this.$emit("chatcleared");
    }
  }
};
</script>

<style lang="sass" scoped>
.name
  color: #839192

.my-chatmsg
  color: #6c3483
.opp-chatmsg
  color: #1f618d
</style>
