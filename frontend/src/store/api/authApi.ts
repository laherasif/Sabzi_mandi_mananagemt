import { baseApi, type ApiEnvelope } from './baseApi'
import type { AuthUser } from '../slices/authSlice'

export interface Business {
  _id: string
  name: string
  nameUrdu?: string
  phone?: string
  address?: string
  addressUrdu?: string
  city?: string
  ntn?: string
  invoicePrefix: string
  thermalPrintWidth: 58 | 80
  defaultLanguage: 'en' | 'ur'
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      ApiEnvelope<{ accessToken: string; user: AuthUser; business: { id: string; name: string } }>,
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    registerBusiness: builder.mutation<
      ApiEnvelope<{ businessId: string; ownerId: string; email: string }>,
      {
        businessName: string
        businessNameUrdu?: string
        phone?: string
        city?: string
        ownerName: string
        email: string
        password: string
      }
    >({
      query: (body) => ({ url: '/auth/register-business', method: 'POST', body }),
    }),
    logout: builder.mutation<ApiEnvelope<null>, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    me: builder.query<ApiEnvelope<{ user: AuthUser; business: Business }>, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterBusinessMutation,
  useLogoutMutation,
  useMeQuery,
} = authApi
