import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Youtube,
  Upload,
  Mic,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Square,
  Circle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { analyzeText, analyzeYouTube, analyzeUpload, analyzeAudio } from "@/lib/api";

type InputType = "text" | "youtube" | "upload" | "audio";

const inputOptions: { type: InputType; icon: typeof FileText; title: string; desc: string }[] = [
  { type: "text", icon: FileText, title: "Paste Text", desc: "Paste an article, transcript, or argument" },
  { type: "youtube", icon: Youtube, title: "YouTube URL", desc: "Analyze a video's transcript" },
  { type: "upload", icon: Upload, title: "Upload File", desc: "PDF, audio, video, or document" },
  { type: "audio", icon: Mic, title: "Live Audio", desc: "Record from your microphone" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export default function NewSession() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selected, setSelected] = useState<InputType | null>(null);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    (selected === "text" && text.trim().length > 20) ||
    (selected === "youtube" && url.includes("youtu")) ||
    (selected === "upload" && file !== null) ||
    (selected === "audio" && audioBlob !== null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to record.", variant: "destructive" });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleAnalyze = async () => {
    if (!canSubmit) return;
    setIsAnalyzing(true);
    try {
      let result;
      if (selected === "text") {
        result = await analyzeText(text);
      } else if (selected === "youtube") {
        result = await analyzeYouTube(url);
      } else if (selected === "upload" && file) {
        result = await analyzeUpload(file);
      } else if (selected === "audio" && audioBlob) {
        result = await analyzeAudio(audioBlob);
      }
      if (result) navigate(`/dashboard/${result.sessionId}`);
    } catch (err: any) {
      toast({
        title: "Analysis failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex items-start justify-center pt-28 pb-16 px-6">
        <div className="w-full max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2">New Analysis</h1>
            <p className="text-muted-foreground mb-10">Choose your input source to begin.</p>
          </motion.div>

          {/* Input type cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {inputOptions.map((opt, i) => (
              <motion.button
                key={opt.type}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                onClick={() => {
                  setSelected(opt.type);
                  setAudioBlob(null);
                  setFile(null);
                  if (isRecording) stopRecording();
                }}
                className={`relative rounded-xl border p-5 text-left transition-all cursor-pointer ${
                  selected === opt.type
                    ? "border-cr-cyan bg-cr-cyan/5 shadow-md"
                    : "border-border hover:border-muted-foreground/30 hover:shadow-sm"
                }`}
              >
                <opt.icon className={`w-5 h-5 mb-3 ${selected === opt.type ? "text-cr-cyan" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium">{opt.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{opt.desc}</p>
              </motion.button>
            ))}
          </div>

          {/* Text input */}
          {selected === "text" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Textarea
                placeholder="Paste your text here... articles, transcripts, arguments, essays — anything with ideas worth mapping."
                className="min-h-[200px] resize-none text-base leading-relaxed rounded-xl border-border focus-visible:ring-cr-cyan/30"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {text.length} characters · {text.trim().length > 20 ? "Ready" : "Minimum 20 characters"}
              </p>
            </motion.div>
          )}

          {/* YouTube input */}
          {selected === "youtube" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-12 text-base rounded-xl focus-visible:ring-cr-cyan/30"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Paste a YouTube video URL to extract and analyze its transcript.
              </p>
            </motion.div>
          )}

          {/* File upload */}
          {selected === "upload" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.csv,.docx,.mp3,.wav,.m4a,.ogg,.webm,.mp4"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-muted-foreground/40 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">Drop files here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF, MP3, MP4, WAV, DOCX, TXT up to 20MB</p>
                </div>
              ) : (
                <div className="border rounded-xl p-5 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Audio recording */}
          {selected === "audio" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="border rounded-xl p-8 text-center">
                {!isRecording && !audioBlob && (
                  <>
                    <div className="mb-4">
                      <div className="w-16 h-16 rounded-full bg-cr-rose/10 flex items-center justify-center mx-auto">
                        <Mic className="w-7 h-7 text-cr-rose" />
                      </div>
                    </div>
                    <p className="text-sm font-medium mb-1">Ready to record</p>
                    <p className="text-xs text-muted-foreground mb-5">Click to start recording from your microphone</p>
                    <Button onClick={startRecording} className="rounded-full px-6 gap-2">
                      <Circle className="w-3 h-3 fill-current" />
                      Start Recording
                    </Button>
                  </>
                )}

                {isRecording && (
                  <>
                    <div className="mb-4">
                      <div className="w-16 h-16 rounded-full bg-cr-rose/20 flex items-center justify-center mx-auto animate-pulse">
                        <Mic className="w-7 h-7 text-cr-rose" />
                      </div>
                    </div>
                    <p className="text-lg font-mono font-semibold mb-1 text-cr-rose">{formatTime(recordingTime)}</p>
                    <p className="text-xs text-muted-foreground mb-5">Recording in progress…</p>
                    <Button onClick={stopRecording} variant="destructive" className="rounded-full px-6 gap-2">
                      <Square className="w-3 h-3 fill-current" />
                      Stop Recording
                    </Button>
                  </>
                )}

                {!isRecording && audioBlob && (
                  <>
                    <div className="mb-4">
                      <div className="w-16 h-16 rounded-full bg-cr-emerald/10 flex items-center justify-center mx-auto">
                        <Mic className="w-7 h-7 text-cr-emerald" />
                      </div>
                    </div>
                    <p className="text-sm font-medium mb-1">Recording ready</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {formatTime(recordingTime)} · {(audioBlob.size / 1024).toFixed(0)} KB
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { setAudioBlob(null); setRecordingTime(0); }} className="rounded-full">
                      Record again
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Analyze button */}
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex justify-end"
            >
              <Button
                size="lg"
                disabled={!canSubmit || isAnalyzing}
                onClick={handleAnalyze}
                className="rounded-full px-8 h-12 gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    Analyze
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
