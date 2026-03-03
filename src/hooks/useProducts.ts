import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Product } from '../data/database.types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_code')

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function updateStock(productCode: string, newStock: number) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ in_stock: newStock, updated_at: new Date().toISOString() })
        .eq('product_code', productCode)

      if (error) throw error
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.product_code === productCode 
          ? { ...p, in_stock: newStock, updated_at: new Date().toISOString() }
          : p
      ))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      return false
    }
  }

  return { products, loading, error, updateStock, refresh: fetchProducts }
}
