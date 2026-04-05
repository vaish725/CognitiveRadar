export interface GraphNode {
  id: string;
  label: string;
  type: "concept" | "claim" | "assumption" | "evidence" | "question" | "contradiction";
  confidence: number;
  connections: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: "supports" | "contradicts" | "depends_on" | "example_of";
}

export interface Insight {
  id: string;
  type: "gap" | "contradiction" | "assumption" | "question";
  severity: "low" | "medium" | "high";
  description: string;
  relatedNodes: string[];
}

export const demoNodes: GraphNode[] = [
  { id: "n1", label: "Artificial Intelligence", type: "concept", confidence: 0.95, connections: 6 },
  { id: "n2", label: "AI will replace most jobs", type: "claim", confidence: 0.6, connections: 4 },
  { id: "n3", label: "Automation increases productivity", type: "claim", confidence: 0.85, connections: 3 },
  { id: "n4", label: "Historical precedent of tech creating new jobs", type: "evidence", confidence: 0.9, connections: 3 },
  { id: "n5", label: "AGI is achievable within 10 years", type: "claim", confidence: 0.4, connections: 2 },
  { id: "n6", label: "Current AI is narrow, not general", type: "evidence", confidence: 0.92, connections: 3 },
  { id: "n7", label: "Economic growth requires human creativity", type: "assumption", confidence: 0.7, connections: 2 },
  { id: "n8", label: "Machine Learning", type: "concept", confidence: 0.95, connections: 4 },
  { id: "n9", label: "Deep learning has plateaued", type: "claim", confidence: 0.35, connections: 2 },
  { id: "n10", label: "Transformer models keep scaling", type: "evidence", confidence: 0.88, connections: 3 },
  { id: "n11", label: "What defines 'general' intelligence?", type: "question", confidence: 0.5, connections: 2 },
  { id: "n12", label: "AI regulation is necessary", type: "claim", confidence: 0.75, connections: 3 },
  { id: "n13", label: "Innovation vs Safety", type: "contradiction", confidence: 0.65, connections: 3 },
  { id: "n14", label: "Ethical AI development", type: "concept", confidence: 0.88, connections: 3 },
  { id: "n15", label: "Bias in training data", type: "evidence", confidence: 0.92, connections: 2 },
];

export const demoEdges: GraphEdge[] = [
  { id: "e1", source: "n1", target: "n2", relation: "supports" },
  { id: "e2", source: "n1", target: "n8", relation: "supports" },
  { id: "e3", source: "n3", target: "n2", relation: "supports" },
  { id: "e4", source: "n4", target: "n2", relation: "contradicts" },
  { id: "e5", source: "n5", target: "n6", relation: "contradicts" },
  { id: "e6", source: "n8", target: "n9", relation: "supports" },
  { id: "e7", source: "n10", target: "n9", relation: "contradicts" },
  { id: "e8", source: "n11", target: "n5", relation: "depends_on" },
  { id: "e9", source: "n7", target: "n2", relation: "depends_on" },
  { id: "e10", source: "n1", target: "n14", relation: "supports" },
  { id: "e11", source: "n12", target: "n13", relation: "supports" },
  { id: "e12", source: "n14", target: "n15", relation: "supports" },
  { id: "e13", source: "n14", target: "n12", relation: "supports" },
  { id: "e14", source: "n8", target: "n10", relation: "supports" },
  { id: "e15", source: "n13", target: "n12", relation: "depends_on" },
  { id: "e16", source: "n15", target: "n7", relation: "example_of" },
];

export const demoInsights: Insight[] = [
  {
    id: "i1",
    type: "contradiction",
    severity: "high",
    description: "The claim that 'AI will replace most jobs' contradicts historical evidence that technology creates new job categories.",
    relatedNodes: ["n2", "n4"],
  },
  {
    id: "i2",
    type: "gap",
    severity: "medium",
    description: "No evidence provided for the timeline claim of AGI within 10 years. The argument relies on assumption without supporting data.",
    relatedNodes: ["n5"],
  },
  {
    id: "i3",
    type: "assumption",
    severity: "medium",
    description: "'Economic growth requires human creativity' is stated as fact but functions as an unexamined assumption in the argument.",
    relatedNodes: ["n7"],
  },
  {
    id: "i4",
    type: "contradiction",
    severity: "high",
    description: "Deep learning is simultaneously described as 'plateaued' while transformer models are shown to keep scaling successfully.",
    relatedNodes: ["n9", "n10"],
  },
  {
    id: "i5",
    type: "question",
    severity: "low",
    description: "The definition of 'general intelligence' is never established, making claims about AGI timelines unfalsifiable.",
    relatedNodes: ["n11", "n5"],
  },
];

export const demoTranscript = [
  { time: "0:00", speaker: "Speaker A", text: "Let's talk about the impact of artificial intelligence on the modern workforce." },
  { time: "0:12", speaker: "Speaker B", text: "I think AI will replace most jobs within the next decade. The automation trends are clear." },
  { time: "0:28", speaker: "Speaker A", text: "But historically, technology has always created more jobs than it destroyed. The industrial revolution is a perfect example." },
  { time: "0:45", speaker: "Speaker B", text: "This time is different though. We're not just automating physical labor — we're automating cognition itself." },
  { time: "1:02", speaker: "Speaker A", text: "That assumes AGI is achievable within 10 years, which most researchers actually doubt." },
  { time: "1:15", speaker: "Speaker B", text: "Look at the scaling laws. Transformer models keep getting better. Deep learning hasn't plateaued at all." },
  { time: "1:30", speaker: "Speaker A", text: "But current AI is narrow. It excels at specific tasks but lacks true understanding." },
  { time: "1:45", speaker: "Speaker B", text: "That raises a good question — what even defines 'general' intelligence?" },
  { time: "2:00", speaker: "Speaker A", text: "Regardless, we need AI regulation now. The pace of development is outstripping our ability to assess risks." },
  { time: "2:18", speaker: "Speaker B", text: "But regulation could stifle innovation. There's a tension between safety and progress." },
  { time: "2:30", speaker: "Speaker A", text: "Ethical AI development isn't about stopping progress — it's about directing it. Bias in training data is a real, documented problem." },
];
