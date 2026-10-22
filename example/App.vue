<template>
  <div id="app">
    <nav>
      <button @click="tab = 'tools'">MCP / Agent</button>
      <button @click="tab = 'subscription'">Subscription</button>
    </nav>
    <ToolParameters v-if="tab === 'tools'" />
    <Subscription v-else />
  </div>
</template>

<script setup>
import Subscription from './components/Subscription.vue';
import ToolParameters from './components/ToolParameters.vue';
import { ref } from 'vue';
const tab = ref('tools');
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
