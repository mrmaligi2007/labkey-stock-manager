import { useState, useMemo, useEffect } from 'react';
import { 
  Package, Search, Plus, Minus, Download, RefreshCw, LogOut, 
  LayoutDashboard, Boxes, FileText, Users, Building2, ShoppingCart,
  AlertCircle, DollarSign, CheckCircle2, TrendingUp, Printer,
  Trash2, X, ArrowLeft
} from 'lucide-react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { initialProducts } from './data/products';
import { isControlUnit, isReader, getProductCategory } from './lib/labkey-systems';

// Types
type ViewMode = 'dashboard' | 'inventory' | 'sales' | 'customers';

interface Customer {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InvoiceItem {
  product_id: string;
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  date: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  notes?: string;
  items?: InvoiceItem[];
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Invoice creation state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

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
      const { data: productsData } = await supabase.from('products').select('*').order('product_code');
      setProducts(productsData || initialProducts);

      const { data: customersData } = await supabase.from('customers').select('*').order('company_name');
      setCustomers(customersData || []);

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*, customer:customers(*), items:invoice_items(*)')
        .order('date', { ascending: false });
      setInvoices(invoicesData || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateStock = async (productCode: string, delta: number) => {
    const product = products.find(p => p.product_code === productCode);
    if (!product) return;
    
    const newStock = Math.max(0, product.in_stock + delta);
    
    try {
      await supabase.from('products').update({ in_stock: newStock }).eq('product_code', productCode);
      setProducts(prev => prev.map(p => p.product_code === productCode ? { ...p, in_stock: newStock } : p));
    } catch (err) {
      alert('Failed to update stock');
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeTab === 'control-units') filtered = filtered.filter(p => isControlUnit(p.product_code));
    if (activeTab === 'readers') filtered = filtered.filter(p => isReader(p.product_code));
    if (activeTab === 'media') filtered = filtered.filter(p => p.product_code.startsWith('LK-GN'));
    return filtered;
  }, [products, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const totalSales = invoices.reduce((sum, inv) => inv.status !== 'cancelled' ? sum + (inv.total_amount || 0) : sum, 0);
    return {
      totalProducts: products.length,
      controlUnits: products.filter(p => isControlUnit(p.product_code)).length,
      readers: products.filter(p => isReader(p.product_code)).length,
      lowStock: products.filter(p => p.in_stock <= (p.min_stock || 0)).length,
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      totalSales,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length
    };
  }, [products, customers, invoices]);

  const addItemToInvoice = (productId: string, qty: number, price: number) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.in_stock < qty) {
      alert('Insufficient stock!');
      return;
    }
    
    setInvoiceItems([...invoiceItems, {
      product_id: product.id,
      product_code: product.product_code,
      description: product.description,
      quantity: qty,
      unit_price: price,
      total_price: qty * price
    }]);
  };

  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.total_price, 0);

  const createInvoice = async () => {
    if (!selectedCustomer || invoiceItems.length === 0) {
      alert('Please select customer and add items');
      return;
    }

    try {
      const { data: invoice } = await supabase
        .from('invoices')
        .insert([{ customer_id: selectedCustomer, total_amount: invoiceTotal, notes: invoiceNotes }])
        .select()
        .single();

      await supabase.from('invoice_items').insert(
        invoiceItems.map(item => ({ ...item, invoice_id: invoice.id }))
      );

      // Deduct stock
      for (const item of invoiceItems) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase.from('products
