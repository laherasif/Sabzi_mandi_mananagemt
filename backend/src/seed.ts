/**
 * Seed login user only (no dummy masters).
 * Run: npx tsx src/seed.ts
 */
import { connectDb } from './config/db'
import { User } from './models/User'

async function seed() {
  await connectDb()

  const email = 'owner@shop.com'
  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({
      name: 'Shop Owner',
      email,
      password: '1234',
      role: 'owner',
    })
    console.log('User created:', email, '/ 1234')
  } else {
    console.log('User already exists:', email)
  }

  console.log('Seed complete (no dummy parties/products/marfat)')
  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
