import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Invalid credentials');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.2),_transparent_40%),linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] p-6">
      <Toaster position="top-right" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/60 bg-white/70 shadow-2xl shadow-blue-100 backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 p-10 text-white">
            <p className="text-sm uppercase tracking-[0.35em]">AI Powered</p>
            <h1 className="mt-4 text-4xl font-semibold">Attendance Management</h1>
            <p className="mt-4 max-w-md text-blue-50">Secure, intelligent, and beautifully designed attendance workflows for schools and campuses.</p>
          </div>
          <div className="p-10">
            <h2 className="text-2xl font-semibold text-slate-800">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Enter your registered account credentials to continue.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              <input {...register('email')} type="email" placeholder="Email" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0" />
              <input {...register('password')} type="password" placeholder="Password" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0" />
              <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">Login</button>
            </form>
            <p className="mt-4 text-sm text-slate-500">
              Don’t have an account? <Link to="/register" className="text-blue-600 hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
