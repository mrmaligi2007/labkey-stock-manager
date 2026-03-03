import { useState, useMemo, useEffect } from 'react';
import { 
  Package, Search, AlertTriangle, TrendingDown, Grid, List, Plus, Minus, 
  Download, RefreshCw, LogOut, Filter, ChevronDown, BarChart3, Boxes,
  Warehouse, ArrowDownRight
} from 'lucide-react';
import { StockChart } from './components/StockChart';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { initialProducts } from './data/products';

function App() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'code' | 'stock' | 'name'>('code');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && session) {
      fetchProducts();
    } else if (authChecked && !session) {
      setLoading(false);
    }
  }, [authChecked, session]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_code');
      
      if (error) throw error;
      setProducts(data || initialProducts);
    } catch (err) {
      console.error('Error:', err);
      setProducts(initialProducts);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProducts([]);
  };

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.product_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesLowStock = !showLowStockOnly || (product.in_stock <= (product.min_stock || 0));
      return matchesSearch && matchesCategory && matchesLowStock;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'code') return a.product_code.localeCompare(b.product_code);
      if (sortBy === 'stock') return b.in_stock - a.in_stock;
      if (sortBy === 'name') return a.description.localeCompare(b.description);
      return 0;
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, showLowStockOnly, sortBy]);

  const categories = useMemo(() => {
    return ['All', ...new Set(products.map(p => p.category))];
  }, [products]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.in_stock, 0);
    const lowStock = products.filter(p => p.in_stock > 0 && p.in_stock <= (p.min_stock || 0)).length;
    const outOfStock = products.filter(p => p.in_stock === 0).length;
    const healthyStock = products.filter(p => p.in_stock > (p.min_stock || 0)).length;
    return { totalProducts, totalStock, lowStock, outOfStock, healthyStock };
  }, [products]);

  const handleUpdateStock = async (productCode: string, delta: number) => {
    const product = products.find(p => p.product_code === productCode);
    if (!product) return;
    
    const newStock = Math.max(0, product.in_stock + delta);
    
    setUpdating(productCode);
    try {
      const { error } = await supabase
        .from('products')
        .update({ in_stock: newStock, updated_at: new Date().toISOString() })
        .eq('product_code', productCode);

      if (error) throw error;
      
      setProducts(prev => prev.map(p => 
        p.product_code === productCode 
          ? { ...p, in_stock: newStock, updated_at: new Date().toISOString() }
          : p
      ));
    } catch (err) {
      alert('Failed to update stock');
    } finally {
      setUpdating(null);
    }
  };

  const exportCSV = () => {
    const headers = ['Product Code', 'Description', 'In Stock', 'Category', 'Rele Count', 'Min Stock'];
    const rows = products.map(p => [p.product_code, p.description, p.in_stock, p.category, p.rele_count, p.min_stock]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'labkey-inventory.csv';
    a.click();
  };

  const getStockStatus = (stock: number, min: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
    if (stock <= min) return { label: 'Low Stock', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'In Stock', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
            <Package className="w-16 h-16 text-blue-400 relative z-10 mx-auto mb-6" />
          </div>
          <p className="text-blue-200 text-lg">Loading LabKey...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={fetchProducts} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modern Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">LabKey</h1>
                <p className="text-xs text-slate-500">Stock Manager</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-slate-600">{session.user.email}</span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalProducts}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Boxes className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Stock</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalStock}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Low Stock</p>
                <p className="text-3xl font-bold text-orange-600">{stats.lowStock}</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            {stats.lowStock > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                <ArrowDownRight className="w-3 h-3" />
                <span>Needs attention</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
            {stats.outOfStock > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                <ArrowDownRight className="w-3 h-3" />
                <span>Critical</span>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert Section */}
        {stats.lowStock + stats.outOfStock > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Stock Alerts</h3>
                <p className="text-sm text-slate-600">{stats.lowStock + stats.outOfStock} products need attention</p>
              </div>
            </div>
            <StockChart products={products.filter(p => p.in_stock <= (p.min_stock || 0))} />
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="p-4 border-b border-slate-100">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products by code or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    showFilters 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="code">Product Code</option>
                    <option value="stock">Stock Level</option>
                    <option value="name">Name</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showLowStockOnly}
                    onChange={(e) => setShowLowStockOnly(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Low Stock Only</span>
                </label>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{filteredProducts.length}</span> of <span className="font-semibold text-slate-900">{products.length}</span> products
              </span>
              <button
                onClick={fetchProducts}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filteredProducts.map(product => {
            const status = getStockStatus(product.in_stock, product.min_stock || 0);
            return (
              <div
                key={product.product_code}
                className={`group bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${
                  product.in_stock === 0 ? 'border-red-200 bg-red-50/30' :
                  product.in_stock <= (product.min_stock || 0) ? 'border-orange-200 bg-orange-50/30' : 
                  'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-md">
                        {product.product_code}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{product.description}</h3>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-bold ${status.text}`}>{product.in_stock}</span>
                      <span className="text-sm text-slate-400">/ {product.min_stock} min</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${status.color}`}
                          style={{ 
                            width: `${Math.min(100, (product.in_stock / Math.max(product.min_stock * 2, 1)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStock(product.product_code, -1)}
                      disabled={updating === product.product_code || product.in_stock === 0}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateStock(product.product_code, 1)}
                      disabled={updating === product.product_code}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {product.rele_count > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">{product.rele_count} Rele</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-500 mb-4">Try adjusting your search or filters</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setShowLowStockOnly(false); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
