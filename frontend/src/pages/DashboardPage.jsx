import { motion } from 'framer-motion';
import { BarChart3, BookOpen, CircleUserRound, Users2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip } from 'chart.js';
import api from '../services/api';
import StatCard from '../components/StatCard';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [summaryRes, studentsRes] = await Promise.all([api.get('/reports/summary'), api.get('/students')]);
      setSummary(summaryRes.data);
      setStudents(studentsRes.data);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-600">Overview</p>
          <h1 className="text-3xl font-semibold text-slate-800">Admin Dashboard</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Students" value={summary?.total_students ?? 0} icon={Users2} tone="blue" />
        <StatCard title="Present Today" value={summary?.present_today ?? 0} icon={BookOpen} tone="green" />
        <StatCard title="Absent Today" value={summary?.absent_today ?? 0} icon={CircleUserRound} tone="red" />
        <StatCard title="Attendance %" value={`${summary?.attendance_percentage ?? 0}%`} icon={BarChart3} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
          <h2 className="text-lg font-semibold text-slate-800"> Attendance Trends</h2>
          <Bar data={{ labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], datasets: [{ label: 'Attendance', data: [24, 28, 21, 30, 27], backgroundColor: '#2563EB' }] }} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
          <h2 className="text-lg font-semibold text-slate-800">Department Split</h2>
          <Doughnut data={{ labels: ['CSE', 'MEC', 'ECE'], datasets: [{ data: [12, 7, 5], backgroundColor: ['#2563EB', '#22C55E', '#F59E0B'] }] }} />
        </motion.div>
      </div>

      <div className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Recent Students</h2>
        </div>
        <div className="space-y-3">
          {students.slice(0, 5).map((student) => (
            <div key={student.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">{student.full_name}</p>
                <p className="text-sm text-slate-500">{student.department} • {student.register_number}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-600">Registered</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
