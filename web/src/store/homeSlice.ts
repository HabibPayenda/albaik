import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, endpoints } from '@/lib/api'
import type { HomePayload } from '@/lib/types'

interface HomeState {
  data?: HomePayload
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
}

const initialState: HomeState = { status: 'idle' }

export const fetchHome = createAsyncThunk<HomePayload, void, { rejectValue: string }>(
  'home/fetchHome',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<HomePayload>(endpoints.home)
      return data
    } catch {
      return rejectWithValue('Could not load the home page content.')
    }
  },
)

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHome.pending, (state) => {
        if (state.status !== 'ready') state.status = 'loading'
        state.error = undefined
      })
      .addCase(fetchHome.fulfilled, (state, action) => {
        state.status = 'ready'
        state.data = action.payload
      })
      .addCase(fetchHome.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'Could not load the home page content.'
      })
  },
})

export default homeSlice.reducer
