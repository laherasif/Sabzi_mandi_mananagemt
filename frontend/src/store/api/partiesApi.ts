import { baseApi, type ApiEnvelope } from './baseApi'

export interface Party {
  _id: string
  type: 'customer' | 'supplier' | 'agent' | 'transporter' | 'labour'
  name: string
  nameUrdu?: string
  phone?: string
  address?: string
  city?: string
  openingBalancePaisa: number
  balancePaisa: number
  creditLimitPaisa: number
  isActive: boolean
}

export interface CreatePartyBody {
  type: Party['type']
  name: string
  nameUrdu?: string
  phone?: string
  address?: string
  city?: string
  openingBalancePaisa?: number
  creditLimitPaisa?: number
  notes?: string
}

export const partiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listParties: builder.query<
      ApiEnvelope<Party[]>,
      { search?: string; type?: string; page?: number; limit?: number }
    >({
      query: (params) => ({ url: '/parties', params }),
      providesTags: ['Parties'],
    }),
    createParty: builder.mutation<ApiEnvelope<Party>, CreatePartyBody>({
      query: (body) => ({ url: '/parties', method: 'POST', body }),
      invalidatesTags: ['Parties'],
    }),
    updateParty: builder.mutation<ApiEnvelope<Party>, { id: string; body: Partial<CreatePartyBody> & { isActive?: boolean } }>({
      query: ({ id, body }) => ({ url: `/parties/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Parties'],
    }),
    deleteParty: builder.mutation<ApiEnvelope<null>, string>({
      query: (id) => ({ url: `/parties/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Parties'],
    }),
  }),
})

export const {
  useListPartiesQuery,
  useCreatePartyMutation,
  useUpdatePartyMutation,
  useDeletePartyMutation,
} = partiesApi
