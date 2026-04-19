import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, arrayUnion, orderBy, increment, serverTimestamp, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Clock, Search, Plus, Calendar, AlertCircle, Trash2, Package, CheckCircle2, LayoutGrid, List as ListIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format, addDays, isAfter, subDays } from 'date-fns';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface LayByAgreement {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: string;
  totalAmount: number;
  paidAmount: number;
  status: 'active' | 'completed' | 'cancelled';
  dueDate: string;
  period: string;
  createdAt: string;
  deductStock: boolean;
  payments: {
    amount: number;
    date: string;
    note: string;
    proofImage?: string;
  }[];
}

const LayBy: React.FC = () => {
  const [agreements, setAgreements] = useState<LayByAgreement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<{id: string, name: string, phone: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('1 month');
  const [paymentModal, setPaymentModal] = useState<{ id: string, currentPaid: number, total: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    items: '',
    totalAmount: 0,
    deposit: 0,
    backdate: '',
    deductStock: true
  });

  const [selectedProducts, setSelectedProducts] = useState<{id: string, name: string, price: number, quantity: number}[]>([]);

  const periods = [
    { label: '1 Week', value: '1 week', days: 7 },
    { label: '1 Month', value: '1 month', days: 30 },
    { label: '2 Months', value: '2 months', days: 60 }
  ];

  useEffect(() => {
    const q = query(collection(db, 'laybys'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LayByAgreement));
      setAgreements(items);
    });

    const qProd = query(collection(db, 'products'));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items);
    });

    const qCust = query(collection(db, 'customers'), orderBy('name'));
    const unsubCust = onSnapshot(qCust, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().name, 
        phone: doc.data().phone 
      }));
      setCustomers(items);
    });

    // Check for pending customer from other tabs
    const pending = localStorage.getItem('pendingLayByCustomer');
    if (pending) {
      const customer = JSON.parse(pending);
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone
      }));
      setIsModalOpen(true);
      localStorage.removeItem('pendingLayByCustomer');
    }

    return () => {
      unsubscribe();
      unsubProd();
      unsubCust();
    };
  }, []);

  const selectCustomer = (customer: {id: string, name: string, phone: string}) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone
    }));
    setCustomerSearch('');
  };

  const addToAgreement = (product: Product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    
    // Auto-update total amount
    setFormData(prev => ({
      ...prev,
      totalAmount: prev.totalAmount + product.price,
      items: prev.items ? `${prev.items}, ${product.name}` : product.name
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const periodObj = periods.find(p => p.value === selectedPeriod);
      const startDate = formData.backdate ? new Date(formData.backdate) : new Date();
      const dueDate = addDays(startDate, periodObj?.days || 30);

      // 1. Deduct Stock if requested
      if (formData.deductStock) {
        for (const item of selectedProducts) {
          const productRef = doc(db, 'products', item.id);
          await updateDoc(productRef, {
            stock: increment(-item.quantity)
          });
        }
      }

      // 2. Add/Update Customer
      let customerId = formData.customerId;
      if (!customerId) {
        // Try to find existing customer by phone first to avoid duplicates
        const q = query(collection(db, 'customers'), where('phone', '==', formData.customerPhone));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          customerId = snap.docs[0].id;
          const customerRef = doc(db, 'customers', customerId);
          await updateDoc(customerRef, {
            lastVisit: new Date().toISOString(),
            totalSpent: increment(formData.deposit)
          });
        } else {
          const custRef = await addDoc(collection(db, 'customers'), {
            name: formData.customerName,
            phone: formData.customerPhone,
            createdAt: startDate.toISOString(),
            totalSpent: formData.deposit,
            lastVisit: new Date().toISOString(),
            type: 'Lay-by'
          });
          customerId = custRef.id;
        }
      } else {
        // Update existing selected customer
        const customerRef = doc(db, 'customers', customerId);
        await updateDoc(customerRef, {
          lastVisit: new Date().toISOString(),
          totalSpent: increment(formData.deposit)
        });
      }

      // 3. Create Agreement
      await addDoc(collection(db, 'laybys'), {
        customerId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        items: formData.items,
        totalAmount: formData.totalAmount,
        paidAmount: formData.deposit,
        period: selectedPeriod,
        dueDate: dueDate.toISOString(),
        status: 'active',
        createdAt: startDate.toISOString(),
        deductStock: formData.deductStock,
        payments: [{
          amount: formData.deposit,
          date: startDate.toISOString(),
          note: 'Initial Deposit'
        }]
      });

      handleCloseModal();
      toast.success('Agreement created successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create agreement');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ 
      customerId: '',
      customerName: '', 
      customerPhone: '', 
      items: '', 
      totalAmount: 0, 
      deposit: 0,
      backdate: '',
      deductStock: true
    });
    setSelectedProducts([]);
    setProductSearch('');
    setCustomerSearch('');
  };

  const [viewingHistory, setViewingHistory] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // ~800KB limit for Firestore
        toast.error('File too large. Please upload an image smaller than 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentModal || !paymentAmount || isNaN(Number(paymentAmount))) return;

    const { id, currentPaid, total } = paymentModal;
    const amount = Number(paymentAmount);
    const newPaid = currentPaid + amount;
    const status = newPaid >= total ? 'completed' : 'active';

    console.log(`Recording payment of ZK ${amount} for agreement ${id}`);

    try {
      const ref = doc(db, 'laybys', id);
      await updateDoc(ref, {
        paidAmount: newPaid,
        status,
        payments: arrayUnion({
          amount: amount,
          date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
          note: 'Installment',
          proofImage: paymentProof
        })
      });

      // Update customer totalSpent
      const agreement = agreements.find(a => a.id === id);
      if (agreement?.customerId) {
        const customerRef = doc(db, 'customers', agreement.customerId);
        await updateDoc(customerRef, {
          totalSpent: increment(amount),
          lastVisit: new Date().toISOString()
        });
      }

      toast.success('Payment recorded!');
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentDate('');
      setPaymentProof('');
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Failed to record payment: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'laybys', deleteId));
      toast.success('Agreement deleted');
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to delete agreement');
    }
  };

  const filteredAgreements = agreements.filter(a => {
    const matchesSearch = a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.customerPhone.includes(searchTerm);
    
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    
    const isOverdue = a.status === 'active' && isAfter(new Date(), new Date(a.dueDate));
    
    if (statusFilter === 'overdue') return isOverdue;
    if (statusFilter === 'active') return a.status === 'active' && !isOverdue;
    if (statusFilter === 'completed') return a.status === 'completed';
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-editorial font-bold text-brand-gold uppercase tracking-widest italic">Lay-by Management</h2>
          <p className="text-[10px] text-brand-pink font-medium italic-editorial tracking-widest uppercase mt-1">Installment Plans</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-gold text-brand-dark shadow-lg' : 'text-gray-400 hover:text-white'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-gold text-brand-dark shadow-lg' : 'text-gray-400 hover:text-white'}`}
              title="List View"
            >
              <ListIcon size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search agreements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold w-64"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg"
          >
            <Plus size={20} />
            <span>New Agreement</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'active', 'overdue', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              statusFilter === status 
                ? 'bg-brand-gold border-brand-gold text-brand-dark shadow-lg shadow-brand-gold/20' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {status}
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-black/20 text-[10px]">
              {status === 'all' 
                ? agreements.length 
                : agreements.filter(a => {
                    const isOverdue = a.status === 'active' && isAfter(new Date(), new Date(a.dueDate));
                    if (status === 'overdue') return isOverdue;
                    if (status === 'active') return a.status === 'active' && !isOverdue;
                    if (status === 'completed') return a.status === 'completed';
                    return false;
                  }).length
              }
            </span>
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAgreements.map((agreement) => {
            const isOverdue = agreement.status === 'active' && isAfter(new Date(), new Date(agreement.dueDate));
            const progress = (agreement.paidAmount / agreement.totalAmount) * 100;

            return (
              <motion.div 
                key={agreement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-6 relative overflow-hidden ${isOverdue ? 'border-red-500/50' : ''}`}
              >
                {isOverdue && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                    Overdue
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">{agreement.customerName}</h4>
                    <p className="text-xs text-gray-400">{agreement.customerPhone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      agreement.status === 'completed' ? 'bg-green-400/10 text-green-400' : 'bg-brand-gold/10 text-brand-gold'
                    }`}>
                      {agreement.status}
                    </span>
                    <button 
                      onClick={() => setViewingHistory(agreement.id)}
                      className="text-[10px] text-brand-pink hover:underline uppercase tracking-widest"
                    >
                      View History
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Items:</span>
                    <span className="text-white truncate max-w-[150px]">{agreement.items}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Due Date:</span>
                    <span className="text-brand-pink">{format(new Date(agreement.dueDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Period:</span>
                    <span className="text-gray-300 uppercase text-[10px]">{agreement.period}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-brand-gold font-mono">ZK {agreement.paidAmount.toLocaleString()} / ZK {agreement.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Balance Due</span>
                    <span className="text-brand-pink font-mono font-bold">ZK {(agreement.totalAmount - agreement.paidAmount).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full gold-gradient"
                    />
                  </div>
                </div>

                {agreement.status === 'active' && (
                  <button 
                    onClick={() => {
                      console.log('Opening payment modal for:', agreement.id);
                      setPaymentModal({ id: agreement.id, currentPaid: agreement.paidAmount, total: agreement.totalAmount });
                    }}
                    className="w-full py-2 rounded-lg border border-brand-gold/30 text-brand-gold text-sm font-bold hover:bg-brand-gold/10 transition-colors flex items-center justify-center space-x-2 relative z-20"
                  >
                    <Plus size={16} />
                    <span>Record Payment</span>
                  </button>
                )}

                {/* Payment History Modal Overlay */}
                <AnimatePresence>
                  {viewingHistory === agreement.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-brand-dark/95 backdrop-blur-md p-6 z-10 overflow-y-auto"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <h5 className="text-brand-gold font-bold uppercase tracking-widest text-xs">Payment History</h5>
                        <button onClick={() => setViewingHistory(null)} className="text-gray-400 hover:text-white"><Trash2 size={16} className="rotate-45" /></button>
                      </div>
                      <div className="space-y-4">
                        {agreement.payments?.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold text-white">ZK {p.amount.toLocaleString()}</p>
                                <span className="text-[10px] text-brand-pink italic">{p.note}</span>
                              </div>
                              <p className="text-[10px] text-gray-400">{format(new Date(p.date), 'MMM dd, HH:mm')}</p>
                              {p.proofImage && (
                                <a 
                                  href={p.proofImage} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="mt-2 block text-[10px] text-brand-gold hover:underline flex items-center space-x-1"
                                >
                                  <span>View Proof</span>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Customer</th>
                  <th className="px-6 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Items</th>
                  <th className="px-6 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total</th>
                  <th className="px-6 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Balance</th>
                  <th className="px-6 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Due Date</th>
                  <th className="px-6 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Status</th>
                  <th className="px-6 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAgreements.map((agreement) => {
                  const balance = agreement.totalAmount - agreement.paidAmount;
                  return (
                    <tr key={agreement.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-white group-hover:text-brand-gold transition-colors">{agreement.customerName}</p>
                          <p className="text-[10px] text-gray-500">{agreement.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 truncate max-w-[200px]">{agreement.items}</td>
                      <td className="px-6 py-4 font-mono text-gray-300">ZK {agreement.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono text-brand-pink font-bold">ZK {balance.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{format(new Date(agreement.dueDate), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          agreement.status === 'completed' 
                            ? 'bg-green-500/10 text-green-500' 
                            : (agreement.status === 'active' && isAfter(new Date(), new Date(agreement.dueDate)))
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-brand-pink/10 text-brand-pink'
                        }`}>
                          {(agreement.status === 'active' && isAfter(new Date(), new Date(agreement.dueDate))) ? 'overdue' : agreement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {agreement.status === 'active' && (
                            <button 
                              onClick={() => setPaymentModal({ id: agreement.id, currentPaid: agreement.paidAmount, total: agreement.totalAmount })}
                              className="p-2 text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-colors"
                              title="Payment"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => setDeleteId(agreement.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-2xl p-6 sm:p-8 my-auto sm:my-8"
            >
              <h3 className="text-2xl font-display font-bold text-brand-gold mb-6 italic">New Lay-by Agreement</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Search Existing Customer</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search by name or phone..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold text-sm"
                        />
                      </div>
                      
                      {customerSearch && (
                        <div className="absolute z-30 mt-1 w-full bg-brand-dark border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                          {customers
                            .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
                            .map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => selectCustomer(c)}
                                className="w-full px-4 py-2 text-left hover:bg-white/5 text-sm border-b border-white/5 last:border-0"
                              >
                                <p className="font-bold text-white">{c.name}</p>
                                <p className="text-[10px] text-gray-400">{c.phone}</p>
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Customer Name</label>
                        <input 
                          required
                          type="text" 
                          value={formData.customerName}
                          onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Phone</label>
                        <input 
                          required
                          type="text" 
                          value={formData.customerPhone}
                          onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Items Reserved (Manual Entry)</label>
                      <textarea 
                        required
                        value={formData.items}
                        onChange={(e) => setFormData({...formData, items: e.target.value})}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold h-20 resize-none text-sm"
                        placeholder="Type items here or select from catalog below..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Total Amount (ZK)</label>
                        <input 
                          required
                          type="number" 
                          value={formData.totalAmount || ''}
                          onChange={(e) => setFormData({...formData, totalAmount: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Initial Deposit (ZK)</label>
                        <input 
                          required
                          type="number" 
                          value={formData.deposit || ''}
                          onChange={(e) => setFormData({...formData, deposit: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Agreement Date</label>
                        <input 
                          type="date" 
                          value={formData.backdate}
                          onChange={(e) => setFormData({...formData, backdate: e.target.value})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold text-sm"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={formData.deductStock}
                            onChange={(e) => setFormData({...formData, deductStock: e.target.checked})}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-gold focus:ring-brand-gold"
                          />
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Deduct from Stock</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search Catalog..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold text-sm"
                      />
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {products
                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addToAgreement(product)}
                            className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-brand-gold/30 transition-all text-left group"
                          >
                            <div>
                              <p className="text-sm font-bold group-hover:text-brand-gold transition-colors">{product.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Stock: {product.stock}</p>
                            </div>
                            <p className="text-xs font-mono text-brand-gold">ZK {product.price.toLocaleString()}</p>
                          </button>
                        ))}
                    </div>

                    <div className="p-4 bg-brand-gold/5 border border-brand-gold/10 rounded-xl">
                      <label className="block text-[10px] text-brand-gold uppercase tracking-widest mb-2 font-bold">Selected Products</label>
                      <div className="space-y-1">
                        {selectedProducts.length === 0 ? (
                          <p className="text-[10px] text-gray-500 italic">No products selected from catalog</p>
                        ) : (
                          selectedProducts.map(p => (
                            <div key={p.id} className="flex justify-between text-[10px]">
                              <span className="text-gray-300">{p.quantity}x {p.name}</span>
                              <span className="text-brand-gold">ZK {(p.price * p.quantity).toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Lay-by Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {periods.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setSelectedPeriod(p.value)}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                          selectedPeriod === p.value 
                            ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' 
                            : 'border-white/10 text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg"
                  >
                    Create Agreement
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {paymentModal && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-start sm:justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full max-w-sm p-6 sm:p-8 my-auto sm:my-8"
            >
              <h3 className="text-xl font-bold text-brand-gold mb-2">Record Payment</h3>
              <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest">Agreement: {agreements.find(a => a.id === paymentModal.id)?.customerName}</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Amount (ZK)</label>
                    <input 
                      autoFocus
                      type="number" 
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold text-lg font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Date (Optional)</label>
                    <input 
                      type="date" 
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Proof of Payment</label>
                  <div className="space-y-2">
                    {paymentProof ? (
                      <div className="relative group">
                        <img 
                          src={paymentProof} 
                          alt="Proof preview" 
                          className="w-full h-40 object-cover rounded-xl border-2 border-brand-gold shadow-2xl"
                        />
                        <button 
                          onClick={() => setPaymentProof('')}
                          className="absolute top-2 right-2 p-2 bg-brand-dark/80 rounded-full text-brand-gold hover:bg-brand-dark transition-colors shadow-lg border border-brand-gold/20"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                          <p className="text-[10px] text-white font-bold text-center">Image Ready</p>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-brand-gold/30 rounded-xl hover:border-brand-gold hover:bg-brand-gold/5 transition-all cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="text-brand-gold" size={24} />
                          </div>
                          <p className="text-sm font-bold text-brand-gold">Upload Receipt</p>
                          <p className="text-[10px] text-gray-500 mt-1">Tap to open camera or gallery</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => { setPaymentModal(null); setPaymentAmount(''); }}
                    className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddPayment}
                    disabled={!paymentAmount || isNaN(Number(paymentAmount))}
                    className="flex-1 py-3 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Agreement?</h3>
              <p className="text-gray-400 text-sm mb-6">This action cannot be undone. All payment history will be lost.</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LayBy;
