import { createRouter, createWebHashHistory } from 'vue-router'
import GameView from '../views/GameView.vue'
import HomeView from '../views/HomeView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/game/:id',
      name: 'game',
      props: true,
      component: GameView,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      props: { id: '' },
      component: GameView,
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
