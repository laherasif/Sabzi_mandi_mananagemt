import { baseApi, type ApiEnvelope } from './baseApi'
import type { Unit } from './unitsApi'

export interface Product {
  _id: string
  sku?: string
  name: string
  nameUrdu?: string
  category: 'vegetable' | 'fruit' | 'other'
  baseUnitId: Unit | string
  purchaseRatePaisa: number
  saleRatePaisa: number
  stockInBaseUnit: number
  minStockAlert: number
  isActive: boolean
}

export interface CreateProductBody {
  sku?: string
  name: string
  nameUrdu?: string
  category: Product['category']
  baseUnitId: string
  purchaseRatePaisa: number
  saleRatePaisa: number
  minStockAlert: number
  openingStockInBaseUnit?: number
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listProducts: builder.query<
      ApiEnvelope<Product[]>,
      { search?: string; category?: string; page?: number; limit?: number }
    >({
      query: (params) => ({ url: '/products', params }),
      providesTags: ['Products'],
    }),
    createProduct: builder.mutation<ApiEnvelope<Product>, CreateProductBody>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['Products'],
    }),
    updateProduct: builder.mutation<
      ApiEnvelope<Product>,
      { id: string; body: Partial<CreateProductBody> & { isActive?: boolean } }
    >({
      query: ({ id, body }) => ({ url: `/products/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Products'],
    }),
    deleteProduct: builder.mutation<ApiEnvelope<null>, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Products'],
    }),
  }),
})

export const {
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi
