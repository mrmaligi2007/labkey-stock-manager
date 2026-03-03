import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Product {
  product_code: string
  description: string
  in_stock: number
  category: string
  rele_count: number
  min_stock: number
}

interface Props {
  products: Product[];
}

export function StockChart({ products }: Props) {
  const data = products.slice(0, 10).map(p => ({
    name: p.product_code.split('-').pop() || p.product_code,
    current: p.in_stock,
    minimum: p.min_stock,
    category: p.category
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="current" fill="#ef4444" name="Current Stock" />
        <Bar dataKey="minimum" fill="#e5e7eb" name="Min Stock" />
      </BarChart>
    </ResponsiveContainer>
  );
}
