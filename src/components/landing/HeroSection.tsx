import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, IndianRupee, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../ui/button';
import { Globe } from '../Globe';
import { useGlobalStats } from '../../services/useGlobalStats';

const formatKg = (kg: number) => {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(0)} kg`;
};

const formatRupees = (inr: number) => {
  if (inr >= 100000) return `₹${(inr / 100000).toFixed(1)}L`;
  if (inr >= 1000) return `₹${(inr / 1000).toFixed(1)}k`;
  return `₹${inr.toFixed(0)}`;
};

export function HeroSection() {
  const { stats, loading } = useGlobalStats();

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-background">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#A9B85A]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col gap-8 max-w-xl py-20 pointer-events-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">Carbon Engine live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            Turn invisible{' '}
            <span className="font-pixel text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#A9B85A]">
              emissions
            </span>{' '}
            into visible <span className="text-primary">savings.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            CarbonIQ measures your real digital and lifestyle carbon footprint, gamifies the
            reduction with Eco-Scores, and uses an AI coach grounded in your activity to help you
            save money and CO₂.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/auth">
              <Button
                size="lg"
                className="h-14 px-8 text-base bg-primary hover:bg-primary/85 text-[#0B0B0A] font-semibold shadow-[0_0_20px_rgba(212,231,106,0.4)] transition-all hover:shadow-[0_0_30px_rgba(212,231,106,0.6)]"
              >
                Get started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base border-border hover:bg-secondary"
              >
                How it works
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-8 md:gap-12 pt-8 border-t border-border/50 w-full">
            <Stat
              icon={<Cloud className="w-4 h-4 text-primary" />}
              label="CO₂ saved"
              value={loading ? '—' : formatKg(stats?.totalCarbonSavedKg ?? 0)}
            />
            <Stat
              icon={<IndianRupee className="w-4 h-4 text-primary" />}
              label="Money saved"
              value={loading ? '—' : formatRupees(stats?.totalRupeesSaved ?? 0)}
            />
            <Stat
              icon={<Zap className="w-4 h-4 text-primary" />}
              label="Members"
              value={loading ? '—' : `${stats?.totalUsers ?? 0}`}
            />
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
          className="w-full h-full max-w-6xl aspect-square flex items-center justify-center opacity-60"
        >
          <Globe />
        </motion.div>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );
}
