import { createAsyncThunk, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { api, endpoints, errorMessage } from '@/lib/api'

export interface Toast {
  id: string
  tone: 'success' | 'error' | 'info'
  title: string
  description?: string
}

interface UiState {
  mobileNavOpen: boolean
  searchOpen: boolean
  toasts: Toast[]
  contactStatus: 'idle' | 'loading' | 'success' | 'error'
  contactError?: string
  newsletterStatus: 'idle' | 'loading' | 'success' | 'error'
  newsletterMessage?: string
}

const initialState: UiState = {
  mobileNavOpen: false,
  searchOpen: false,
  toasts: [],
  contactStatus: 'idle',
  newsletterStatus: 'idle',
}

export interface ContactPayload {
  name: string
  email: string
  phone?: string
  company?: string
  subject?: string
  message: string
  kind?: string
  /**
   * Slug of the product the enquiry started from. The server resolves the display name
   * from the catalogue, so this is the only product field the client sends.
   */
  productSlug?: string
  website?: string
}

export const submitContact = createAsyncThunk<{ message: string }, ContactPayload, { rejectValue: string }>(
  'ui/submitContact',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ message: string }>(endpoints.contact, payload)
      return data
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Your message could not be sent.'))
    }
  },
)

export const subscribeNewsletter = createAsyncThunk<
  { message: string },
  { email: string; name?: string },
  { rejectValue: string }
>('ui/subscribeNewsletter', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<{ message: string }>(endpoints.newsletter, payload)
    return data
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Subscription failed.'))
  }
})

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileNav(state, action: PayloadAction<boolean | undefined>) {
      state.mobileNavOpen = action.payload ?? !state.mobileNavOpen
    },
    toggleSearch(state, action: PayloadAction<boolean | undefined>) {
      state.searchOpen = action.payload ?? !state.searchOpen
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload)
      },
      prepare(toast: Omit<Toast, 'id'>) {
        return { payload: { ...toast, id: nanoid() } }
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    resetContact(state) {
      state.contactStatus = 'idle'
      state.contactError = undefined
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitContact.pending, (state) => {
        state.contactStatus = 'loading'
        state.contactError = undefined
      })
      .addCase(submitContact.fulfilled, (state, action) => {
        state.contactStatus = 'success'
        state.toasts.push({
          id: nanoid(),
          tone: 'success',
          title: 'Message sent',
          description: action.payload.message,
        })
      })
      .addCase(submitContact.rejected, (state, action) => {
        state.contactStatus = 'error'
        state.contactError = action.payload
        state.toasts.push({
          id: nanoid(),
          tone: 'error',
          title: 'Could not send message',
          description: action.payload,
        })
      })

      .addCase(subscribeNewsletter.pending, (state) => {
        state.newsletterStatus = 'loading'
      })
      .addCase(subscribeNewsletter.fulfilled, (state, action) => {
        state.newsletterStatus = 'success'
        state.newsletterMessage = action.payload.message
        state.toasts.push({ id: nanoid(), tone: 'success', title: 'Subscribed', description: action.payload.message })
      })
      .addCase(subscribeNewsletter.rejected, (state, action) => {
        state.newsletterStatus = 'error'
        state.newsletterMessage = action.payload
        state.toasts.push({ id: nanoid(), tone: 'error', title: 'Subscription failed', description: action.payload })
      })
  },
})

export const { toggleMobileNav, toggleSearch, pushToast, dismissToast, resetContact } = uiSlice.actions
export default uiSlice.reducer
