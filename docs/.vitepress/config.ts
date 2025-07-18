import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ChanneLink',
  description: 'A TypeScript communication library for cross-context communication',
  base: '/channelink/', // GitHub Pages base path
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Core Concepts', link: '/guide/core-concepts' },
          { text: 'PostMessage Endpoint', link: '/guide/postmessage-endpoint' },
          { text: 'Stream Endpoint', link: '/guide/stream-endpoint' },
          { text: 'Remote Objects', link: '/guide/remote-objects' },
          { text: 'Web API Adapters', link: '/guide/web-api-adapters' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/' },
          { text: 'endpoint.ts', link: '/api/endpoint' },
          { text: 'endpointWeb.ts', link: '/api/endpoint-web' },
          { text: 'remoteObject.ts', link: '/api/remote-object' },
          { text: 'Types', link: '/api/types' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Basic Usage', link: '/examples/basic' },
          { text: 'Worker Communication', link: '/examples/worker' },
          { text: 'WebSocket Integration', link: '/examples/websocket' },
          { text: 'WebRTC DataChannel', link: '/examples/webrtc' },
          { text: 'Remote Object RPC', link: '/examples/remote-object' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/mathe42/channelink' }
    ],

    footer: {
      message: 'Released under the MIT License (non-commercial) / Commercial License available.',
      copyright: 'Copyright © 2024 ChanneLink'
    }
  }
})