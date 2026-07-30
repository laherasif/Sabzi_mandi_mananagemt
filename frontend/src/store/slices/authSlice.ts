import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  businessId: string
  permissions: string[]
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
}

const storedToken = localStorage.getItem('sabzi_access')
const storedUser = localStorage.getItem('sabzi_user')

const initialState: AuthState = {
  accessToken: storedToken,
  user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; user?: AuthUser }>
    ) {
      state.accessToken = action.payload.accessToken
      localStorage.setItem('sabzi_access', action.payload.accessToken)
      if (action.payload.user) {
        state.user = action.payload.user
        localStorage.setItem('sabzi_user', JSON.stringify(action.payload.user))
      }
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      localStorage.setItem('sabzi_user', JSON.stringify(action.payload))
    },
    logout(state) {
      state.accessToken = null
      state.user = null
      localStorage.removeItem('sabzi_access')
      localStorage.removeItem('sabzi_user')
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer
