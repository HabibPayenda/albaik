import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, endpoints, errorMessage, TOKEN_KEY, USER_KEY } from '@/lib/api'
import type { AdminUser } from '@/lib/types'

interface LoginResponse {
  token: string
  expiresAt: string
  user: AdminUser
}

interface AuthState {
  token?: string
  user?: AdminUser
  status: 'idle' | 'loading' | 'authenticated' | 'error'
  error?: string
}

function readStoredUser(): AdminUser | undefined {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AdminUser) : undefined
  } catch {
    return undefined
  }
}

const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_KEY) ?? undefined,
  user: readStoredUser(),
  status: localStorage.getItem(TOKEN_KEY) ? 'authenticated' : 'idle',
}

export const login = createAsyncThunk<
  LoginResponse,
  { username: string; password: string },
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post<LoginResponse>(endpoints.login, credentials)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Incorrect username or password.'))
  }
})

export const fetchMe = createAsyncThunk<AdminUser, void, { rejectValue: string }>(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<AdminUser>(endpoints.me)
      localStorage.setItem(USER_KEY, JSON.stringify(data))
      return data
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Your session has expired.'))
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      state.token = undefined
      state.user = undefined
      state.status = 'idle'
      state.error = undefined
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = undefined
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'authenticated'
        state.token = action.payload.token
        state.user = action.payload.user
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'authenticated'
      })
      .addCase(fetchMe.rejected, (state) => {
        state.status = 'idle'
        state.token = undefined
        state.user = undefined
      })
  },
})

export const { logout } = authSlice.actions
export default authSlice.reducer
