import { baseApi, type ApiEnvelope } from './baseApi'

export interface Unit {
  _id: string
  code: string
  name: string
  nameUrdu?: string
  factorToBase: number
  isBase: boolean
  isActive: boolean
}

export const unitsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUnits: builder.query<ApiEnvelope<Unit[]>, void>({
      query: () => '/units',
      providesTags: ['Units'],
    }),
    createUnit: builder.mutation<
      ApiEnvelope<Unit>,
      { code: string; name: string; nameUrdu?: string; factorToBase: number; isBase?: boolean }
    >({
      query: (body) => ({ url: '/units', method: 'POST', body }),
      invalidatesTags: ['Units'],
    }),
    updateUnit: builder.mutation<
      ApiEnvelope<Unit>,
      { id: string; body: Partial<{ code: string; name: string; nameUrdu: string; factorToBase: number; isBase: boolean }> }
    >({
      query: ({ id, body }) => ({ url: `/units/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Units'],
    }),
    deleteUnit: builder.mutation<ApiEnvelope<null>, string>({
      query: (id) => ({ url: `/units/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Units'],
    }),
  }),
})

export const {
  useListUnitsQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
} = unitsApi
