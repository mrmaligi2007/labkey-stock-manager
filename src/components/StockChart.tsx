import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Product } from '../data/products';

interface Props {
  products: Product[];
}

export function StockChart({ products }: Props) {
  const data = products.slice(0, 10).map(p => ({
    name: p.productCode.split('-').pop() || p.productCode,
    current: p.inStock,
    minimum: p.minStock || 0,
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
