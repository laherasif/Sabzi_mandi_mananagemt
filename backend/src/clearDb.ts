/**
 * Wipe all Mongo collections except users (login auth).
 * Run: npx tsx src/clearDb.ts
 */
import mongoose from 'mongoose'
import { connectDb } from './config/db'
import { User } from './models/User'

/** Collections never deleted */
const KEEP = new Set(['users'])

async function clearDb() {
  await connectDb()

  const usersBefore = await User.countDocuments()
  const sample = await User.find().select('email name role').lean()
  console.log(`Keeping users (${usersBefore}):`, sample.map((u) => u.email).join(', ') || '(none)')

  const collections = await mongoose.connection.db!.listCollections().toArray()
  const names = collections.map((c) => c.name).sort()

  console.log('Collections found:', names.join(', '))

  for (const name of names) {
    if (KEEP.has(name) || name.startsWith('system.')) {
      console.log(`SKIP  ${name}`)
      continue
    }
    const col = mongoose.connection.db!.collection(name)
    const count = await col.countDocuments()
    const result = await col.deleteMany({})
    console.log(`CLEAR ${name}: deleted ${result.deletedCount}/${count}`)
  }

  const usersAfter = await User.countDocuments()
  console.log(`Users remaining: ${usersAfter}`)
  console.log('Done — only auth users kept.')
  process.exit(0)
}

clearDb().catch((e) => {
  console.error(e)
  process.exit(1)
})
