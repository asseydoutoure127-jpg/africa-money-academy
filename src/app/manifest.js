// Fichier qui permet d'installer le site comme une application sur le téléphone.
export default function manifest() {
  return {
    name: 'Waypoint',
    short_name: 'Waypoint',
    description: 'Formations en français pour apprendre à gagner de l’argent, pas à pas, depuis votre téléphone.',
    lang: 'fr',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    background_color: '#1b2a5c',
    theme_color: '#1b2a5c',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Mon espace', url: '/espace' },
      { name: 'Formations', url: '/formations' },
      { name: 'Parrainage', url: '/parrainage' },
    ],
  };
}
