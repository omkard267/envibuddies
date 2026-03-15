import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  ArrowUpIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export default function PolicyPageLayout({
  title,
  subtitle,
  lastUpdated,
  icon: Icon,
  keyPoints = [],
  sections = [],
  contactEmail = "support@envibuddies.me",
  children,
}) {
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let observer;
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveId(entry.target.id);
          });
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      sections.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 150);
    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [sections]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 sm:pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:gap-12 lg:items-start">
            {/* Sticky TOC - desktop */}
            {sections.length > 0 && (
              <motion.aside
                initial={{ opacity: 0, x: -12 }}
                animate={mounted ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2 }}
                className="hidden lg:block w-56 flex-shrink-0 sticky top-24"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  On this page
                </p>
                <nav className="space-y-0.5">
                  {sections.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => scrollTo(id)}
                      className={`block w-full text-left text-sm py-1.5 px-2.5 rounded-lg transition-all duration-200 ${
                        activeId === id
                          ? "bg-blue-500/10 text-blue-700 font-medium"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </motion.aside>
            )}

            <div className="flex-1 min-w-0">
              {/* Hero */}
              <motion.header
                initial={{ opacity: 0, y: 20 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  {Icon && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={mounted ? { scale: 1 } : {}}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 text-white"
                    >
                      <Icon className="w-5 h-5" />
                    </motion.span>
                  )}
                  {lastUpdated && (
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      Updated {lastUpdated}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-slate-600 mt-2 text-lg">{subtitle}</p>
                )}

                {/* Key points card */}
                {keyPoints.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={mounted ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.15 }}
                    className="mt-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-emerald-50 border border-blue-100/80"
                  >
                    <div className="flex items-center gap-2 text-blue-800 font-medium text-sm mb-2">
                      <SparklesIcon className="w-4 h-4" />
                      In a nutshell
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {keyPoints.map((point, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.header>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={mounted ? { opacity: 1 } : {}}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                {children}
              </motion.div>

              {/* Contact CTA */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 }}
                className="mt-12 p-6 rounded-2xl bg-slate-900 text-white"
              >
                <p className="font-semibold text-lg mb-1">Questions?</p>
                <p className="text-slate-300 text-sm mb-4">
                  We’re happy to clarify anything. Reach out and we’ll get back soon.
                </p>
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-white transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  {contactEmail}
                </a>
              </motion.section>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Back to top */}
      <AnimatePresence>
        {showBackTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-30 p-2.5 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-colors"
            aria-label="Back to top"
          >
            <ArrowUpIcon className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PolicySection({
  id,
  title,
  inShort,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 text-left p-4 sm:p-5 hover:bg-slate-50/80 transition-colors"
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {inShort && !open && (
            <p className="text-sm text-slate-500 mt-0.5 truncate">{inShort}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-slate-400">
          {open ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
              {inShort && (
                <p className="text-sm font-medium text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-4 border border-blue-100">
                  {inShort}
                </p>
              )}
              <div className="text-slate-600 text-sm leading-relaxed space-y-3 prose prose-slate max-w-none prose-p:my-0 prose-ul:my-2">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
