export interface Product {
  id?: string
  product_code: string
  description: string
  in_stock: number
  category: string
  rele_count: number
  min_stock: number
  created_at?: string
  updated_at?: string
}
