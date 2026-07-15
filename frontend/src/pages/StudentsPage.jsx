import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

const StudentsPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [fileMap, setFileMap] = useState({});
  const [cameraStudentId, setCameraStudentId] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { register, handleSubmit, reset } = useForm();

  const loadStudents = async (term = searchTerm) => {
    setLoadingStudents(true);
    try {
      const response = await api.get('/students', { params: term ? { search: term } : {} });
      setStudents(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudents();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const onSubmit = async (data) => {
    setCreating(true);
    try {
      await api.post('/students', data);
      toast.success('Student created');
      reset();
      await loadStudents();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create student');
    } finally {
      setCreating(false);
    }
  };

  const handleFileChange = (studentId, file) => {
    if (!file) return;

    const extension = file.name?.toLowerCase().slice(file.name.lastIndexOf('.')) || '';
    const mimeAllowed = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!mimeAllowed) {
      toast.error('Invalid file type. Only JPG, JPEG and PNG allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File too large. Max 5MB');
      return;
    }

    setFileMap((m) => {
      if (m[studentId]?.preview) {
        URL.revokeObjectURL(m[studentId].preview);
      }
      const preview = URL.createObjectURL(file);
      return { ...m, [studentId]: { file, preview, filename: file.name, progress: 0, uploading: false } };
    });
  };

  const clearFile = (studentId) => {
    setFileMap((m) => {
      const copy = { ...m };
      if (copy[studentId]?.preview) URL.revokeObjectURL(copy[studentId].preview);
      delete copy[studentId];
      return copy;
    });
  };

  const openCamera = async (studentId) => {
    setCameraStudentId(studentId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
    } catch (error) {
      toast.error('Unable to access the webcam. Please allow camera permission.');
      setCameraOpen(false);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraStudentId(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraStudentId) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${cameraStudentId}.jpg`, { type: 'image/jpeg' });
      handleFileChange(cameraStudentId, file);
      closeCamera();
    }, 'image/jpeg');
  };

  const registerFace = async (studentId) => {
    const state = fileMap[studentId];
    if (!state || !state.file) {
      toast.error('Select an image first');
      return;
    }
    const formData = new FormData();
    formData.append('file', state.file);
    try {
      setFileMap((m) => ({ ...m, [studentId]: { ...m[studentId], uploading: true, progress: 0 } }));
      const resp = await api.post(`/students/${studentId}/register-face`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setFileMap((m) => ({ ...m, [studentId]: { ...m[studentId], progress: percent } }));
        },
      });
      toast.success(resp.data.message || 'Face registered successfully');
      clearFile(studentId);
      await loadStudents();
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Face registration failed';
      toast.error(msg);
      setFileMap((m) => ({ ...m, [studentId]: { ...m[studentId], uploading: false } }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-blue-600">Students</p>
        <h1 className="text-3xl font-semibold text-slate-800">Manage Student Records</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
        {user?.role === 'admin' ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Add Student</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <input {...register('register_number', { required: true })} placeholder="Register number" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input {...register('full_name', { required: true })} placeholder="Full name" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input {...register('department', { required: true })} placeholder="Department" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input {...register('year', { required: true })} placeholder="Year" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input {...register('section', { required: true })} placeholder="Section" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <button disabled={creating} className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300">
                {creating ? 'Creating…' : 'Create Student'}
              </button>
            </form>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
            Only administrators can create new students
          </div>
        )}
      </motion.div>

      <div className="rounded-[28px] border border-slate-200/70 bg-white/70 p-4 shadow-lg shadow-slate-200/50">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Student Records</h2>
          <div className="flex gap-2">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search student" className="rounded-2xl border border-slate-200 px-3 py-2" />
            <button onClick={() => loadStudents(searchTerm)} className="rounded-2xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Search</button>
          </div>
        </div>
        {loadingStudents ? <div className="text-sm text-slate-500">Loading students…</div> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {students.map((student) => (
            <motion.div key={student.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-lg shadow-slate-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{student.full_name}</p>
                  <p className="text-sm text-slate-500">{student.register_number}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-600">{student.department}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-3">
                  <input type="file" accept=".jpg,.jpeg,.png" className="sr-only" onChange={(e) => handleFileChange(student.id, e.target.files[0])} />
                  <div className="cursor-pointer rounded-2xl border border-dashed border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    {fileMap[student.id]?.filename || 'Choose file'}
                  </div>
                </label>
                <button onClick={() => openCamera(student.id)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Use Webcam</button>
                <button
                  onClick={() => registerFace(student.id)}
                  disabled={!fileMap[student.id] || !fileMap[student.id].file || student.is_face_registered || fileMap[student.id].uploading}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white ${(!fileMap[student.id] || !fileMap[student.id].file || student.is_face_registered || fileMap[student.id].uploading) ? 'cursor-not-allowed bg-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {fileMap[student.id]?.uploading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Uploading {fileMap[student.id].progress}%
                    </span>
                  ) : (
                    'Register Face'
                  )}
                </button>
                {fileMap[student.id]?.preview && (
                  <div className="ml-2 flex items-center gap-3">
                    <img src={fileMap[student.id].preview} alt="preview" className="h-16 w-16 rounded-md border object-cover" />
                    <button onClick={() => clearFile(student.id)} className="text-sm text-slate-500 hover:underline">Remove</button>
                  </div>
                )}
                {student.is_face_registered && <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-600">Face Registered</span>}
              </div>
              {cameraOpen && cameraStudentId === student.id ? (
                <div className="mt-4 rounded-2xl border border-slate-200 p-3">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                  <div className="mt-3 flex gap-2">
                    <button onClick={capturePhoto} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Capture Face</button>
                    <button onClick={closeCamera} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentsPage;
