import { baseApi, type ApiEnvelope } from './baseApi'
import type { Business } from './authApi'

export const businessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBusiness: builder.query<ApiEnvelope<Business>, void>({
      query: () => '/business',
      providesTags: ['Business'],
    }),
    updateBusiness: builder.mutation<ApiEnvelope<Business>, Partial<Business>>({
      query: (body) => ({ url: '/business', method: 'PATCH', body }),
      invalidatesTags: ['Business', 'Me'],
    }),
  }),
})

export const { useGetBusinessQuery, useUpdateBusinessMutation } = businessApi
