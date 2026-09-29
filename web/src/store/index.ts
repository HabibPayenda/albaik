import { configureStore } from '@reduxjs/toolkit'
import adminReducer from './adminSlice'
import authReducer from './authSlice'
import catalogReducer from './catalogSlice'
import homeReducer from './homeSlice'
import iconsReducer from './iconsSlice'
import siteReducer from './siteSlice'
import uiReducer from './uiSlice'

export const store = configureStore({
  reducer: {
    site: siteReducer,
    home: homeReducer,
    icons: iconsReducer,
    catalog: catalogReducer,
    auth: authReducer,
    ui: uiReducer,
    admin: adminReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
  devTools: import.meta.env.DEV,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
