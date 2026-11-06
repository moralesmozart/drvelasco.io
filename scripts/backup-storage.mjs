// Downloads every file of the private "attachments" bucket into ./backup/files (used by the backup workflow).
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const supabase = createClient(url, key, { auth: { persistSession: false } })
const bucket = supabase.storage.from('attachments')
let count = 0

async function walk(prefix) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset })
    if (error) throw error
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) { await walk(path); continue } // folder
      const { data: blob, error: err } = await bucket.download(path)
      if (err) throw err
      const out = join('backup', 'files', path)
      await mkdir(dirname(out), { recursive: true })
      await writeFile(out, Buffer.from(await blob.arrayBuffer()))
      count++
    }
    if (data.length < 1000) break
  }
}

await walk('')
console.log(`Downloaded ${count} files`)
