import mongoose, { Schema } from 'mongoose'

const counterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

export const Counter = mongoose.model('Counter', counterSchema)

/** Peek next number without consuming it (for form display). */
export async function peekSeq(key: string, start = 1) {
  const doc = await Counter.findOne({ key }).lean()
  if (!doc) return start
  return Math.max(start, Number(doc.seq) + 1)
}

/** Atomically consume next number in series. */
export async function nextSeq(key: string, start = 1) {
  const existing = await Counter.findOne({ key })
  if (!existing) {
    const created = await Counter.create({ key, seq: start })
    return created.seq
  }
  existing.seq = Math.max(existing.seq + 1, start)
  await existing.save()
  return existing.seq
}

/** After using a client-provided invoice, keep counter ahead of it. */
export async function bumpSeqAtLeast(key: string, atLeast: number) {
  if (!Number.isFinite(atLeast) || atLeast < 1) return
  const doc = await Counter.findOne({ key })
  if (!doc) {
    await Counter.create({ key, seq: atLeast })
    return
  }
  if (Number(doc.seq) < atLeast) {
    doc.seq = atLeast
    await doc.save()
  }
}
