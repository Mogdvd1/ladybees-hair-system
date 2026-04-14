import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { Users, Search, Phone, Mail, Calendar, DollarSign, ExternalLink, X, Receipt, Clock, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

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

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display font-bold text-brand-gold">Customer Directory</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold w-80"
          />
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
              <button className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-brand-gold transition-colors">
                <ExternalLink size={16} />
              </button>
            </div>
          </motion.div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500 italic">
            No customers found matching your search.
          </div>
        )}
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
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
