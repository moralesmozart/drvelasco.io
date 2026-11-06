import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * Link preview (WhatsApp, iMessage, Slack…): Open Graph tags filled from build variables,
 * so no client text or image lives in the repo. Skipped when VITE_SHARE_TITLE is not set.
 * The image defaults to the public "share" bucket: <supabase>/storage/v1/object/public/share/preview.jpg
 */
function sharePreview(env: Record<string, string>): Plugin {
  return {
    name: 'share-preview',
    transformIndexHtml: { order: 'post', handler(html) {
      const title = env.VITE_SHARE_TITLE?.trim()
      if (!title) return html
      const desc = env.VITE_SHARE_DESCRIPTION?.trim() ?? ''
      const image = env.VITE_SHARE_IMAGE?.trim()
        || (env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/share/preview.jpg` : '')
      const site = env.VITE_SHARE_URL?.trim()
      const tags = [
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="${esc(title)}" />`,
        site && `<meta property="og:url" content="${esc(site)}" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        desc && `<meta property="og:description" content="${esc(desc)}" />`,
        desc && `<meta name="description" content="${esc(desc)}" />`,
        image && `<meta property="og:image" content="${esc(image)}" />`,
        image && `<meta property="og:image:secure_url" content="${esc(image)}" />`,
        image && `<meta property="og:image:type" content="image/jpeg" />`,
        image && `<meta name="twitter:image" content="${esc(image)}" />`,
        image && `<meta property="og:image:width" content="1200" />`,
        image && `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
      ].filter(Boolean).join('\n    ')
      // right after <meta charset>: WhatsApp only reads the very top of the page
      return html
        .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${tags}`)
    } },
  }
}

// base './' keeps asset paths relative, so the build works on GitHub Pages under /<repo>/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), sharePreview(loadEnv(mode, process.cwd(), 'VITE_'))],
}))
