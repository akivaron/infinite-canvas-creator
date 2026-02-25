import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThreeBackground } from '@/components/landing/ThreeBackground';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Zap,
  Code2,
  Layout,
  Palette,
  Layers,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Code2,
    title: 'Visual Development',
    description: 'Build applications visually with an intuitive canvas interface',
  },
  {
    icon: Layout,
    title: 'Infinite Canvas',
    description: 'Unlimited workspace to organize and connect your components',
  },
  {
    icon: Palette,
    title: 'Modern Design',
    description: 'Beautiful UI components powered by shadcn/ui and Tailwind CSS',
  },
  {
    icon: Zap,
    title: 'Real-time Collaboration',
    description: 'Work together with your team in real-time',
  },
  {
    icon: Layers,
    title: 'Version Control',
    description: 'Track changes and manage versions effortlessly',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    description: 'Leverage AI assistance for code generation and optimization',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      <ThreeBackground />

      <div className="relative z-10">
        <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">Canvas Studio</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-4"
          >
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-blue-500 hover:bg-blue-600">
                Get Started
              </Button>
            </Link>
          </motion.div>
        </nav>

        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
              Build Visually,
              <br />
              Deploy Instantly
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto">
              The modern visual development platform for creating stunning web applications with an infinite canvas
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-lg px-8 py-6 group">
                  Start Building
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 text-lg px-8 py-6">
                  View Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors group"
              >
                <feature.icon className="w-12 h-12 mb-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-500/30 rounded-3xl p-12"
          >
            <h2 className="text-4xl font-bold mb-6">Ready to Create?</h2>
            <p className="text-xl text-slate-300 mb-8">
              Join thousands of developers building the future with Canvas Studio
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-lg px-10 py-6">
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </section>

        <footer className="container mx-auto px-6 py-8 border-t border-white/10 text-center text-slate-400">
          <p>© 2024 Canvas Studio. Built with React, Three.js, and Supabase.</p>
        </footer>
      </div>
    </div>
  );
}
