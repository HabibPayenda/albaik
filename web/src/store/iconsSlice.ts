import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, endpoints } from '@/lib/api'

/**
 * Which icons the dashboard's icon selectors are allowed to offer.
 *
 * The registry of available icons ships with the front end, so the server only stores
 * the names an editor has switched *off*. That keeps the payload small and means an
 * icon added to the registry in a later build appears on its own instead of staying
 * hidden until somebody enables it by hand.
 *
 * Switching an icon off only removes it from the selectors — content already using it
 * keeps rendering. That way disabling something can never blank out a live page.
 */
interface IconsState {
  disabled: string[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  saving: boolean
  error?: string
}

const initialState: IconsState = {
  disabled: [],
  status: 'idle',
  saving: false,
}

export const fetchIcons = createAsyncThunk<string[], void, { rejectValue: string }>(
  'icons/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{ disabled: string[] }>(endpoints.admin.icons)
      return data.disabled ?? []
    } catch {
      return rejectWithValue('Could not load the icon library settings.')
    }
  },
)

export const saveIcons = createAsyncThunk<string[], string[], { rejectValue: string }>(
  'icons/save',
  async (disabled, { rejectWithValue }) => {
    try {
      const { data } = await api.put<{ disabled: string[] }>(endpoints.admin.icons, { disabled })
      return data.disabled ?? []
    } catch {
      return rejectWithValue('Could not save the icon library settings.')
    }
  },
)

const iconsSlice = createSlice({
  name: 'icons',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIcons.pending, (state) => {
        state.status = state.status === 'ready' ? 'ready' : 'loading'
      })
      .addCase(fetchIcons.fulfilled, (state, action) => {
        state.status = 'ready'
        state.disabled = action.payload
        state.error = undefined
      })
      .addCase(fetchIcons.rejected, (state, action) => {
        // A failed load must not empty the library: every icon stays selectable
        // rather than every icon disappearing from the forms.
        state.status = 'error'
        state.error = action.payload
      })
      .addCase(saveIcons.pending, (state) => {
        state.saving = true
      })
      .addCase(saveIcons.fulfilled, (state, action) => {
        state.saving = false
        state.disabled = action.payload
        state.error = undefined
      })
      .addCase(saveIcons.rejected, (state, action) => {
        state.saving = false
        state.error = action.payload
      })
  },
})

export default iconsSlice.reducer
