import { createApp, h } from 'vue'
import GameView from './app/views/GameView.vue'
import HomeView from './app/views/HomeView.vue'
import { getGame } from './core/game/registry'
import SiteLayout from './SiteLayout.vue'
import './styles/global.css'

const root = document.querySelector<HTMLElement>('#app')!
const id = root.dataset.game
createApp({
  render: () => h(SiteLayout, { home: id === undefined, game: id ? getGame(id) : undefined }, {
    default: () => id === undefined ? h(HomeView) : h(GameView, { id }),
  }),
}).mount(root)
