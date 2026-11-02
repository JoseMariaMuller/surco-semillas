import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Las redes sociales exigen URLs absolutas en og:image y og:url.
 * SITE_URL la define el workflow de GitHub Pages; en Vercel sale de la URL de producción.
 * Sin ninguna de las dos (por ejemplo en local), queda una ruta relativa.
 */
function siteUrl() {
  const raw =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  if (!raw) return './'
  return raw.endsWith('/') ? raw : `${raw}/`
}

const siteUrlPlugin = () => ({
  name: 'surco-site-url',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => {
      const url = siteUrl()
      // og:url relativo no sirve: sin URL conocida, se omite.
      const out = url === './' ? html.replace(/\s*<meta property="og:url"[^>]*>/, '') : html
      return out.replaceAll('%SITE_URL%', url)
    },
  },
})

export default defineConfig({
  base: './',
  plugins: [react(), siteUrlPlugin()],
  build: {
    // three.js ocupa ~700 KB sin comprimir y va en un chunk diferido (React.lazy),
    // así que el aviso por defecto de 500 KB no aporta. El total sigue < 450 KB gzip.
    chunkSizeWarningLimit: 1100,
  },
})
