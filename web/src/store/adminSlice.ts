import { createAsyncThunk, createSlice, type AsyncThunk } from '@reduxjs/toolkit'
import { api, endpoints, errorMessage } from '@/lib/api'
import type {
  Brand,
  Category,
  ContactMessage,
  FooterLink,
  HairProfile,
  HeroStat,
  HomeSection,
  NavLink,
  Page,
  ProductCard,
  QuickLink,
  SiteSetting,
  Testimonial,
  TrustPillar,
} from '@/lib/types'

/** Every collection the dashboard can list, save and delete. */
export const RESOURCES = {
  categories: '/admin/categories',
  brands: '/admin/brands',
  products: '/admin/products',
  testimonials: '/admin/testimonials',
  pillars: '/admin/trust-pillars',
  profiles: '/admin/hair-profiles',
  heroStats: '/admin/hero-stats',
  navLinks: '/admin/nav-links',
  footerLinks: '/admin/footer-links',
  quickLinks: '/admin/quick-links',
  pages: '/admin/pages',
  homeSections: '/admin/home-sections',
  messages: '/admin/messages',
  settings: '/admin/settings',
} as const

export type ResourceKey = keyof typeof RESOURCES

interface ResourceState {
  items: unknown[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  saving?: boolean
}

type AdminState = Record<ResourceKey, ResourceState> & { lastError?: string }

const emptyResource = (): ResourceState => ({ items: [], status: 'idle' })

const initialState = Object.keys(RESOURCES).reduce((acc, key) => {
  acc[key as ResourceKey] = emptyResource()
  return acc
}, {} as AdminState)

/** Build a typed "load the whole collection" thunk. */
function listThunk<T>(name: string, path: string): AsyncThunk<T[], void, { rejectValue: string }> {
  return createAsyncThunk<T[], void, { rejectValue: string }>(`admin/${name}/load`, async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(path)
      // Some endpoints wrap the collection in an envelope.
      if (Array.isArray(data)) return data as T[]
      if (data && Array.isArray((data as { items?: unknown[] }).items)) return (data as { items: T[] }).items
      return [] as T[]
    } catch (error) {
      return rejectWithValue(errorMessage(error, `Could not load ${name}.`))
    }
  })
}

export const loadCategories = listThunk<Category>('categories', RESOURCES.categories)
export const loadBrands = listThunk<Brand>('brands', RESOURCES.brands)
export const loadProducts = listThunk<ProductCard>('products', RESOURCES.products)
export const loadTestimonials = listThunk<Testimonial>('testimonials', RESOURCES.testimonials)
export const loadPillars = listThunk<TrustPillar>('pillars', RESOURCES.pillars)
export const loadProfiles = listThunk<HairProfile>('profiles', RESOURCES.profiles)
export const loadHeroStats = listThunk<HeroStat>('heroStats', RESOURCES.heroStats)
export const loadNavLinks = listThunk<NavLink>('navLinks', RESOURCES.navLinks)
export const loadFooterLinks = listThunk<FooterLink>('footerLinks', RESOURCES.footerLinks)
export const loadQuickLinks = listThunk<QuickLink>('quickLinks', RESOURCES.quickLinks)
export const loadPages = listThunk<Page>('pages', RESOURCES.pages)
export const loadHomeSections = listThunk<HomeSection>('homeSections', RESOURCES.homeSections)
export const loadMessages = listThunk<ContactMessage>('messages', RESOURCES.messages)
export const loadSettings = listThunk<SiteSetting>('settings', RESOURCES.settings)

/** POST when there is no id, PUT when there is. Refreshes the list afterwards. */
export const saveResource = createAsyncThunk<
  unknown,
  { resource: ResourceKey; id?: number; payload: unknown; refresh?: boolean },
  { rejectValue: string }
>('admin/save', async ({ resource, id, payload, refresh = true }, { dispatch, rejectWithValue }) => {
  try {
    const base = RESOURCES[resource]
    const { data } = id
      ? await api.put(`${base}/${id}`, payload)
      : await api.post(base, payload)
    if (refresh) dispatch(loaders[resource]())
    return data
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Save failed.'))
  }
})

export const deleteResource = createAsyncThunk<
  unknown,
  { resource: ResourceKey; id: number },
  { rejectValue: string }
