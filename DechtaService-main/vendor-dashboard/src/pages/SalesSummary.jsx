import { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import ChartComponent from '../components/charts/ChartComponent';

const SalesSummary = ({ orders, products, notify }) => {
  const [range, setRange] = useState('today');

  const filtered = useMemo(() => {
    const now = new Date(); const oneDay = 86400000;
    return orders.filter(o => {
      const diff = now - new Date(o.date);
      if (range==='today') return new Date(o.date).toDateString()===now.toDateString();
      if (range==='week')  return diff<=7*oneDay;
      if (range==='month') return diff<=30*oneDay;
      if (range==='year')  return diff<=365*oneDay;
      if (range==='2year') return diff<=2*365*oneDay;
      return true;
    });
  },[orders,range]);

  const catData = useMemo(() => {
    const c={};
    filtered.forEach(o => { const p=products.find(x=>x.name===o.productName); const cat=p?.category||'Others'; c[cat]=(c[cat]||0)+Number(o.totalAmount); });
    return { labels:Object.keys(c), datasets:[{ data:Object.values(c), backgroundColor:['#0ceded','#3B82F6','#10B981','#F43F5E','#8B5CF6'], borderWidth:0, hoverOffset:10 }] };
  },[filtered,products]);

  const trendData = useMemo(() => {
    const d={};
    filtered.forEach(o => { d[o.date]=(d[o.date]||0)+Number(o.totalAmount); });
    return { labels:Object.keys(d), datasets:[{ label:'Revenue', data:Object.values(d), backgroundColor:'#0ceded', borderRadius:6, barThickness:30 }] };
  },[filtered]);

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
          <p className="text-xs text-gray-500 mt-1">Understand your sales by time period & category.</p>
        </div>
        <button onClick={() => notify('Report downloaded','success')} className="text-xs font-bold text-blue-500 hover:underline">Download Report</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[['today','Today'],['week','This Week'],['month','This Month'],['year','This Year'],['2year','2 Years'],['5year','5 Years']].map(([k,l]) => (
          <button key={k} onClick={() => setRange(k)}
            className={`px-3 py-1 text-xs rounded-full font-bold ${range===k?'bg-[#0ceded] text-black':'bg-gray-800 text-gray-300'}`}>{l}</button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-bold mb-6 text-gray-700 dark:text-gray-300">Revenue by Category</h3>
          <div className="h-64 flex justify-center items-center">
            <ChartComponent key={JSON.stringify(catData)} type="doughnut" data={catData} options={{plugins:{legend:{position:'bottom'}}}} id="pieChart" />
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-bold mb-6 text-gray-700 dark:text-gray-300">Sales Trend</h3>
          <div className="h-64">
            <ChartComponent key={JSON.stringify(trendData)} type="bar" data={trendData} options={{scales:{y:{beginAtZero:true,grid:{display:false}}}}} id="barChart" />
          </div>
        </Card>
      </div>
    </div>
  );
};
export default SalesSummary;
