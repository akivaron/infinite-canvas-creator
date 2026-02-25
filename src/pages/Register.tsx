import { Link } from 'react-router-dom';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { motion } from 'framer-motion';

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-slate-300">Sign up to get started</p>
        </div>

        <RegisterForm />

        <div className="text-center text-sm text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
