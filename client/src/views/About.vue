<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      p TODO: give github URL, tell website story...
      a(href="https://github.com/yagu0/vchess") contribute...
</template>

<style lang="sass">
.warn
  padding: 3px
  color: red
  background-color: lightgrey
  font-weight: bold

p.boxed
  background-color: #FFCC66
  padding: 5px

.stageDelimiter
  color: purple

.section-title
  padding: 0

.section-title > h4
  padding: 5px

ol, ul:not(.browser-default)
  padding-left: 20px

ul:not(.browser-default)
  margin-top: 5px

ul:not(.browser-default) > li
  list-style-type: disc
</style>