>('admin/delete', async ({ resource, id }, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.delete(`${RESOURCES[resource]}/${id}`)
    dispatch(loaders[resource]())
    return data
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Delete failed.'))
  }
})

/**
 * One move of a dashboard list's up/down control. The full ordered id list is sent
 * for the collection under its admin key ("trust-pillars", "categories", ...) — the
 * endpoint re-sequenced every row, then this refreshes the list.
 */
export const reorderResource = createAsyncThunk<
  unknown,
  { resource: ResourceKey; ids: number[] },
  { rejectValue: string }
>('admin/reorder', async ({ resource, ids }, { dispatch, rejectWithValue }) => {
  try {
    const collection = RESOURCES[resource].replace('/admin/', '')
    const { data } = await api.put(endpoints.admin.reorder, { resource: collection, ids })
    dispatch(loaders[resource]())
    return data
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Reorder failed.'))
  }
})

export const markMessageRead = createAsyncThunk<
  unknown,
  { id: number; read: boolean },
  { rejectValue: string }
>('admin/messageRead', async ({ id, read }, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.put(`${endpoints.admin.messageRead(id)}?read=${read}`)
    dispatch(loadMessages())
    return data
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Could not update the message.'))
  }
})

/** Bulk upsert used by the settings screen. */
export const saveSettings = createAsyncThunk<
  SiteSetting[],
  { settings: { key: string; value: string | null; group: string; label?: string; inputType: string }[] },
  { rejectValue: string }
>('admin/saveSettings', async ({ settings }, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.put<SiteSetting[]>(RESOURCES.settings, { settings })
    dispatch(loadSettings())
    return data
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Could not save settings.'))
  }
})

export const loaders: Record<ResourceKey, AsyncThunk<unknown[], void, { rejectValue: string }>> = {
  categories: loadCategories as AsyncThunk<unknown[], void, { rejectValue: string }>,
  brands: loadBrands as AsyncThunk<unknown[], void, { rejectValue: string }>,
  products: loadProducts as AsyncThunk<unknown[], void, { rejectValue: string }>,
  testimonials: loadTestimonials as AsyncThunk<unknown[], void, { rejectValue: string }>,
  pillars: loadPillars as AsyncThunk<unknown[], void, { rejectValue: string }>,
  profiles: loadProfiles as AsyncThunk<unknown[], void, { rejectValue: string }>,
  heroStats: loadHeroStats as AsyncThunk<unknown[], void, { rejectValue: string }>,
  navLinks: loadNavLinks as AsyncThunk<unknown[], void, { rejectValue: string }>,
  footerLinks: loadFooterLinks as AsyncThunk<unknown[], void, { rejectValue: string }>,
  quickLinks: loadQuickLinks as AsyncThunk<unknown[], void, { rejectValue: string }>,
  pages: loadPages as AsyncThunk<unknown[], void, { rejectValue: string }>,
  homeSections: loadHomeSections as AsyncThunk<unknown[], void, { rejectValue: string }>,
  messages: loadMessages as AsyncThunk<unknown[], void, { rejectValue: string }>,
  settings: loadSettings as AsyncThunk<unknown[], void, { rejectValue: string }>,
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Every generated loader shares the same lifecycle handling.
    for (const [key, thunk] of Object.entries(loaders) as [ResourceKey, typeof loadCategories][]) {
      builder
        .addCase(thunk.pending, (state) => {
          if (state[key].status !== 'ready') state[key].status = 'loading'
          state[key].error = undefined
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state[key].status = 'ready'
          state[key].items = action.payload as unknown[]
        })
        .addCase(thunk.rejected, (state, action) => {
          state[key].status = 'error'
          state[key].error = (action.payload as string) ?? 'Request failed.'
        })
    }

    builder
      .addCase(saveResource.pending, (state, action) => {
        state[action.meta.arg.resource].saving = true
        state.lastError = undefined
      })
      .addCase(saveResource.fulfilled, (state, action) => {
        state[action.meta.arg.resource].saving = false
      })
      .addCase(saveResource.rejected, (state, action) => {
        state[action.meta.arg.resource].saving = false
        state.lastError = action.payload
      })
      .addCase(deleteResource.rejected, (state, action) => {
        state.lastError = action.payload
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.lastError = action.payload
      })
  },
})

export default adminSlice.reducer
