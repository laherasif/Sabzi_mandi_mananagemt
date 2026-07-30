import { ClientSession, Types } from 'mongoose';
import { Party, PartyType } from '../models/Party';
import { LedgerEntry } from '../models/LedgerEntry';
import { nextSequence } from '../models/Sequence';
import { ApiError } from '../utils/ApiError';
import { assertPaisa } from '../utils/money';
import { parsePagination, paginationMeta } from '../utils/pagination';

export async function listParties(
  businessId: string,
  query: { page?: string; limit?: string; sort?: string; search?: string; type?: string }
) {
  const { page, limit, skip, sort, search } = parsePagination(query);
  const filter: Record<string, unknown> = { businessId, isDeleted: false };
  if (query.type) filter.type = query.type;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { nameUrdu: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Party.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Party.countDocuments(filter),
  ]);

  return { items, meta: paginationMeta(total, page, limit) };
}

export async function getParty(businessId: string, id: string) {
  const party = await Party.findOne({ _id: id, businessId, isDeleted: false });
  if (!party) throw ApiError.notFound('Party not found');
  return party;
}

export async function createParty(
  businessId: string,
  userId: string,
  data: {
    type: PartyType;
    name: string;
    nameUrdu?: string;
    phone?: string;
    phoneAlt?: string;
    address?: string;
    city?: string;
    cnic?: string;
    openingBalancePaisa?: number;
    creditLimitPaisa?: number;
    notes?: string;
  }
) {
  const opening = assertPaisa(data.openingBalancePaisa ?? 0, 'openingBalancePaisa');
  const isPayableParty =
    data.type === 'supplier' || data.type === 'transporter' || data.type === 'labour';
  const cachedBalance =
    opening === 0 ? 0 : isPayableParty ? -Math.abs(opening) : Math.abs(opening);

  // Sequential writes work on standalone MongoDB.
  // Invoice confirm (M2+) will use session.withTransaction on a replica set.
  const party = await Party.create({
    ...data,
    businessId,
    openingBalancePaisa: opening,
    balancePaisa: cachedBalance,
    openingBalanceLocked: opening !== 0,
    createdBy: userId,
  });

  if (opening !== 0) {
    try {
      await createOpeningLedger(businessId, party._id, party.type, opening, userId);
    } catch (err) {
      await Party.deleteOne({ _id: party._id });
      throw err;
    }
  }

  return Party.findById(party._id);
}

/**
 * Opening balance convention:
 * - Customers/agents: positive openingBalancePaisa = receivable (they owe us) → Debit
 * - Suppliers/transporters/labour: positive openingBalancePaisa = payable (we owe them) → Credit
 *   Cached Party.balancePaisa is always "party owes us" (negative when we owe them).
 */
async function createOpeningLedger(
  businessId: string | Types.ObjectId,
  partyId: Types.ObjectId,
  type: PartyType,
  openingPaisa: number,
  userId: string,
  session?: ClientSession
) {
  const seq = await nextSequence(businessId, 'ledger', session);
  const entryNo = `LED-${String(seq).padStart(6, '0')}`;
  const amount = Math.abs(openingPaisa);
  const isPayableParty = type === 'supplier' || type === 'transporter' || type === 'labour';

  const debitPaisa = isPayableParty ? 0 : amount;
  const creditPaisa = isPayableParty ? amount : 0;
  const balanceAfter = isPayableParty ? -amount : amount;

  await LedgerEntry.create(
    [
      {
        businessId,
        partyId,
        date: new Date(),
        entryNo,
        refType: 'opening',
        description: 'Opening balance',
        debitPaisa,
        creditPaisa,
        balanceAfterPaisa: balanceAfter,
        createdBy: userId,
      },
    ],
    session ? { session } : undefined
  );

  await Party.updateOne(
    { _id: partyId },
    { $set: { balancePaisa: balanceAfter } },
    session ? { session } : undefined
  );
}

export async function updateParty(
  businessId: string,
  id: string,
  data: Record<string, unknown>
) {
  const party = await Party.findOneAndUpdate(
    { _id: id, businessId, isDeleted: false },
    { $set: data },
    { new: true }
  );
  if (!party) throw ApiError.notFound('Party not found');
  return party;
}

export async function softDeleteParty(businessId: string, id: string, userId: string) {
  const party = await Party.findOneAndUpdate(
    { _id: id, businessId, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId, isActive: false } },
    { new: true }
  );
  if (!party) throw ApiError.notFound('Party not found');
  return party;
}

export async function getPartyLedger(
  businessId: string,
  partyId: string,
  query: { from?: string; to?: string; page?: string; limit?: string }
) {
  await getParty(businessId, partyId);
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = { businessId, partyId };
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) (filter.date as Record<string, Date>).$gte = new Date(query.from);
    if (query.to) (filter.date as Record<string, Date>).$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    LedgerEntry.find(filter).sort({ date: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
    LedgerEntry.countDocuments(filter),
  ]);

  return { items, meta: paginationMeta(total, page, limit) };
}
