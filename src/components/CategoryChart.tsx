import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b'];

export function CategoryChart({ products }: Props) {
  const data = products.reduce((acc, product) => {
    const existing = acc.find(item => item.name === product.category);
    if (existing) {
      existing.value += product.in_stock;
    } else {
      acc.push({ name: product.category, value: product.in_stock });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
