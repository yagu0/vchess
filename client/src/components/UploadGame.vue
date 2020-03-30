<template lang="pug">
div
  input#upload(type="file" @change="upload")
  button#uploadBtn(
    @click="uploadTrigger()"
    aria-label="store.state.tr['Upload a game']"
  )
    img.inline(src="/images/icons/upload.svg")
</template>

<script>
export default {
  name: "my-upload-game",
  methods: {
    uploadTrigger: function() {
		  document.getElementById("upload").click();
		},
		upload: function(e) {
			const file = (e.target.files || e.dataTransfer.files)[0];
			var reader = new FileReader();
			reader.onloadend = ev => {
				this.parseAndEmit(ev.currentTarget.result);
			};
			reader.readAsText(file);
		},
    parseAndEmit: function(pgn) {
      // TODO: header gives game Info, third secton the moves
      let game = {};
      // mark sur ID pour dire import : I_
      this.$emit("game-uploaded", game);
    }
  }
};
</script>

<style lang="sass" scoped>
input#upload
  display: none

img.inline
  height: 22px
  @media screen and (max-width: 767px)
    height: 18px
</style>
