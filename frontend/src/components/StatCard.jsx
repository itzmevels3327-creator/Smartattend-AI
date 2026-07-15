import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, tone }) => {
  const toneClasses = {
    blue: 'from-blue-500/20 to-cyan-500/20 text-blue-600',
    green: 'from-emerald-500/20 to-green-500/20 text-emerald-600',
    red: 'from-rose-500/20 to-orange-500/20 text-rose-600',
    amber: 'from-amber-500/20 to-yellow-500/20 text-amber-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-slate-200/70 bg-gradient-to-br ${toneClasses[tone]} p-5 shadow-lg shadow-slate-200/60`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
