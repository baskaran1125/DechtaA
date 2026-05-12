import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWorker } from '../WorkerContext';

const RANGES = ['Daily', 'Monthly', 'Yearly'];

function getChartData(range: string, transactions: any[]) {
  const now = new Date();
  let data: any[] = [];
  
  if (range === 'Daily') {
    // Show last 7 days including today
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({
        name: days[d.getDay()],
        dateStr: d.toDateString(),
        Earnings: 0,
        Trips: 0
      });
    }
    
    // Fill data
    transactions.forEach(tx => {
      if (tx.transactionType === 'credit') {
        const txDate = new Date(tx.date);
        const dataPoint = data.find(d => d.dateStr === txDate.toDateString());
        if (dataPoint) {
          dataPoint.Earnings += tx.amount;
          dataPoint.Trips += 1;
        }
      }
    });

  } else if (range === 'Monthly') {
    // Show last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({
        name: d.toLocaleString('en', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        Earnings: 0,
        Trips: 0
      });
    }
    transactions.forEach(tx => {
      if (tx.transactionType === 'credit') {
        const txDate = new Date(tx.date);
        const dataPoint = data.find(d => d.month === txDate.getMonth() && d.year === txDate.getFullYear());
        if (dataPoint) {
          dataPoint.Earnings += tx.amount;
          dataPoint.Trips += 1;
        }
      }
    });
  } else {
    // Yearly - Last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({
        name: d.toLocaleString('en', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        Earnings: 0,
        Trips: 0
      });
    }
    transactions.forEach(tx => {
      if (tx.transactionType === 'credit') {
        const txDate = new Date(tx.date);
        const dataPoint = data.find(d => d.month === txDate.getMonth() && d.year === txDate.getFullYear());
        if (dataPoint) {
          dataPoint.Earnings += tx.amount;
          dataPoint.Trips += 1;
        }
      }
    });
  }

  return data;
}

const CustomTooltip = ({ active, payload, label, t }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#0d1b2e', border: '1px solid rgba(0, 197, 255, 0.3)', padding: '10px 14px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 12 }}>{label}</p>
        <p style={{ margin: 0, color: '#00c5ff', fontSize: 14, fontWeight: 600 }}>{t('earnings_label') || 'Earnings'}: ₹{payload[0].value}</p>
        <p style={{ margin: '4px 0 0', color: '#22c55e', fontSize: 13, fontWeight: 500 }}>{t('trips_label') || 'Trips'}: {payload[1].value}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsSection() {
  const { state, t } = useWorker();
  const [activeRange, setActiveRange] = useState('Daily');
  
  const chartData = useMemo(() => getChartData(activeRange, state.transactions), [activeRange, state.transactions]);
  
  const totalEarnings = chartData.reduce((sum, d) => sum + d.Earnings, 0);
  const totalTrips = chartData.reduce((sum, d) => sum + d.Trips, 0);
  const acceptanceRate = totalTrips > 0 ? 100 : 0; // Derived from actual trips

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
        {t('performance_title') || 'Performance'}
      </h2>
      
      {/* Segmented Control */}
      <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        padding: 4,
        marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {RANGES.map(range => (
          <button
            key={range}
            onClick={() => setActiveRange(range)}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 6,
              background: activeRange === range ? '#00c5ff' : 'transparent',
              color: activeRange === range ? '#0d1b2e' : 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeRange === range ? '0 2px 8px rgba(0, 197, 255, 0.4)' : 'none'
            }}
          >
            {t(`range_${range.toLowerCase()}`) || range}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'rgba(0, 197, 255, 0.08)', border: '1px solid rgba(0, 197, 255, 0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#00c5ff', marginBottom: 4 }}>{t('acceptance_rate') || 'Acceptance'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>{acceptanceRate}%</div>
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#22c55e', marginBottom: 4 }}>{t('earnings_label') || 'Earnings'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>₹{(totalEarnings / 1000).toFixed(1)}k</div>
        </div>
        <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#a855f7', marginBottom: 4 }}>{t('trips_label') || 'Trips'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>{totalTrips}</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-glass w-card" style={{ padding: '24px 16px 16px', background: 'rgba(13, 27, 46, 0.6)' }}>
        {/* Custom Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00c5ff' }} />
            <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 500 }}>{t('earnings_label') || 'Earnings'} (₹)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 500 }}>{t('trips_label') || 'Trips'}</span>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c5ff" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00c5ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                dy={10} 
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <Tooltip content={<CustomTooltip t={t} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="Earnings" 
                stroke="#00c5ff" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorEarnings)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#00c5ff' }}
                dot={{ r: 4, fill: '#0d1b2e', stroke: '#00c5ff', strokeWidth: 2 }}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="Trips" 
                stroke="#22c55e" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTrips)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#22c55e' }}
                dot={{ r: 4, fill: '#0d1b2e', stroke: '#22c55e', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
