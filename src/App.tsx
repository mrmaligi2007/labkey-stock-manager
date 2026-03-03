import { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, RefreshCw, LogOut, LayoutDashboard, Boxes, FileText, Users, 
  Building2, DollarSign, AlertCircle, X, Trash2, ChevronDown, ChevronRight, Package
} from 'lucide-react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { initialProducts } from './data/products';
import { PRODUCT_LINES, getProductLine, isControlUnit, isReader, isMedia } from './lib/labkey-systems';

type ViewMode = 'dashboard' | 'inventory' | 'sales' | 'customers';

function App() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  useState('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);

  // Customer form
  const [customerForm, setCustomerForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: ''
  });

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
        supabase.from('invoices').select('*, customer:customers(*), items:invoice_items(*)').order('date', { ascending: false })
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

  const createCustomer = async () => {
    if (!customerForm.company_name) {
      alert('Company name is required');
      return;
    }
    try {
      const { data, error } = await supabase.from('customers').insert([customerForm]).select().single();
      if (error) throw error;
      setCustomers([...customers, data]);
      setCustomerForm({ company_name: '', contact_name: '', email: '', phone: '', address: '' });
      setShowCustomerModal(false);
    } catch (err) {
      alert('Failed to create customer');
    }
  };

  const addItemToInvoice = () => {
    if (!selectedProduct || selectedQty <= 0) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    if (product.in_stock < selectedQty) {
      alert(`Only ${product.in_stock} available`);
      return;
    }
    setInvoiceItems([...invoiceItems, {
      product_id: product.id,
      product_code: product.product_code,
      description: product.description,
      quantity: selectedQty,
      unit_price: selectedPrice,
      total_price: selectedQty * selectedPrice
    }]);
    setSelectedProduct('');
    setSelectedQty(1);
    setSelectedPrice(0);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const invoiceTotal = useMemo(() => invoiceItems.reduce((sum, item) => sum + item.total_price, 0), [invoiceItems]);

  const createInvoice = async () => {
    if (!selectedCustomer || invoiceItems.length === 0) {
      alert('Please select a customer and add items');
      return;
    }
    try {
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert([{ customer_id: selectedCustomer, total_amount: invoiceTotal, status: 'pending', notes: invoiceNotes }])
        .select()
        .single();

      if (invError) throw invError;

      const itemsToInsert = invoiceItems.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      await supabase.from('invoice_items').insert(itemsToInsert);

      for (const item of invoiceItems) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await handleUpdateStock(product.product_code, product.in_stock - item.quantity);
        }
      }

      setShowInvoiceModal(false);
      setSelectedCustomer('');
      setInvoiceItems([]);
      setInvoiceNotes('');
      fetchAllData();
      alert('Invoice created successfully!');
    } catch (err) {
      alert('Failed to create invoice');
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await supabase.from('invoices').delete().eq('id', id);
      fetchAllData();
    } catch (err) {
      alert('Failed to delete invoice');
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const stats = useMemo(() => {
    const controlUnits = products.filter(p => isControlUnit(p.product_code));
    const readers = products.filter(p => isReader(p.product_code));
    const media = products.filter(p => isMedia(p.product_code));
    const lowStock = products.filter(p => p.in_stock <= (p.min_stock || 0));
    const totalSales = invoices.reduce((sum, inv) => inv.status !== 'cancelled' ? sum + (inv.total_amount || 0) : sum, 0);
    return {
      totalProducts: products.length,
      controlUnits: controlUnits.length,
      readers: readers.length,
      media: media.length,
      lowStock: lowStock.length,
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      totalSales,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length
    };
  }, [products, customers, invoices]);

  const organizedProducts = useMemo(() => {
    const filtered = searchTerm 
      ? products.filter(p => 
          p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products;

    const organized: any = {
      CONTROL_UNITS: {},
      READERS: {},
      MEDIA: {},
      ACCESSORIES: {}
    };

    filtered.forEach(product => {
      const line = getProductLine(product.product_code);
      if (line) {
        if (!organized[line.line][line.subcategory]) {
          organized[line.line][line.subcategory] = [];
        }
        organized[line.line][line.subcategory].push(product);
      }
    });

    return organized;
  }, [products, searchTerm]);

  const getStockStatus = (stock: number, min: number) => {
    if (stock === 0) return { label: 'Out', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
    if (stock <= min) return { label: 'Low', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'OK', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
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
      {/* Header */}
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

      {/* Navigation */}
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
        {/* DASHBOARD */}
        {viewMode === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Control Units', value: stats.controlUnits, icon: Building2, color: 'blue' },
                { label: 'Readers', value: stats.readers, icon: Package, color: 'indigo' },
                { label: 'Media Items', value: stats.media, icon: Boxes, color: 'teal' },
                { label: 'Low Stock', value: stats.lowStock, icon: AlertCircle, color: 'red' },
                { label: 'Customers', value: stats.totalCustomers, icon: Users, color: 'cyan' },
                { label: 'Total Sales', value: `$${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'green' },
                { label: 'Pending', value: stats.pendingInvoices, icon: FileText, color: 'orange' },
                { label: 'Total Products', value: stats.totalProducts, icon: Boxes, color: 'slate' },
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
          </div>
        )}

        {/* INVENTORY WITH LOGICAL ORGANIZATION */}
        {viewMode === 'inventory' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by SKU or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Organized Inventory */}
            <div className="space-y-6">
              {/* CONTROL UNITS */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('CONTROL_UNITS')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Control Units</h3>
                      <p className="text-sm text-slate-600">Central controllers for access management</p>
                    </div>
                  </div>
                  {expandedCategories.has('CONTROL_UNITS') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('CONTROL_UNITS') && (
                  <div className="p-4 space-y-4">
                    {Object.entries(PRODUCT_LINES.CONTROL_UNITS.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.CONTROL_UNITS[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                            <p className="text-sm opacity-90">{subcat.description}</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                    <div className="flex gap-2 mt-1">
                                      {subcat.features.map((feat: string) => (
                                        <span key={feat} className="text-xs px-2 py-0.5 bg-slate-100 rounded">{feat}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* READERS */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('READERS')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-indigo-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Readers</h3>
                      <p className="text-sm text-slate-600">Access control devices</p>
                    </div>
                  </div>
                  {expandedCategories.has('READERS') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('READERS') && (
                  <div className="p-4 space-y-4">
                    {Object.entries(PRODUCT_LINES.READERS.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.READERS[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                            <p className="text-sm opacity-90">{subcat.description}</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MEDIA */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('MEDIA')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-teal-100 border-b border-teal-200"
                >
                  <div className="flex items-center gap-3">
                    <Boxes className="w-6 h-6 text-teal-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Media</h3>
                      <p className="text-sm text-slate-600">NFC cards, keychains, stickers, bracelets</p>
                    </div>
                  </div>
                  {expandedCategories.has('MEDIA') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('MEDIA') && (
                  <div className="p-4 space-y-4">
                    {Object.entries(PRODUCT_LINES.MEDIA.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.MEDIA[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                            <p className="text-sm opacity-90">{subcat.description}</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ACCESSORIES */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('ACCESSORIES')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-slate-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Accessories</h3>
                      <p className="text-sm text-slate-600">Additional components and add-ons</p>
                    </div>
                  </div>
                  {expandedCategories.has('ACCESSORIES') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('ACCESSORIES') && (
                  <div className="p-4">
                    {Object.entries(PRODUCT_LINES.ACCESSORIES.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.ACCESSORIES[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SALES */}
        {viewMode === 'sales' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
              <button 
                onClick={() => setShowInvoiceModal(true)}
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{invoice.invoice_number}</td>
                        <td className="px-4 py-3 text-slate-600">{invoice.customer?.company_name}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(invoice.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">${invoice.total_amount?.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            invoice.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            invoice.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => deleteInvoice(invoice.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invoices.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>No invoices yet. Create your first invoice!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CUSTOMERS */}
        {viewMode === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Customers</h2>
              <button 
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(customer => (
                <div key={customer.id} className="bg-white rounded-xl p-5 border border-slate-200">
                  <h3 className="font-bold text-slate-900 text-lg">{customer.company_name}</h3>
                  {customer.contact_name && <p className="text-slate-600">{customer.contact_name}</p>}
                  <div className="mt-3 space-y-1 text-sm text-slate-500">
                    {customer.email && <p className="flex items-center gap-2">📧 {customer.email}</p>}
                    {customer.phone && <p className="flex items-center gap-2">📞 {customer.phone}</p>}
                    {customer.address && <p className="flex items-center gap-2">📍 {customer.address}</p>}
                  </div>
                </div>
              ))}
              {customers.length === 0 && (
                <div className="col-span-full p-8 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>No customers yet. Add your first customer!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Create New Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              {/* Add Items */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Add Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={selectedProduct}
                    onChange={(e) => {
                      setSelectedProduct(e.target.value);
                      const p = products.find(prod => prod.id === e.target.value);
                      if (p) setSelectedPrice(0);
                    }}
                    className="px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Product</option>
                    {products.filter(p => p.in_stock > 0).map(p => (
                      <option key={p.id} value={p.id}>{p.product_code} - {p.description} (Stock: {p.in_stock})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
                    min={1}
                    className="px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                    className="px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <button 
                    onClick={addItemToInvoice}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>

              {/* Items List */}
              {invoiceItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Product</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Qty</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Price</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-xs text-slate-500">{item.product_code}</p>
                          </td>
                          <td className="px-4 py-2">{item.quantity}</td>
                          <td className="px-4 py-2">${item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-2 font-medium">${item.total_price.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <button 
                              onClick={() => removeInvoiceItem(idx)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                <span className="text-lg font-medium text-slate-700">Total:</span>
                <span className="text-2xl font-bold text-slate-900">${invoiceTotal.toFixed(2)}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl h-24 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={createInvoice}
                  disabled={!selectedCustomer || invoiceItems.length === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Customer</h2>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={customerForm.company_name}
                  onChange={(e) => setCustomerForm({...customerForm, company_name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  placeholder="Company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={customerForm.contact_name}
                  onChange={(e) => setCustomerForm({...customerForm, contact_name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  placeholder="Contact person"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  placeholder="email@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  placeholder="Phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl h-20 resize-none"
                  placeholder="Full address"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={createCustomer}
                  disabled={!customerForm.company_name}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
