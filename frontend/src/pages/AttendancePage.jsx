import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AttendancePage = () => {
  const { register, handleSubmit, reset, setValue } = useForm();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/attendance/today');
      setRecords(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await api.post('/attendance/mark', {
        student_id: Number(data.student_id),
        faculty_id: Number(data.faculty_id),
        subject_id: Number(data.subject_id),
        confidence: Number(data.confidence || 0),
        method: data.method || 'face',
      });
      toast.success('Attendance marked');
      reset();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Attendance could not be marked');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-blue-600">Attendance</p>
        <h1 className="text-3xl font-semibold text-slate-800">Faculty Attendance Console</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Mark Attendance</h2>
        {user && (['admin', 'faculty'].includes(String(user.role || '').toLowerCase())) ? (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <input {...register('student_id', { required: true })} type="number" placeholder="Student ID" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input {...register('faculty_id', { required: true })} type="number" placeholder="Faculty ID" className="rounded-2xl border border-slate-200 px-4 py-3" defaultValue={user && String(user.role || '').toLowerCase() === 'faculty' ? user.id : undefined} readOnly={user && String(user.role || '').toLowerCase() === 'faculty'} />
            <input {...register('subject_id', { required: true })} type="number" placeholder="Subject ID" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input {...register('confidence')} type="number" step="0.1" placeholder="Confidence" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <button disabled={submitting} className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300 md:col-span-2">
              {submitting ? 'Submitting…' : 'Submit Attendance'}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
            Only faculty or administrators can submit attendance
          </div>
        )}
      </motion.div>

      <div className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Today&apos;s Attendance</h2>
        {loading ? <div className="text-sm text-slate-500">Loading attendance…</div> : null}
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">Student {record.student_id}</p>
                <p className="text-sm text-slate-500">Faculty {record.faculty_id} • Subject {record.subject_id}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-600">{record.confidence}% confidence</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
