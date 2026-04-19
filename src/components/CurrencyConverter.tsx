import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, RefreshCw } from 'lucide-react';

const CurrencyConverter: React.FC = () => {
  const [amount, setAmount] = useState<number>(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('ZMW');
  const [isLoading, setIsLoading] = useState(false);
  const [manualRates, setManualRates] = useState({
    USD: 25.5,
    CNY: 3.5,
    ZMW: 1
  });

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data.rates && data.rates.ZMW) {
        const usdToZmw = data.rates.ZMW;
        const usdToCny = data.rates.CNY;
        const cnyToZmw = usdToZmw / usdToCny;
        
        setManualRates({
          USD: Number(usdToZmw.toFixed(2)),
          CNY: Number(cnyToZmw.toFixed(2)),
          ZMW: 1
        });
      }
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }
  ];

  const convert = (val: number, from: string, to: string) => {
    const fromRate = manualRates[from as keyof typeof manualRates];
    const toRate = manualRates[to as keyof typeof manualRates];
    return (val * fromRate) / toRate;
  };

  const result = convert(amount, fromCurrency, toCurrency);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-editorial font-bold text-brand-gold uppercase tracking-widest italic">Currency Converter</h2>
        <p className="text-gray-400 font-medium italic-editorial text-sm">Real-time rates synced with global markets</p>
      </div>

      <div className="glass-card p-8 space-y-8">
        <div className="flex justify-end">
          <button 
            onClick={fetchRates}
            disabled={isLoading}
            className="flex items-center space-x-2 text-[10px] text-brand-gold uppercase tracking-widest hover:underline disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Live Rates'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block text-xs text-gray-400 uppercase tracking-widest">Amount to Convert</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold font-bold">
                {currencies.find(c => c.code === fromCurrency)?.symbol}
              </span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-2xl font-mono focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div className="flex gap-2">
              {currencies.map(c => (
                <button
                  key={c.code}
                  onClick={() => setFromCurrency(c.code)}
                  className={`flex-1 py-2 rounded-xl border transition-all ${
                    fromCurrency === c.code 
                      ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' 
                      : 'border-white/10 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs text-gray-400 uppercase tracking-widest">Converted Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-pink font-bold">
                {currencies.find(c => c.code === toCurrency)?.symbol}
              </span>
              <div className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-2xl font-mono text-brand-pink">
                {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex gap-2">
              {currencies.map(c => (
                <button
                  key={c.code}
                  onClick={() => setToCurrency(c.code)}
                  className={`flex-1 py-2 rounded-xl border transition-all ${
                    toCurrency === c.code 
                      ? 'border-brand-pink bg-brand-pink/10 text-brand-pink' 
                      : 'border-white/10 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 space-y-6">
          <h3 className="text-sm font-bold text-brand-gold uppercase tracking-widest flex items-center space-x-2">
            <Calculator size={18} />
            <span>Exchange Rate Adjustments</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">USD to ZMW Rate</label>
              <input 
                type="number" 
                value={manualRates.USD}
                onChange={(e) => setManualRates({...manualRates, USD: Number(e.target.value)})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">CNY to ZMW Rate</label>
              <input 
                type="number" 
                value={manualRates.CNY}
                onChange={(e) => setManualRates({...manualRates, CNY: Number(e.target.value)})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;
