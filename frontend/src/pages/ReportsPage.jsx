import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import api from '../services/api';

const ReportsPage = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/reports/summary');
      setSummary(response.data);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-blue-600">Reports</p>
        <h1 className="text-3xl font-semibold text-slate-800">Advanced Reporting Hub</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Students', summary?.total_students],
          ['Present Today', summary?.present_today],
          ['Faculty Count', summary?.faculty_count],
          ['Attendance %', `${summary?.attendance_percentage ?? 0}%`],
        ].map(([label, value]) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200/70 bg-white/70 p-5 shadow-lg shadow-slate-200/50">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
        <h2 className="text-lg font-semibold text-slate-800">Export & Snapshot</h2>
        <p className="mt-2 text-sm text-slate-500">Generate daily, weekly, monthly, and semester reports with CSV, PDF, and Excel export workflows.</p>
      </motion.div>
    </div>
  );
};

export default ReportsPage;
