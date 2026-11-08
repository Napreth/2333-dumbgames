import { createApp, shallowRef } from 'vue'
import App from './App.vue'
import { router } from './app/router'
import { detectPlatform } from './core/platform/detect'
import { platformKey } from './core/platform/types'
import type { PlatformCapabilities } from './core/platform/types'
import './styles/global.css'

const platform = shallowRef<PlatformCapabilities>({})

createApp(App).use(router).provide(platformKey, platform).mount('#app')

void detectPlatform().then((capabilities) => {
  platform.value = capabilities
})
