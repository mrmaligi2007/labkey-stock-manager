import { useState, useMemo } from 'react';
import { Package, Search, AlertTriangle, TrendingDown, Grid, List, Plus, Minus, Download } from 'lucide-react';
import { initialProducts, categories, Product } from './data/products';
import { StockChart } from './components/StockChart';
import { CategoryChart } from './components/CategoryChart';

function App() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.productCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesLowStock = !showLowStockOnly || (product.inStock <= (product.minStock || 0));
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, searchTerm, selectedCategory, showLowStockOnly]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.inStock, 0);
    const lowStock = products.filter(p => p.inStock <= (p.minStock || 0)).length;
    const outOfStock = products.filter(p => p.inStock === 0).length;
    return { totalProducts, totalStock, lowStock, outOfStock };
  }, [products]);

  const updateStock = (productCode: string, delta: number) => {
    setProducts(prev => prev.map(p => 
      p.productCode === productCode 
        ? { ...p, inStock: Math.max(0, p.inStock + delta), lastUpdated: new Date().toISOString() }
        : p
    ));
  };

  const exportCSV = () => {
    const headers = ['Product Code', 'Description', 'In Stock', 'Category', 'Rele Count', 'Min Stock'];
    const rows = products.map(p => [p.productCode, p.description, p.inStock, p.category, p.releCount, p.minStock || '']);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'labkey-inventory.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LabKey Stock Manager</h1>
                <p className="text-sm text-gray-500">Real-time inventory tracking</p>
              </div>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-primary-600" />
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
            <CategoryChart products={products} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Low Stock Alert</h3>
            <StockChart products={products.filter(p => p.inStock <= (p.minStock || 0))} />
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
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="All">All Categories</option>
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
                  className="rounded text-primary-600"
                />
                <span className="text-sm">Low Stock Only</span>
              </label>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
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
              key={product.productCode}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                product.inStock === 0 ? 'border-red-300 bg-red-50' :
                product.inStock <= (product.minStock || 0) ? 'border-orange-300 bg-orange-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-mono text-gray-500">{product.productCode}</span>
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
                    product.inStock === 0 ? 'text-red-600' :
                    product.inStock <= (product.minStock || 0) ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {product.inStock}
                  </p>
                  {product.minStock && (
                    <p className="text-xs text-gray-400">Min: {product.minStock}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStock(product.productCode, -1)}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    disabled={product.inStock === 0}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateStock(product.productCode, 1)}
                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {product.releCount > 0 && (
                <p className="text-xs text-gray-400 mt-2">Rele: {product.releCount}</p>
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
