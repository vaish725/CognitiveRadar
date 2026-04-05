import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Network, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedGraph from "@/components/AnimatedGraph";
import ThemeToggle from "@/components/ThemeToggle";

const features = [
  {
    icon: Network,
    title: "Knowledge Graph",
    description: "Transform linear discussions into dynamic, interconnected concept maps that reveal hidden structures.",
    color: "text-cr-cyan",
    bg: "bg-cr-cyan/10",
  },
  {
    icon: Brain,
    title: "Thinking Engine",
    description: "Automatically detect logical gaps, contradictions, and unspoken assumptions in any argument.",
    color: "text-cr-indigo",
    bg: "bg-cr-indigo/10",
  },
  {
    icon: Mic,
    title: "Multi-modal Input",
    description: "Analyze text, YouTube videos, audio recordings, and documents — all through one unified interface.",
    color: "text-cr-emerald",
    bg: "bg-cr-emerald/10",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display text-base font-semibold tracking-tight">
            Cognitive<span className="text-cr-cyan">Radar</span>
          </span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/sessions")} className="text-muted-foreground">
              Sessions
            </Button>
            <Button size="sm" onClick={() => navigate("/new")}>
              Start Analyzing
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center pt-14 overflow-hidden">
        <AnimatedGraph />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center py-32">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-4"
          >
            AI-Powered Analysis
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
          >
            See the structure{" "}
            <span className="text-gradient">of thinking.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Transform conversations, videos, and documents into evolving
            knowledge graphs that reveal how ideas connect, contradict, and
            depend on each other.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => navigate("/new")}
              className="rounded-full px-8 h-12 text-base font-medium gap-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              Start Analyzing
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-32 -mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              className="glass rounded-2xl p-8 hover:shadow-lg transition-shadow cursor-default"
            >
              <div className={`inline-flex p-3 rounded-xl ${f.bg} mb-5`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 CognitiveRadar</span>
          <span>Built with precision.</span>
        </div>
      </footer>
    </div>
  );
}
