
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ScanLine,
  LogOut,
  Brain,
  FileSearch,
  MessageCircle,
  Salad,
  HeartPulse,
  ArrowUpRight,
  Sparkles,
  Activity,
} from "lucide-react";


import logo from "../assets/logo_icon.png";

const features = [
  {
    title: "Mental Health",
    description:
      "Explore your emotional well-being and discover tools for a healthier mind.",
    icon: Brain,
    color: "bg-violet-100",
    iconColor: "text-violet-700",
    borderColor: "border-violet-200",
    accent: "bg-violet-500",
    tag: "WELLNESS",
    route: "/mental-health",
    number: "01",
    fontfamily: "special_heading",
  },
  {
    title: "Prescription Analyzer",
    description:
      "Analyze prescription documents and organize extracted medical information.",
    icon: FileSearch,
    color: "bg-sky-100",
    iconColor: "text-sky-700",
    borderColor: "border-sky-200",
    accent: "bg-sky-500",
    tag: "DOCUMENT ANALYSIS",
    route: "/prescription-analyzer",
    number: "02",
  },
  {
    title: "Chat with GALE",
    description:
      "Start a conversation with GALE, your AI-powered healthcare assistant.",
    icon: MessageCircle,
    color: "bg-emerald-100",
    iconColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    accent: "bg-emerald-500",
    tag: "YOUR ASSISTANT",
    route: "/gale",
    number: "03",
  },
  {
    title: "DietAI",
    description:
      "Explore personalized nutrition ideas and build healthier eating habits.",
    icon: Salad,
    color: "bg-amber-100",
    iconColor: "text-amber-700",
    borderColor: "border-amber-200",
    accent: "bg-amber-500",
    tag: "HEALTH AND NUTRITION",
    route: "/diet-ai",
    number: "04",
  },
  {
    title: "Aarogya.AI",
    description:
      "Explore AI-powered health guidance and access useful wellness resources.",
    icon: HeartPulse,
    color: "bg-rose-100",
    iconColor: "text-rose-700",
    borderColor: "border-rose-200",
    accent: "bg-rose-500",
    tag: "HEALTH INTELLIGENCE",
    route: "/aarogya-ai",
    number: "05",
  },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-slate-900">
      {/* Soft background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        {/* Top identity row - no navbar */}
        <header className="mb-10 flex items-center justify-between gap-4 sm:mb-14">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-transform duration-300 hover:rotate-[-6deg] hover:scale-105">
              <img src={logo} alt="Scanalyze Logo" className="h-full w-full object-contain" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                VaidyaVani<span className="text-blue-600">.AI</span>
              </h1>
              <p className="hidden text-[10px] font-semibold tracking-[0.18em] text-slate-400 sm:block">
                ADVANCED VAIDYAVANI SOLUTIONS
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Signed in as
              </p>
              <p className="mt-1 max-w-40 truncate text-sm font-bold text-slate-700 tracking-[0.2em]">
                {user?.name || "User"}
              </p>
            </div>

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700 sm:hidden"
              title={user?.name || "User"}
            >
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-4 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Welcome section */}
        <section className="mb-8 sm:mb-10">
          {/* <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            <Sparkles size={15} />
            Your health workspace
          </div> */}

          <h2 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl special_heading">
            Hello,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {(user?.name || "there").split(" ")[0]}
            </span>
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base tracking-[0.03em]">
            Your personal healthcare tools, powered by AI. Choose a workspace
            to get started.
          </p>
        </section>

        {/* Feature cards */}
        <section aria-label="Healthcare tools">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 sm:text-base">
              Available Modules
            </h3>
            <span className="font-mono text-xs text-slate-400">
              05 MODULES
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <button
                  key={feature.title}
                  type="button"
                  onClick={() => navigate(feature.route)}
                  style={{ animationDelay: `${index * 90}ms` }}
                  className={`group relative flex min-h-52 flex-col overflow-hidden rounded-2xl border ${feature.borderColor} ${feature.color} p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-safe:animate-[fadeInUp_0.5s_ease-out_both] sm:p-6`}
                >
                  {/* Decorative accent */}
                  <div
                    className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${feature.accent} opacity-[0.07] transition-transform duration-500 group-hover:scale-150`}
                  />

                  <div className="relative flex w-full items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-black/[0.03] transition-all duration-300 group-hover:rotate-[-5deg] group-hover:scale-110">
                      <Icon
                        size={24}
                        strokeWidth={1.8}
                        className={feature.iconColor}
                      />
                    </div>

                    <span className="font-mono text-xs font-semibold text-slate-400/80">
                      {feature.number}
                    </span>
                  </div>

                  <div className="relative mt-5 flex-1">
                    <p className="mb-1.5 text-[9px] font-extrabold tracking-[0.18em] text-slate-500 sm:text-[10px]">
                      {feature.tag}
                    </p>

                    <h4 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl special_heading">
                      {feature.title}
                    </h4>

                    <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6 tracking-[0.01em]">
                      {feature.description}
                    </p>
                  </div>

                  <div className="relative mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3">
                    <span className="text-xs font-semibold text-slate-700 transition-colors group-hover:text-slate-900 tracking-[0.1rem]">
                      Open Module
                    </span>

                    <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm transition-all duration-300 group-hover:translate-x-1 group-hover:bg-slate-900 group-hover:text-white">
                      <ArrowUpRight size={17} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Scanalyze · Advanced VaidyaVani Analyzer</p>
          <p className="font-mono">AI HEALTH WORKSPACE / v1.0</p>
        </footer>
      </div>

      {/* Card entrance animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
