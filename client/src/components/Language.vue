<template lang="pug">
div
  -
    var langName = {
      "en": "English",
      "es": "Español",
      "fr": "Français",
    };
  input#modalLang.modal(type="checkbox")
  div(role="dialog")
    #language.card
      label.modal-close(for="modalLang")
      form
        fieldset
          label(for="langSelect") {{ $tr["Language"] }}
          select#langSelect
            each language,langCode in langName
              option(value=langCode selected=(lang==langCode))
                =language
</template>

<script>
export default {
  name: "Language",
	methods: {
    // Used both on index and variant page, to switch language
    setLanguage: function(e) {
      localStorage["lang"] = e.target.value;
      this.$lang = e.target.value;
    },
	},
};
</script>
