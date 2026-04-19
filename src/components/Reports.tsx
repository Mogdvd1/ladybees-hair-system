import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Receipt, Package, Clock, Download, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { format, isToday, isSameDay } from 'date-fns';
import { toast } from 'sonner';

interface Sale {
  id: string;
  total: number;
  paymentMethod: string;
  paymentProvider?: string;
  customerName?: string;
  items?: any[];
  processedBy?: string;
  timestamp: any;
}

interface LayBy {
  id: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
}

const Reports: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [laybys, setLaybys] = useState<LayBy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('timestamp', 'desc')), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });
    const unsubLaybys = onSnapshot(collection(db, 'laybys'), (snapshot) => {
      setLaybys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LayBy)));
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    return () => {
      unsubSales();
      unsubLaybys();
      unsubProducts();
    };
  }, []);

  const dailySales = sales.filter(s => s.timestamp && isSameDay(new Date(s.timestamp.seconds * 1000), selectedDate));
  const totalDailyRevenue = dailySales.reduce((sum, s) => sum + s.total, 0);

  const activeLaybys = laybys.filter(l => l.status === 'active');
  const completedLaybys = laybys.filter(l => l.status === 'completed');
  const overdueLaybys = laybys.filter(l => l.status === 'active' && new Date(l.dueDate) < new Date());

  const lowStockProducts = products.filter(p => p.stock <= 5);

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data available to export for this date');
      return;
    }

    try {
      // Format data for CSV
      const formattedData = data.map(sale => ({
        Date: sale.timestamp ? format(new Date(sale.timestamp.seconds * 1000), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        Customer: sale.customerName || 'Walk-in',
        Total: sale.total,
        Payment_Method: sale.paymentMethod,
        Payment_Provider: sale.paymentProvider || 'N/A',
        Processed_By: sale.processedBy || 'N/A',
        Items: sale.items ? sale.items.map((i: any) => `${i.name}(${i.quantity})`).join('; ') : 'N/A'
      }));

      const headers = Object.keys(formattedData[0]);
      const csvRows = [
        headers.join(','), // Header row
        ...formattedData.map(row => 
          headers.map(header => {
            const val = row[header as keyof typeof row];
            // Escape commas and quotes
            const stringVal = String(val).replace(/"/g, '""');
            return `"${stringVal}"`;
          }).join(',')
        )
      ];

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-brand-gold uppercase tracking-widest italic">Business Reports</h2>
          <p className="text-gray-400 font-medium italic-editorial text-sm">Comprehensive overview of Lady Bee's performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold" size={18} />
            <input 
              type="date" 
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold text-sm"
            />
          </div>
          <button 
            onClick={() => exportToCSV(dailySales, `sales_report_${format(selectedDate, 'yyyy-MM-dd')}`)}
            className="flex items-center space-x-2 px-4 py-2 border border-brand-gold/30 text-brand-gold rounded-xl hover:bg-brand-gold/10 transition-colors text-sm font-bold"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-l-4 border-brand-gold">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-brand-gold/10 rounded-lg text-brand-gold">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Daily Revenue</p>
          <h3 className="text-2xl font-mono font-bold text-white">ZK {totalDailyRevenue.toLocaleString()}</h3>
          <p className="text-[10px] text-gray-500 mt-2">{dailySales.length} transactions today</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-brand-pink">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
              <Clock size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Active Lay-bys</p>
          <h3 className="text-2xl font-mono font-bold text-white">{activeLaybys.length}</h3>
          <p className="text-[10px] text-red-400 mt-2">{overdueLaybys.length} overdue agreements</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-blue-400">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-400/10 rounded-lg text-blue-400">
              <Package size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Inventory Status</p>
          <h3 className="text-2xl font-mono font-bold text-white">{products.length} Items</h3>
          <p className="text-[10px] text-yellow-400 mt-2">{lowStockProducts.length} low stock alerts</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-green-400">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-400/10 rounded-lg text-green-400">
              <Receipt size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Completed Lay-bys</p>
          <h3 className="text-2xl font-mono font-bold text-white">{completedLaybys.length}</h3>
          <p className="text-[10px] text-gray-500 mt-2">Total agreements finalized</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
            <Receipt className="text-brand-gold" size={20} />
            <span>Daily Sales Log</span>
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {dailySales.length === 0 ? (
              <p className="text-center py-10 text-gray-500 italic">No sales recorded for this date</p>
            ) : (
              dailySales.map(sale => (
                <div key={sale.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <div>
                    <p className="text-sm font-bold">{sale.paymentMethod}</p>
                    <p className="text-[10px] text-gray-400">{format(new Date(sale.timestamp.seconds * 1000), 'HH:mm')}</p>
                  </div>
                  <p className="font-mono font-bold text-brand-gold">ZK {sale.total.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
            <AlertCircle className="text-red-400" size={20} />
            <span>Low Stock Alerts</span>
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {lowStockProducts.length === 0 ? (
              <p className="text-center py-10 text-gray-500 italic">All stock levels are healthy</p>
            ) : (
              lowStockProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-red-400/5 rounded-xl border border-red-400/10">
                  <div>
                    <p className="text-sm font-bold">{product.name}</p>
                    <p className="text-[10px] text-gray-400">Current Stock: {product.stock}</p>
                  </div>
                  <p className="text-xs font-bold text-red-400 uppercase">Restock Needed</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
