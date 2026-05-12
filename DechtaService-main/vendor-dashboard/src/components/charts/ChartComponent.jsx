import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const ChartComponent = ({ type, data, options, id }) => {
  const chartRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      type, data,
      options: { ...options, responsive:true, maintainAspectRatio:false, animation:{duration:1000,easing:'easeOutQuart'} },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, type]);
  return <div className="relative h-full w-full"><canvas ref={canvasRef} id={id} /></div>;
};
export default ChartComponent;
