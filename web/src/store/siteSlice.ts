import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, endpoints } from '@/lib/api'
import { toSettingsMap } from '@/lib/utils'
import type { Bootstrap, Brand, Category, FooterLink, NavLink, QuickLink, SiteSetting } from '@/lib/types'

interface SiteState {
  settings: Record<string, string>
  settingRows: SiteSetting[]
  nav: NavLink[]
  footer: FooterLink[]
  quickLinks: QuickLink[]
  /**
   * Whether the database holds any quick links at all, distinct from `quickLinks`
   * (only the active ones are public). Lets the header fall back to its bundled
   * defaults when none are configured without resurrecting links an admin hid.
   */
  quickLinksConfigured: boolean
  categories: Category[]
  brands: Brand[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
}

const initialState: SiteState = {
  settings: {},
  settingRows: [],
  nav: [],
  footer: [],
  quickLinks: [],
  quickLinksConfigured: false,
  categories: [],
  brands: [],
  status: 'idle',
}

export const fetchBootstrap = createAsyncThunk<Bootstrap, void, { rejectValue: string }>(
  'site/fetchBootstrap',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Bootstrap>(endpoints.bootstrap)
      return data
    } catch {
      return rejectWithValue('Could not load site configuration.')
    }
  },
)

const siteSlice = createSlice({
  name: 'site',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBootstrap.pending, (state) => {
        state.status = state.status === 'ready' ? 'ready' : 'loading'
        state.error = undefined
      })
      .addCase(fetchBootstrap.fulfilled, (state, action) => {
        state.status = 'ready'
        state.settingRows = action.payload.settings
        state.settings = toSettingsMap(action.payload.settings)
        state.nav = action.payload.nav
        state.footer = action.payload.footer
        state.quickLinks = action.payload.quickLinks
        state.quickLinksConfigured = action.payload.hasQuickLinks
        state.categories = action.payload.categories
        state.brands = action.payload.brands
      })
      .addCase(fetchBootstrap.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'Could not load site configuration.'
      })
  },
})

export default siteSlice.reducer

/** Group the footer links into ordered columns for rendering. */
export function groupFooterLinks(links: FooterLink[]) {
  const groups = new Map<string, FooterLink[]>()
  for (const link of links) {
    const list = groups.get(link.group) ?? []
    list.push(link)
    groups.set(link.group, list)
  }
  return [...groups.entries()].map(([group, items]) => ({
    group,
    items: [...items].sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}
