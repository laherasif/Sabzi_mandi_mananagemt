import { Schema, model, Types, Document, ClientSession } from 'mongoose';

/** Atomic counters for invoice / ledger / receipt numbers per business. */
export interface ISequence extends Document {
  businessId: Types.ObjectId;
  key: string;
  value: number;
}

const sequenceSchema = new Schema<ISequence>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  key: { type: String, required: true },
  value: { type: Number, default: 0 },
});

sequenceSchema.index({ businessId: 1, key: 1 }, { unique: true });

export const Sequence = model<ISequence>('Sequence', sequenceSchema);

export async function nextSequence(
  businessId: Types.ObjectId | string,
  key: string,
  session?: ClientSession
): Promise<number> {
  const doc = await Sequence.findOneAndUpdate(
    { businessId, key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, session }
  );
  return doc!.value;
}
