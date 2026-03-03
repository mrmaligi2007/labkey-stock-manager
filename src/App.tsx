import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, RefreshCw, LogOut, LayoutDashboard, Boxes, FileText, Users, Building2, DollarSign, AlertCircle } from 'lucide-react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { initialProducts } from './data/products';

type ViewMode = 'dashboard' | 'inventory' | 'sales' | 'customers';

function App() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

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
      fetchAllData();
    } else if (authChecked && !session) {
      setLoading(false);
    }
  }, [authChecked, session]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [{ data: productsData }, { data: customersData }, { data: invoicesData }] = await Promise.all([
        supabase.from('products').select('*').order('product_code'),
        supabase.from('customers').select('*').order('company_name'),
        supabase.from('invoices').select('*, customer:customers(*)').order('date', { ascending: false })
      ]);
      setProducts(productsData || initialProducts);
      setCustomers(customersData || []);
      setInvoices(invoicesData || []);
    } catch (err) {
      setProducts(initialProducts);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProducts([]);
    setCustomers([]);
    setInvoices([]);
  };

  const handleUpdateStock = async (productCode: string, newStock: number) => {
    if (newStock < 0) newStock = 0;
    try {
      await supabase.from('products').update({ in_stock: newStock }).eq('product_code', productCode);
      setProducts(prev => prev.map(p => p.product_code === productCode ? { ...p, in_stock: newStock } : p));
    } catch (err) {
      alert('Failed to update stock');
    }
  };

  const stats = useMemo(() => {
    const lowStock = products.filter(p => p.in_stock <= (p.min_stock || 0));
    const totalSales = invoices.reduce((sum, inv) => inv.status !== 'cancelled' ? sum + (inv.total_amount || 0) : sum, 0);
    return {
      totalProducts: products.length,
      lowStock: lowStock.length,
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      totalSales,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length
    };
  }, [products, customers, invoices]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(p => 
      p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const getStockStatus = (stock: number, min: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-500', text: 'text-red-600' };
    if (stock <= min) return { label: 'Low Stock', color: 'bg-orange-500', text: 'text-orange-600' };
    return { label: 'In Stock', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={fetchAllData} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading LabKey Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">LabKey Manager</h1>
                <p className="text-xs text-slate-500">Stock & Sales System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden md:block">{session.user.email}</span>
              <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-red-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'inventory', label: 'Inventory', icon: Boxes },
              { id: 'sales', label: 'Sales & Invoices', icon: FileText },
              { id: 'customers', label: 'Customers', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  viewMode === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Products', value: stats.totalProducts, icon: Boxes, color: 'blue' },
                { label: 'Customers', value: stats.totalCustomers, icon: Users, color: 'cyan' },
                { label: 'Total Sales', value: `$${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'green' },
                { label: 'Low Stock', value: stats.lowStock, icon: AlertCircle, color: 'red' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 bg-${stat.color}-100 rounded-lg`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                    </div>
                    <span className="text-sm text-slate-500">{stat.label}</span>
                  </div>
                  <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setViewMode('sales')} className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 text-left">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">New Invoice</p>
                      <p className="text-xs text-slate-500">Create sales invoice</p>
                    </div>
                  </button>
                  <button onClick={() => setViewMode('inventory')} className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 text-left">
                    <Boxes className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Check Stock</p>
                      <p className="text-xs text-slate-500">View inventory</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Recent Invoices</h3>
                <div className="space-y-3">
                  {invoices.slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                        <p className="text-xs text-slate-500">{invoice.customer?.company_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">${invoice.total_amount}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          invoice.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <p className="text-center text-slate-400 py-4">No invoices yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const status = getStockStatus(product.in_stock, product.min_stock || 0);
                return (
                  <div key={product.product_code} className="bg-white rounded-xl p-5 border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-md mb-2">
                          {product.category}
                        </span>
                        <h3 className="font-semibold text-slate-900">{product.description}</h3>
                        <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
                        <span className={`font-bold ${status.text}`}>{product.in_stock}</span>
                        <span className="text-xs text-slate-400">/ {product.min_stock} min</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-red-100 hover:text-red-600"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-emerald-100 hover:text-emerald-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'sales' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
              <button 
                onClick={() => alert('Invoice creation - Feature coming soon')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{invoice.invoice_number}</td>
                        <td className="px-4 py-3 text-slate-600">{invoice.customer?.company_name}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(invoice.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">${invoice.total_amount}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            invoice.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invoices.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>No invoices yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Customers</h2>
              <button 
                onClick={() => alert('Customer creation - Feature coming soon')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(customer => (
                <div key={customer.id} className="bg-white rounded-xl p-5 border border-slate-200">
                  <h3 className="font-bold text-slate-900">{customer.company_name}</h3>
                  <p className="text-sm text-slate-600">{customer.contact_name}</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-500">
                    {customer.email && <p>{customer.email}</p>}
                    {customer.phone && <p>{customer.phone}</p>}
                  </div>
                </div>
              ))}
              {customers.length === 0 && (
                <div className="col-span-full p-8 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>No customers yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
