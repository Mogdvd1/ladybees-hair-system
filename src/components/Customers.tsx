import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Users, Search, Phone, Mail, Calendar, DollarSign, ExternalLink, X, Receipt, Clock, ShoppingCart, Edit2, Trash2, AlertCircle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  lastVisit: string;
}

interface Transaction {
  id: string;
  type: 'sale' | 'layby';
  total: number;
  timestamp: any;
  items: any[];
  status?: string;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { isAdmin } = useAuth();

  // Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', email: '' });

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // CSV Import State
  const [isImporting, setIsImporting] = useState(false);

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
          toast.error('CSV file is empty or missing data');
          return;
        }

        // Assume first line is header: Name, Phone, Email
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIdx = headers.indexOf('name');
        const phoneIdx = headers.indexOf('phone');
        const emailIdx = headers.indexOf('email');

        if (nameIdx === -1 || phoneIdx === -1) {
          toast.error('CSV must have "Name" and "Phone" columns');
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const name = values[nameIdx];
          const phone = values[phoneIdx];
          const email = emailIdx !== -1 ? values[emailIdx] : '';

          if (name && phone) {
            try {
              await addDoc(collection(db, 'customers'), {
                name,
                phone,
                email,
                totalSpent: 0,
                lastVisit: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                type: 'Imported'
              });
              successCount++;
            } catch (err) {
              errorCount++;
            }
          }
        }

        toast.success(`Import complete: ${successCount} added, ${errorCount} failed`);
      } catch (err) {
        toast.error('Failed to parse CSV file');
      } finally {
        setIsImporting(false);
        // Reset input
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(items);
    });
    return unsubscribe;
  }, []);

  const fetchHistory = async (customer: Customer) => {
    setLoadingHistory(true);
    setSelectedCustomer(customer);
    try {
      const salesQuery = query(collection(db, 'sales'), where('customerId', '==', customer.id));
      const laybysQuery = query(collection(db, 'laybys'), where('customerId', '==', customer.id));
      
      const [salesSnap, laybysSnap] = await Promise.all([
        getDocs(salesQuery),
        getDocs(laybysQuery)
      ]);

      const sales = salesSnap.docs.map(doc => ({
        id: doc.id,
        type: 'sale' as const,
        ...doc.data()
      })) as Transaction[];

      const laybys = laybysSnap.docs.map(doc => ({
        id: doc.id,
        type: 'layby' as const,
        ...doc.data()
      })) as Transaction[];

      const combined = [...sales, ...laybys].sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setHistory(combined);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const customerRef = doc(db, 'customers', editingCustomer.id);
      await updateDoc(customerRef, {
        name: editFormData.name,
        phone: editFormData.phone,
        email: editFormData.email
      });
      toast.success('Customer updated successfully');
      setEditingCustomer(null);
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error('Failed to update customer');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'customers', deleteId));
      toast.success('Customer deleted successfully');
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error('Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display font-bold text-brand-gold">Customer Directory</h2>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <div className="relative">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
                id="csv-upload"
                disabled={isImporting}
              />
              <label 
                htmlFor="csv-upload"
                className={`flex items-center space-x-2 px-4 py-2 border border-brand-gold/30 text-brand-gold rounded-xl hover:bg-brand-gold/10 transition-colors text-sm font-bold cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
              </label>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold w-64 md:w-80"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <motion.div 
            key={customer.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 space-y-4 hover:border-brand-gold/30 transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold font-display text-xl font-bold">
                {customer.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg truncate group-hover:text-brand-gold transition-colors">{customer.name}</h4>
                <div className="flex items-center text-xs text-gray-400 space-x-2">
                  <Phone size={12} />
                  <span>{customer.phone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Spent</p>
                <p className="font-mono font-bold text-brand-gold">K{customer.totalSpent?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Last Visit</p>
                <p className="text-sm">
                  {customer.lastVisit ? format(new Date(customer.lastVisit), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button 
                onClick={() => fetchHistory(customer)}
                className="text-xs text-brand-pink hover:underline flex items-center space-x-1"
              >
                <Calendar size={14} />
                <span>View History</span>
              </button>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => handleEdit(customer)}
                      className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-brand-gold transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setDeleteId(customer.id)}
                      className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-brand-gold transition-colors">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500 italic">
            No customers found matching your search.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 sm:p-8 my-auto sm:my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-cursive font-bold text-brand-gold">Edit Customer</h3>
                <button onClick={() => setEditingCustomer(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Phone Number</label>
                  <input 
                    required
                    type="text" 
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Email Address (Optional)</label>
                  <input 
                    type="email" 
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                  />
                </div>
                <div className="flex space-x-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="flex-1 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card max-w-sm w-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Delete Customer?</h3>
              <p className="text-gray-400 text-sm mb-8">This will remove the customer from your directory. Transaction history will remain in sales records but will no longer be linked to this profile.</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-bold text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col my-auto sm:my-8"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-brand-dark/50">
                <div>
                  <h3 className="text-xl font-bold text-brand-gold">{selectedCustomer.name}</h3>
                  <p className="text-xs text-gray-400">Transaction History</p>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading history...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 italic">
                    No transaction history found for this customer.
                  </div>
                ) : (
                  history.map((tx) => (
                    <div key={tx.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${tx.type === 'sale' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {tx.type === 'sale' ? <ShoppingCart size={18} /> : <Clock size={18} />}
                          </div>
                          <div>
                            <p className="font-bold capitalize">{tx.type}</p>
                            <p className="text-[10px] text-gray-500">
                              {tx.timestamp ? format(tx.timestamp.toDate(), 'MMM dd, yyyy HH:mm') : 'Date unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-brand-gold">ZK {tx.total.toLocaleString()}</p>
                          {tx.status && (
                            <span className="text-[10px] uppercase tracking-widest text-brand-pink">{tx.status}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="pl-11 space-y-1">
                        {tx.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-400">
                            <span>{item.name} x{item.quantity}</span>
                            <span>ZK {(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Customers;
