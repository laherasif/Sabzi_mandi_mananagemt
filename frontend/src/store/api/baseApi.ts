import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { setCredentials, logout } from '../slices/authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { accessToken: string | null } }).auth.accessToken
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  },
})

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra
) => {
  let result = await rawBaseQuery(args, api, extra)
  if (result.error && result.error.status === 401) {
    const refresh = await rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extra)
    if (refresh.data) {
      const data = refresh.data as { data: { accessToken: string } }
      api.dispatch(setCredentials({ accessToken: data.data.accessToken }))
      result = await rawBaseQuery(args, api, extra)
    } else {
      api.dispatch(logout())
    }
  }
  return result
}

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    pages?: number
  }
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Business', 'Users', 'Parties', 'Products', 'Units'],
  endpoints: () => ({}),
})
