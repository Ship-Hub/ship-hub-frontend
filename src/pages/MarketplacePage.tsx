import { Helmet } from 'react-helmet-async';
import { Layout } from '../components/Layout';
import { ShoppingBag } from 'lucide-react';

export function MarketplacePage() {
  return (
    <Layout>
      <Helmet><title>Marketplace — ShipHub</title></Helmet>
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,77,77,0.1)', color: 'var(--color-accent)' }}>
            <ShoppingBag size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Marketplace</h1>
            <p className="text-sm text-slate-500">Buy, sell, and share builder resources</p>
          </div>
        </div>

        <div className="rounded-2xl border p-12 text-center"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(255,77,77,0.08)', color: 'var(--color-accent)' }}>
            <ShoppingBag size={28} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Coming Soon</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            The ShipHub Marketplace is under construction. Soon builders will be able to sell
            templates, tools, and services here.
          </p>
        </div>
      </div>
    </Layout>
  );
}
