import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Receipt, Search, Plus, FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';

interface ZRAPayment {
  id: string;
  amount: number;
  reference: string;
  type: string;
  status: string;
  timestamp: any;
  notes?: string;
}

const ZRAPayments: React.FC = () => {
  const [payments, setPayments] = useState<ZRAPayment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    amount: 0,
    reference: '',
    type: 'VAT',
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'zra_payments'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ZRAPayment));
      setPayments(items);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      await addDoc(collection(db, 'zra_payments'), {
        ...formData,
        status: 'Processed',
        timestamp: serverTimestamp()
      });
      toast.success('ZRA Payment recorded successfully!');
      setIsModalOpen(false);
      setFormData({ amount: 0, reference: '', type: 'VAT', notes: '' });
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display font-bold text-brand-gold">ZRA Compliance</h2>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg"
            >
              <Plus size={20} />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold">Payment History</h3>
            <button className="text-xs text-brand-gold hover:underline flex items-center space-x-1">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest">Date</th>
                  <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest">Reference</th>
                  <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest">Type</th>
                  <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest">Amount</th>
                  <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-gray-400">
                      {payment.timestamp?.toDate ? format(payment.timestamp.toDate(), 'MMM dd, yyyy') : 'Pending...'}
                    </td>
                    <td className="p-4 font-mono text-sm">{payment.reference}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold">{payment.type}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-brand-gold">K{payment.amount.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1 text-green-400">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-bold uppercase">Processed</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-gray-500 italic">No payment records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-brand-gold/5 border-brand-gold/20">
            <h3 className="text-lg font-bold text-brand-gold mb-4 flex items-center space-x-2">
              <AlertCircle size={20} />
              <span>Tax Summary</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total VAT Paid</span>
                <span className="font-mono font-bold">K{payments.filter(p => p.type === 'VAT').reduce((s, p) => s + p.amount, 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Income Tax</span>
                <span className="font-mono font-bold">K{payments.filter(p => p.type === 'Income Tax').reduce((s, p) => s + p.amount, 0).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="font-bold">Total Compliance</span>
                <span className="text-xl font-mono font-bold text-brand-gold">K{payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Quick Links</h3>
            <div className="space-y-2">
              {['ZRA Portal', 'Tax Calculator', 'Compliance Guide'].map(link => (
                <button key={link} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm flex justify-between items-center group">
                  <span>{link}</span>
                  <FileText size={16} className="text-gray-500 group-hover:text-brand-gold" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 sm:p-8 my-auto sm:my-8"
            >
              <h3 className="text-2xl font-display font-bold text-brand-gold mb-6 text-center">Record ZRA Payment</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Payment Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                  >
                    <option value="VAT" className="bg-brand-dark">VAT</option>
                    <option value="Income Tax" className="bg-brand-dark">Income Tax</option>
                    <option value="Customs" className="bg-brand-dark">Customs & Excise</option>
                    <option value="Other" className="bg-brand-dark">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Reference Number</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. ZRA-2024-XXXX"
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Amount (K)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Notes</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold h-20 resize-none"
                  />
                </div>
                <div className="flex space-x-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg"
                  >
                    Save Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ZRAPayments;
