import { useState, useMemo, useEffect } from 'react';
import { 
  Package, Search, AlertTriangle, TrendingDown, Plus, Minus, 
  Download, RefreshCw, LogOut, Grid, List, ChevronRight, 
  BarChart3, Warehouse, Filter, X, Edit3, Save, ChevronDown,
  LayoutDashboard, Boxes, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { initialProducts } from './data/products';

// Types
type ViewMode = 'dashboard' | 'by-category' | 'low-stock' | 'all-products';

function App() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'critical' | 'low' | 'ok'>('all');

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

  // Smart categorization
  const categories = useMemo(() => {
    const cats = new Map();
    products.forEach(p => {
      if (!cats.has(p.category)) {
        cats.set(p.category, {
          name: p.category,
          products: [],
          totalStock: 0,
          lowStock: 0,
          outOfStock: 0
        });
      }
      const cat = cats.get(p.category);
      cat.products.push(p);
      cat.totalStock += p.in_stock;
      if (p.in_stock === 0) cat.outOfStock++;
      else if (p.in_stock <= (p.min_stock || 0)) cat.lowStock++;
    });
    return Array.from(cats.values()).sort((a, b) => b.products.length - a.products.length);
  }, [products]);

  // Alert summary
  const alerts = useMemo(() => {
    const critical = products.filter(p => p.in_stock === 0);
    const low = products.filter(p => p.in_stock > 0 && p.in_stock <= (p.min_stock || 0));
    const healthy = products.filter(p => p.in_stock > (p.min_stock || 0));
    return { critical, low, healthy, total: products.length };
  }, [products]);

  // Filtered products based on view
  const displayedProducts = useMemo(() => {
    let filtered = products;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Apply quick filter
    if (quickFilter === 'critical') {
      filtered = filtered.filter(p => p.in_stock === 0);
    } else if (quickFilter === 'low') {
      filtered = filtered.filter(p => p.in_stock > 0 && p.in_stock <= (p.min_stock || 0));
    } else if (quickFilter === 'ok') {
      filtered = filtered.filter(p => p.in_stock > (p.min_stock || 0));
    }

    // Apply view mode filter
    if (viewMode === 'low-stock') {
      filtered = filtered.filter(p => p.in_stock <= (p.min_stock || 0));
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, quickFilter, viewMode]);

  const handleUpdateStock = async (productCode: string, newStock: number) => {
    if (newStock < 0) newStock = 0;
    
    setUpdating(productCode);
    try {
      const { error } = await supabase
        .from('products')
        .update({ in_stock: newStock, updated_at: new Date().toISOString() })
        .eq('product_code', productCode);

      if (error) throw error;
      
      setProducts(prev => prev.map(p => 
        p.product_code === productCode 
          ? { ...p, in_stock: newStock }
          : p
      ));
    } catch (err) {
      alert('Failed to update stock');
    } finally {
      setUpdating(null);
      setEditingStock(null);
    }
  };

  const startEdit = (product: any) => {
    setEditingStock(product.product_code);
    setEditValue(product.in_stock.toString());
  };

  const saveEdit = (productCode: string) => {
    const value = parseInt(editValue) || 0;
    handleUpdateStock(productCode, value);
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
    if (stock === 0) return { label: 'Critical', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (stock <= min) return { label: 'Low', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { label: 'OK', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <p className="text-blue-200">Loading...</p>
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
          <p className="text-slate-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Warehouse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">LabKey</h1>
                <p className="text-xs text-slate-500">{session.user.email}</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-red-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ALERT SUMMARY - Always visible */}
        {(alerts.critical.length > 0 || alerts.low.length > 0) && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-orange-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-slate-900">Stock Alert Summary</h2>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-red-600">{alerts.critical.length}</span> critical,{' '}
                    <span className="font-semibold text-orange-600">{alerts.low.length}</span> low stock items
                  </p>
                </div>
                <button 
                  onClick={() => setViewMode('low-stock')}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                >
                  View All
                </button>
              </div>
            </div>
            
            {/* Quick Alert List */}
            <div className="max-h-48 overflow-y-auto">
              {[...alerts.critical, ...alerts.low].slice(0, 10).map(product => {
                const status = getStockStatus(product.in_stock, product.min_stock || 0);
                return (
                  <div key={product.product_code} className="flex items-center gap-4 p-3 border-b border-slate-100 hover:bg-slate-50">
                    <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{product.description}</p>
                      <p className="text-xs text-slate-500">{product.product_code} • {product.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${status.text}`}>{product.in_stock}</span>
                      <span className="text-xs text-slate-400">/ {product.min_stock}</span>
                    </div>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleUpdateStock(product.product_code, product.in_stock + 10)}
                        className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-200"
                      >
                        +10
                      </button>
                      <button 
                        onClick={() => handleUpdateStock(product.product_code, product.in_stock + 50)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                );
              })}
              {(alerts.critical.length + alerts.low.length) > 10 && (
                <div className="p-3 text-center text-sm text-slate-500">
                  +{(alerts.critical.length + alerts.low.length) - 10} more items
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'by-category', label: 'By Category', icon: Boxes },
            { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
            { id: 'all-products', label: 'All Products', icon: Package },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setViewMode(tab.id as ViewMode); setSelectedCategory(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                viewMode === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search SKU or product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value as any)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="all">All Stock</option>
                <option value="critical">🔴 Critical (0)</option>
                <option value="low">🟡 Low Stock</option>
                <option value="ok">🟢 OK</option>
              </select>
              
              <button onClick={exportCSV} className="px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {viewMode === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Products', value: alerts.total, color: 'blue', icon: Package },
                { label: 'Healthy', value: alerts.healthy.length, color: 'emerald', icon: CheckCircle2 },
                { label: 'Low Stock', value: alerts.low.length, color: 'orange', icon: AlertTriangle },
                { label: 'Critical', value: alerts.critical.length, color: 'red', icon: AlertCircle },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 bg-${stat.color}-100 rounded-lg`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                    </div>
                    <span className="text-sm text-slate-500">{stat.label}</span>
                  </div>
                  <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Categories Grid */}
            <h3 className="font-bold text-slate-900 text-lg">Categories Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => { setSelectedCategory(cat.name); setViewMode('by-category'); }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 text-left hover:border-blue-300 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{cat.name}</h4>
                      <p className="text-sm text-slate-500">{cat.products.length} products</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Stock</span>
                      <span className="font-semibold">{cat.totalStock}</span>
                    </div>
                    
                    {cat.outOfStock > 0 && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        {cat.outOfStock} out of stock
                      </div>
                    )}
                    {cat.lowStock > 0 && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        {cat.lowStock} low stock
                      </div>
                    )}
                    {cat.outOfStock === 0 && cat.lowStock === 0 && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        All stock healthy
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCT LIST */}
        {(viewMode === 'by-category' || viewMode === 'low-stock' || viewMode === 'all-products') && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {selectedCategory || (viewMode === 'low-stock' ? 'Low Stock Items' : 'All Products')}
                </span>
                <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs rounded-full">
                  {displayedProducts.length}
                </span>
              </div>
              
              {selectedCategory && (
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {displayedProducts.map(product => {
                const status = getStockStatus(product.in_stock, product.min_stock || 0);
                const isEditing = editingStock === product.product_code;
                
                return (
                  <div key={product.product_code} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {product.product_code}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="font-medium text-slate-900 truncate">{product.description}</p>
                        <p className="text-xs text-slate-500">{product.category} {product.rele_count > 0 && `• ${product.rele_count} Rele`}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center"
                              autoFocus
                            />
                            <button 
                              onClick={() => saveEdit(product.product_code)}
                              className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingStock(null)}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)}
                              disabled={updating === product.product_code}
                              className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-600"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => startEdit(product)}
                              className="w-16 py-1.5 text-center font-bold text-slate-900 bg-slate-100 rounded-lg hover:bg-blue-100"
                            >
                              {product.in_stock}
                            </button>
                            
                            <button 
                              onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)}
                              disabled={updating === product.product_code}
                              className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-100 hover:text-emerald-600"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        <span className="text-xs text-slate-400 w-12 text-right">
                          min: {product.min_stock}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {displayedProducts.length === 0 && (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No products found</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
