import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { api, endpoints } from '@/lib/api'
import type { Brand, Category, Paginated, ProductCard, ProductDetail } from '@/lib/types'

export interface ProductQuery {
  category?: string
  brand?: string
  search?: string
  featured?: boolean
  page?: number
  pageSize?: number
}

interface CatalogState {
  categories: Category[]
  category?: Category
  brand?: Brand
  products: ProductCard[]
  productTotal: number
  productPage: number
  productTotalPages: number
  product?: ProductDetail
  query: ProductQuery
  listStatus: 'idle' | 'loading' | 'ready' | 'error'
  detailStatus: 'idle' | 'loading' | 'ready' | 'error'
  categoryStatus: 'idle' | 'loading' | 'ready' | 'error'
  brandStatus: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
}

const initialState: CatalogState = {
  categories: [],
  products: [],
  productTotal: 0,
  productPage: 1,
  productTotalPages: 0,
  query: { page: 1, pageSize: 24 },
  listStatus: 'idle',
  detailStatus: 'idle',
  categoryStatus: 'idle',
  brandStatus: 'idle',
}

export const fetchCategories = createAsyncThunk<Category[], boolean | undefined, { rejectValue: string }>(
  'catalog/fetchCategories',
  async (withBrands = true, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Category[]>(endpoints.categories, { params: { withBrands } })
      return data
    } catch {
      return rejectWithValue('Could not load collections.')
    }
  },
)

export const fetchCategory = createAsyncThunk<Category, string, { rejectValue: string }>(
  'catalog/fetchCategory',
  async (slug, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Category>(endpoints.category(slug))
      return data
    } catch {
      return rejectWithValue(`Collection "${slug}" was not found.`)
    }
  },
)

export const fetchBrand = createAsyncThunk<
  Brand,
  { categorySlug: string; brandSlug: string },
  { rejectValue: string }
>('catalog/fetchBrand', async ({ categorySlug, brandSlug }, { rejectWithValue }) => {
  try {
    const { data } = await api.get<Brand>(endpoints.brand(categorySlug, brandSlug))
    return data
  } catch {
    return rejectWithValue(`Brand "${brandSlug}" was not found.`)
  }
})

export const fetchProducts = createAsyncThunk<Paginated<ProductCard>, ProductQuery, { rejectValue: string }>(
  'catalog/fetchProducts',
  async (query, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Paginated<ProductCard>>(endpoints.products, {
        params: {
          category: query.category || undefined,
          brand: query.brand || undefined,
          search: query.search || undefined,
          featured: query.featured,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 24,
        },
      })
      return data
    } catch {
      return rejectWithValue('Could not load products.')
    }
  },
)

export const fetchProduct = createAsyncThunk<ProductDetail, string, { rejectValue: string }>(
  'catalog/fetchProduct',
  async (slug, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ProductDetail>(endpoints.product(slug))
      return data
    } catch {
      return rejectWithValue(`Product "${slug}" was not found.`)
    }
  },
)

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    clearProduct(state) {
      state.product = undefined
      state.detailStatus = 'idle'
    },
    clearCategory(state) {
      state.category = undefined
    },
    clearBrand(state) {
      state.brand = undefined
    },
    setQuery(state, action: PayloadAction<ProductQuery>) {
      state.query = { ...state.query, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.categoryStatus = 'loading'
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoryStatus = 'ready'
        state.categories = action.payload
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoryStatus = 'error'
        state.error = action.payload
      })

      .addCase(fetchCategory.pending, (state) => {
        state.categoryStatus = 'loading'
        state.category = undefined
      })
      .addCase(fetchCategory.fulfilled, (state, action) => {
        state.categoryStatus = 'ready'
        state.category = action.payload
      })
      .addCase(fetchCategory.rejected, (state, action) => {
        state.categoryStatus = 'error'
        state.error = action.payload
      })

      .addCase(fetchBrand.pending, (state) => {
        state.brandStatus = 'loading'
        state.brand = undefined
      })
      .addCase(fetchBrand.fulfilled, (state, action) => {
        state.brandStatus = 'ready'
        state.brand = action.payload
      })
      .addCase(fetchBrand.rejected, (state, action) => {
        state.brandStatus = 'error'
        state.error = action.payload
      })

      .addCase(fetchProducts.pending, (state) => {
        if (state.listStatus !== 'ready') state.listStatus = 'loading'
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.listStatus = 'ready'
        state.products = action.payload.items
        state.productTotal = action.payload.total
        state.productPage = action.payload.page
        state.productTotalPages = action.payload.totalPages
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.listStatus = 'error'
        state.error = action.payload
      })

      .addCase(fetchProduct.pending, (state) => {
        state.detailStatus = 'loading'
        state.product = undefined
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.detailStatus = 'ready'
        state.product = action.payload
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.detailStatus = 'error'
        state.error = action.payload
      })
  },
})

export const { clearProduct, clearCategory, clearBrand, setQuery } = catalogSlice.actions
export default catalogSlice.reducer
