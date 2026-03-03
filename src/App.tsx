import { useState, useMemo } from 'react';
import { Package, Search, AlertTriangle, TrendingDown, Grid, List, Plus, Minus, Download, RefreshCw } from 'lucide-react';
import { useProducts } from './hooks/useProducts';
import { StockChart } from './components/StockChart';
import { CategoryChart } from './components/CategoryChart';
import { initialProducts } from './data/products';

function App() {
  const { products, loading, error, updateStock, refresh } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Use local data if Supabase is empty or error
  const displayProducts = products.length > 0 ? products : initialProducts.map(p => ({
    id: p.productCode,
    product_code: p.productCode,
    description: p.description,
    in_stock: p.inStock,
    category: p.category,
    rele_count: p.releCount,
    min_stock: p.minStock || 0
  }));

  const filteredProducts = useMemo(() => {
    return displayProducts.filter(product => {
      const matchesSearch = product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.product_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesLowStock = !showLowStockOnly || (product.in_stock <= product.min_stock);
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [displayProducts, searchTerm, selectedCategory, showLowStockOnly]);

  const categories = useMemo(() => {
    return ['All', ...new Set(displayProducts.map(p => p.category))];
  }, [displayProducts]);

  const stats = useMemo(() => {
    const totalProducts = displayProducts.length;
    const totalStock = displayProducts.reduce((sum, p) => sum + p.in_stock, 0);
    const lowStock = displayProducts.filter(p => p.in_stock <= p.min_stock).length;
    const outOfStock = displayProducts.filter(p => p.in_stock === 0).length;
    return { totalProducts, totalStock, lowStock, outOfStock };
  }, [displayProducts]);

  const handleUpdateStock = async (productCode: string, delta: number) => {
    const product = displayProducts.find(p => p.product_code === productCode);
    if (!product) return;
    
    const newStock = Math.max(0, product.in_stock + delta);
    
    setUpdating(productCode);
    const success = await updateStock(productCode, newStock);
    setUpdating(null);
    
    if (!success) {
      alert('Failed to update stock. Please try again.');
    }
  };

  const exportCSV = () => {
    const headers = ['Product Code', 'Description', 'In Stock', 'Category', 'Rele Count', 'Min Stock'];
    const rows = displayProducts.map(p => [p.product_code, p.description, p.in_stock, p.category, p.rele_count, p.min_stock]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'labkey-inventory.csv';
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LabKey Stock Manager</h1>
                <p className="text-sm text-gray-500">
                  {products.length > 0 ? 'Connected to Supabase' : 'Using local data'} • Real-time inventory tracking
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Connection Error</p>
            <p className="text-sm">{error}. Using local data instead.</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStock}</p>
              </div>
              <Grid className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Stock by Category</h3>
            <CategoryChart products={displayProducts} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Low Stock Alert</h3>
            <StockChart products={displayProducts.filter(p => p.in_stock <= p.min_stock)} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm">Low Stock Only</span>
              </label>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {filteredProducts.map(product => (
            <div
              key={product.product_code}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                product.in_stock === 0 ? 'border-red-300 bg-red-50' :
                product.in_stock <= product.min_stock ? 'border-orange-300 bg-orange-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-mono text-gray-500">{product.product_code}</span>
                  <h3 className="font-semibold text-gray-900">{product.description}</h3>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                  {product.category}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-sm text-gray-500">In Stock</p>
                  <p className={`text-2xl font-bold ${
                    product.in_stock === 0 ? 'text-red-600' :
                    product.in_stock <= product.min_stock ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {product.in_stock}
                  </p>
                  <p className="text-xs text-gray-400">Min: {product.min_stock}</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStock(product.product_code, -1)}
                    disabled={updating === product.product_code || product.in_stock === 0}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleUpdateStock(product.product_code, 1)}
                    disabled={updating === product.product_code}
                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {product.rele_count > 0 && (
                <p className="text-xs text-gray-400 mt-2">Rele: {product.rele_count}</p>
              )}
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
