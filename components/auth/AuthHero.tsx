"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Bell,
  Building2,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import HeroIllustration from "./HeroIllustration";

type Card = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  pos: string;
  delay: number;
  float: string;
};

// The floating capability chips, positioned around the illustration.
// `delay` staggers their entrance; `float` picks one of three drift keyframes
// so no two cards move in lockstep.
//
// Signup sells the product, so it shows all six. Login is a screen you see
// every day — it uses the quieter four-card subset below.
export const SIGNUP_CARDS: Card[] = [
  { icon: Building2, label: "Organization Workspace", pos: "left-0 top-[6%]", delay: 0.5, float: "ps-float-a" },
  { icon: Ticket, label: "Raise a Ticket", pos: "right-0 top-[16%]", delay: 0.65, float: "ps-float-b" },
  // Kept clear of the "Avg resolve" glass panel drawn at ~42% inside the SVG.
  { icon: ListChecks, label: "Status Tracking", pos: "-left-2 top-[27%]", delay: 0.8, float: "ps-float-c" },
  { icon: MessageSquare, label: "Threaded Replies", pos: "-right-2 top-[54%]", delay: 0.95, float: "ps-float-a" },
  { icon: UserRound, label: "Support Rep", pos: "left-[4%] bottom-[8%]", delay: 1.1, float: "ps-float-b" },
  { icon: Bell, label: "Email Updates", pos: "right-[4%] bottom-[2%]", delay: 1.25, float: "ps-float-c" },
];

export const LOGIN_CARDS: Card[] = [
  { icon: Ticket, label: "Your Tickets", pos: "right-0 top-[14%]", delay: 0.5, float: "ps-float-b" },
  { icon: ListChecks, label: "Status Tracking", pos: "-left-2 top-[27%]", delay: 0.65, float: "ps-float-c" },
  { icon: MessageSquare, label: "Threaded Replies", pos: "-right-2 top-[58%]", delay: 0.8, float: "ps-float-a" },
  { icon: Bell, label: "Email Updates", pos: "left-[4%] bottom-[8%]", delay: 0.95, float: "ps-float-b" },
];

const TRUST = [
  { icon: ShieldCheck, label: "Secure authentication" },
  { icon: Building2, label: "Private to your organization" },
  { icon: Users, label: "Real people reply" },
];

export default function AuthHero({
  headline,
  subcopy,
  cards = SIGNUP_CARDS,
}: {
  headline: React.ReactNode;
  subcopy: string;
  cards?: Card[];
}) {
  // Pointer position, normalised to -0.5…0.5 and spring-smoothed so the
  // parallax glides instead of snapping.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 20, mass: 0.6 });

  const artX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const artY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const artRotate = useTransform(sx, [-0.5, 0.5], [-2, 2]);
  // Cards drift further than the artwork — cheap depth.
  const cardX = useTransform(sx, [-0.5, 0.5], [-26, 26]);
  const cardY = useTransform(sy, [-0.5, 0.5], [-18, 18]);
  const glowX = useTransform(sx, [-0.5, 0.5], [30, -30]);
  const glowY = useTransform(sy, [-0.5, 0.5], [20, -20]);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function handleLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative hidden items-center justify-center overflow-hidden bg-[#0B1020] p-10 xl:p-14 lg:flex"
    >
      {/* Layered radial glow — the deep indigo / purple / cyan wash */}
      <motion.div
        style={{ x: glowX, y: glowY }}
        className="ps-aurora pointer-events-none absolute -inset-[15%]"
      />
      {/* Grid, faded out toward the edges */}
      <div className="ps-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_35%,transparent_100%)]" />
      {/* Light rays */}
      <div className="ps-rays pointer-events-none absolute inset-0" />
      {/* Vignette so the panel edge stays dark and the form reads clean */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(6,9,20,0.75)_100%)]" />

      {/* Drifting particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="ps-particle" />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-[560px] flex-col items-center text-center">
        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          {/* Wordmark is the way back to the marketing page from login/signup. */}
          <Link href="/" className="flex items-center gap-3">
            <span className="ps-logo-glow flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#7C3AED] to-[#06B6D4]">
              <Sparkles className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[25px] font-extrabold tracking-[-0.02em] text-white">
              PixelSupport
            </span>
          </Link>
        </motion.div>

        {/* Illustration + floating cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="relative mb-9 h-[380px] w-full max-w-[500px]"
        >
          {/* Blurred colour orbs behind the artwork */}
          <div className="ps-orb left-[14%] top-[8%] h-[210px] w-[210px] bg-[rgba(124,58,237,0.30)]" />
          <div className="ps-orb right-[8%] top-[34%] h-[190px] w-[190px] bg-[rgba(6,182,212,0.24)] [animation-delay:2.4s]" />
          <div className="ps-orb bottom-[6%] left-[28%] h-[170px] w-[170px] bg-[rgba(79,70,229,0.26)] [animation-delay:4.8s]" />

          <motion.div
            style={{ x: artX, y: artY, rotate: artRotate }}
            className="relative h-full w-full"
          >
            <HeroIllustration />
          </motion.div>

          <motion.div style={{ x: cardX, y: cardY }} className="pointer-events-none absolute inset-0">
            {cards.map(({ icon: Icon, label, pos, delay, float }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 14, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut", delay }}
                className={`absolute ${pos}`}
              >
                <span
                  className={`${float} flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.09] px-3.5 py-2 text-[11px] font-medium text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#A5B4FC]" strokeWidth={2} />
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
          className="ps-headline mb-4 text-[40px] font-extrabold leading-[1.08] tracking-[-0.03em] xl:text-[44px]"
        >
          {headline}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
          className="mx-auto mb-9 max-w-[420px] text-[15px] leading-relaxed text-white/60"
        >
          {subcopy}
        </motion.p>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-white/10 pt-6"
        >
          {TRUST.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2 text-xs text-white/45">
              <Icon className="h-4 w-4 text-white/35" strokeWidth={1.8} />
              {label}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
