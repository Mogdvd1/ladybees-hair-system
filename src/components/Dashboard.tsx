import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import { 
  TrendingUp, 
  Package, 
  Users, 
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { motion } from 'motion/react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    productCount: 0,
    customerCount: 0,
    lowStockCount: 0
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Stats
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({
        ...prev,
        productCount: snapshot.size,
        lowStockCount: docs.filter(d => (d.stock || 0) <= (d.minStock || 5)).length
      }));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setStats(prev => ({ ...prev, customerCount: snapshot.size }));
    });

    let unsubSales = () => {};
    if (isAdmin) {
      unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
        const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
        setStats(prev => ({ ...prev, totalSales: total }));

        // Process Sales Chart Data (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), i);
          return {
            date: format(date, 'yyyy-MM-dd'),
            name: format(date, 'EEE'),
            sales: 0,
            rawDate: date
          };
        }).reverse();

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const saleDate = data.timestamp?.toDate ? format(data.timestamp.toDate(), 'yyyy-MM-dd') : null;
          const dayMatch = last7Days.find(d => d.date === saleDate);
          if (dayMatch) {
            dayMatch.sales += (data.total || 0);
          }
        });
        setSalesData(last7Days);

        // Process Category Data
        const categories: { [key: string]: number } = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          data.items?.forEach((item: any) => {
            // Note: We don't have category in sales items yet, 
            // but we can group by item name or fetch from products.
            // For now, let's group by item name as a proxy for "Top Items"
            categories[item.name] = (categories[item.name] || 0) + (item.price * item.quantity);
          });
        });
        
        const topCategories = Object.entries(categories)
          .map(([name, value]) => ({ name, sales: value }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);
        
        setCategoryData(topCategories);
      });
    }

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubSales();
    };
  }, [isAdmin]);

  const statCards = [
    { label: 'Total Sales', value: `ZK ${stats.totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-brand-gold', adminOnly: true },
    { label: 'Products', value: stats.productCount.toString(), icon: Package, color: 'text-brand-pink' },
    { label: 'Customers', value: stats.customerCount.toString(), icon: Users, color: 'text-blue-400' },
    { label: 'Low Stock Alerts', value: stats.lowStockCount.toString(), icon: AlertTriangle, color: 'text-red-400', adminOnly: true },
  ].filter(card => !card.adminOnly || isAdmin);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-display font-bold text-brand-gold uppercase tracking-widest italic">
          Welcome back, {user?.displayName?.split(' ')[0] || 'Admin'}
        </h2>
        <p className="text-brand-gold font-bold italic-editorial text-base">
          Here's what's happening at Lady Bee's Hair With Flair® today.
        </p>
      </header>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              {/* Optional: Calculate real growth if needed */}
              <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Live</span>
            </div>
            <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
              <TrendingUp className="text-brand-gold" size={20} />
              <span>Sales Overview (7 Days)</span>
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#D4AF37' }}
                    formatter={(value: number) => [`ZK ${value.toLocaleString()}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#D4AF37" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
              <Package className="text-brand-pink" size={20} />
              <span>Top Selling Products</span>
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#FF69B4' }}
                    formatter={(value: number) => [`ZK ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="sales" fill="#FF69B4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
