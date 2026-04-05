import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Youtube, Upload, Mic, Clock, Network, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const inputIcons: Record<string, typeof FileText> = {
  text: FileText,
  youtube: Youtube,
  upload: Upload,
  audio: Mic,
};

interface SessionRow {
  id: string;
  title: string;
  input_type: string;
  created_at: string;
  node_count?: number;
}

export default function Sessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, title, input_type, created_at")
      .order("created_at", { ascending: false });

    if (data) {
      const withCounts = await Promise.all(
        data.map(async (s) => {
          const { count } = await supabase
            .from("nodes")
            .select("*", { count: "exact", head: true })
            .eq("session_id", s.id);
          return { ...s, node_count: count || 0 };
        })
      );
      setSessions(withCounts);
    }
    setLoading(false);
  };

  useEffect(() => { loadSessions(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Delete child records first, then session
    await Promise.all([
      supabase.from("insights").delete().eq("session_id", id),
      supabase.from("edges").delete().eq("session_id", id),
    ]);
    await supabase.from("nodes").delete().eq("session_id", id);
    await supabase.from("sessions").delete().eq("id", id);
    setSessions((s) => s.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <Button size="sm" onClick={() => navigate("/new")}>
            New Analysis
          </Button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Sessions</h1>
          <p className="text-muted-foreground mb-10">Your past analyses.</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No sessions yet</p>
            <Button onClick={() => navigate("/new")}>Start your first analysis</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, i) => {
              const Icon = inputIcons[session.input_type] || FileText;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-4 p-5 rounded-xl border hover:shadow-md hover:border-muted-foreground/30 transition-all"
                >
                  <button
                    onClick={() => navigate(`/dashboard/${session.id}`)}
                    className="flex items-center gap-4 flex-1 min-w-0 text-left"
                  >
                    <div className="p-2.5 rounded-lg bg-muted shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Network className="w-3 h-3" />
                          {session.node_count} nodes
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-cr-rose shrink-0"
                    onClick={(e) => handleDelete(e, session.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
