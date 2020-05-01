<template lang="pug">
div
  input#modalBio.modal(type="checkbox")
  div#bioDiv(
    role="dialog"
    data-checkbox="modalBio"
  )
    .card
      div(v-if="st.user.id > 0 && st.user.id == uid")
        h3.section(@click="modeEdit = !modeEdit") Click to edit
        textarea(
          v-if="userBio !== undefined && modeEdit"
          v-model="userBio"
        )
        button#submitBtn(@click="sendBio()") Submit
      div(
        v-if="userBio !== undefined"
        v-html="userBio"
        @click="modeEdit = !modeEdit"
      )
      #dialog.text-center {{ st.tr[infoMsg] }}
  span(
    :class="{ clickable: !!uname }"
    @click="showBio()"
  )
    | {{ uname || "@nonymous" }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
import { processModalClick } from "@/utils/modalClick.js";
export default {
  name: "my-user-bio",
  props: ["uid", "uname"],
  data: function() {
    return {
      st: store.state,
      userBio: undefined,
      infoMsg: "",
      modeEdit: false
    };
  },
  mounted: function() {
    document.getElementById("bioDiv")
      .addEventListener("click", processModalClick);
  },
  methods: {
    showBio: function() {
      if (!this.uname)
        // Anonymous users have no bio:
        return;
      this.infoMsg = "";
      document.getElementById("modalBio").checked = true;
      if (this.userBio === undefined) {
        ajax(
          "/userbio",
          "GET",
          {
            data: { id: this.uid },
            success: (res) => {
              this.userBio = res.bio;
            }
          }
        );
      }
    },
    sendBio: function() {
      ajax(
        "/userbio",
        "PUT",
        {
          data: { bio: this.userBio },
          success: () => {
            this.infoMsg = this.st.tr["Modifications applied!"];
          }
        }
      );
    }
  }
};
</script>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 570px
  max-height: 100%

#submitBtn
  width: 50%
  margin: 0 auto

#dialog
  padding: 5px
  color: blue
</style>
