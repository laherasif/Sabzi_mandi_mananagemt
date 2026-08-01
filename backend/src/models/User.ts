import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 4, select: false },
    role: { type: String, enum: ['owner', 'staff'], default: 'owner' },
  },
  { timestamps: true }
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = function comparePassword(plain: string) {
  return bcrypt.compare(plain, this.password)
}

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId
  comparePassword(plain: string): Promise<boolean>
}

export const User = mongoose.model('User', userSchema)
