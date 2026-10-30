// One definition of every node, relation and insight type, shared by all
// functions. Without these the schema only listed the allowed words, and the
// model labelled things by its own everyday sense of "claim" or "concept",
// which drifted between runs.

export const NODE_TYPE_DESC =
  "concept = a topic, thing or idea with no stance (e.g. 'remote work'). " +
  "claim = an assertion someone argues is true and that could be disputed (e.g. 'remote work boosts output'). " +
  "evidence = a fact, statistic, study or observation offered to support or challenge a claim (e.g. '14-minute average wait'). " +
  "assumption = a premise the argument needs but does not state or prove; you may add it even if it is not in the text. " +
  "question = something the text explicitly leaves open. " +
  "contradiction = only when the text itself names a tension between two positions; otherwise link the two conflicting nodes with a 'contradicts' edge.";

export const RELATION_DESC =
  "supports = source gives a reason or evidence for target. " +
  "contradicts = source and target cannot both be true. " +
  "depends_on = source only holds if target holds. " +
  "example_of = source is a specific instance of target.";

export const INSIGHT_TYPE_DESC =
  "gap = a missing step, missing evidence, or a claim with no support. " +
  "contradiction = statements that conflict, circular reasoning, or a named logical fallacy. " +
  "assumption = commentary on a risky premise the argument relies on. " +
  "question = a follow-up question that would test or strengthen the argument.";

export const SEVERITY_DESC =
  "high = undermines the main conclusion. medium = weakens a supporting point. low = minor or stylistic.";

export const ONTOLOGY_GUIDE = `

Definitions (follow these exactly):
- Node types: ${NODE_TYPE_DESC}
- Relations: ${RELATION_DESC}
- Insight types: ${INSIGHT_TYPE_DESC}
- Severity: ${SEVERITY_DESC}

Quick test: if you can put "I argue that..." in front of it, it is a claim; if it is offered as proof, it is evidence; if it is just a noun phrase, it is a concept.
Labels: 2-5 plain, correctly spelled words, using the text's own terms where possible.`;
