import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    company_name: '',
    timezone: 'UTC',
    attendance_window_minutes: 30,
    enable_face_detection: true,
    enable_anti_spoof: true,
    require_email_verification: false,
    allow_self_registration: true,
    default_role: 'student',
    face_detection_sensitivity: 0.7,
    role_permissions: {
      admin: ['all'],
      faculty: ['students', 'attendance', 'reports'],
      student: ['attendance', 'profile'],
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      const data = response.data || {};
      setSettings({
        company_name: data.company_name || '',
        timezone: data.timezone || 'UTC',
        attendance_window_minutes: data.attendance_window_minutes ?? 30,
        enable_face_detection: data.enable_face_detection ?? true,
        enable_anti_spoof: data.enable_anti_spoof ?? true,
        require_email_verification: data.require_email_verification ?? false,
        allow_self_registration: data.allow_self_registration ?? true,
        default_role: data.default_role || 'student',
        face_detection_sensitivity: data.face_detection_sensitivity ?? 0.7,
        role_permissions: data.role_permissions || {
          admin: ['all'],
          faculty: ['students', 'attendance', 'reports'],
          student: ['attendance', 'profile'],
        },
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.put('/settings', settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-blue-600">Settings</p>
        <h1 className="text-3xl font-semibold text-slate-800">System Preferences</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Security and Attendance Controls</h2>
            <p className="mt-1 text-sm text-slate-500">Manage authentication, face detection sensitivity, attendance windows, and role permissions from this panel.</p>
          </div>
          <button onClick={saveSettings} disabled={saving} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800">Authentication</h3>
            <label className="block text-sm text-slate-600">
              Company name
              <input value={settings.company_name} onChange={(e) => updateField('company_name', e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-600">
              Timezone
              <input value={settings.timezone} onChange={(e) => updateField('timezone', e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
              <span>Allow self registration</span>
              <input type="checkbox" checked={settings.allow_self_registration} onChange={(e) => updateField('allow_self_registration', e.target.checked)} className="h-4 w-4" />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
              <span>Require email verification</span>
              <input type="checkbox" checked={settings.require_email_verification} onChange={(e) => updateField('require_email_verification', e.target.checked)} className="h-4 w-4" />
            </label>
            <label className="block text-sm text-slate-600">
              Default role
              <select value={settings.default_role} onChange={(e) => updateField('default_role', e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800">Face Detection and Attendance</h3>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
              <span>Enable face detection</span>
              <input type="checkbox" checked={settings.enable_face_detection} onChange={(e) => updateField('enable_face_detection', e.target.checked)} className="h-4 w-4" />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
              <span>Enable anti-spoof</span>
              <input type="checkbox" checked={settings.enable_anti_spoof} onChange={(e) => updateField('enable_anti_spoof', e.target.checked)} className="h-4 w-4" />
            </label>
            <label className="block text-sm text-slate-600">
              Face detection sensitivity
              <input type="range" min="0.3" max="1" step="0.1" value={settings.face_detection_sensitivity} onChange={(e) => updateField('face_detection_sensitivity', parseFloat(e.target.value))} className="mt-2 w-full" />
              <span className="mt-1 block text-xs text-slate-400">Current value: {settings.face_detection_sensitivity}</span>
            </label>
            <label className="block text-sm text-slate-600">
              Attendance window (minutes)
              <input type="number" min="5" max="180" value={settings.attendance_window_minutes} onChange={(e) => updateField('attendance_window_minutes', Number(e.target.value))} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800">Role Permissions</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Object.entries(settings.role_permissions || {}).map(([role, permissions]) => (
              <div key={role} className="rounded-2xl border border-slate-200 p-3">
                <p className="text-sm font-semibold capitalize text-slate-700">{role}</p>
                <div className="mt-2 space-y-2 text-sm text-slate-600">
                  {['all', 'students', 'attendance', 'reports', 'profile'].map((perm) => (
                    <label key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.includes(perm)}
                        onChange={() => {
                          const updated = permissions.includes(perm)
                            ? permissions.filter((item) => item !== perm)
                            : [...permissions, perm];
                          updateField('role_permissions', { ...settings.role_permissions, [role]: updated });
                        }}
                        className="h-4 w-4"
                      />
                      <span>{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
