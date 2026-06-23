import { createApp } from 'vue';
import App from './App.vue';

import ElementPlus from 'element-plus';
import 'element-plus/theme-chalk/index.css';
// import locale from 'element-plus/lib/locale/lang/en';

const app = createApp(App);
app.use(ElementPlus/*, { locale }*/);
app.mount('#app');