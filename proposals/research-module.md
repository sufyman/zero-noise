# Simplified Deep Search Architecture (Conceptual)

## Core Flow
```
Interview Transcript → Query Extraction → Parallel Search → Report Compilation
```

## System Components & Their Roles

### 1. **Query Extractor**
**Role**: Transform human conversation into machine-searchable queries

**Goals**:
- Identify main topics and interests from natural language
- Add temporal context (recent, latest, specific timeframes)
- Create diverse query types (comparisons, tutorials, news, tools)
- Ensure queries are specific enough for quality results

**Output**: 5-10 structured search queries with clear intent

### 2. **Search Orchestrator**
**Role**: Execute multiple searches efficiently and in parallel

**Goals**:
- Run all queries simultaneously for speed
- Apply consistent search parameters (recency, authority)
- Filter noise (ads, promotional content)
- Maintain source attribution

**Output**: Raw search results with content and sources

### 3. **Report Compiler**
**Role**: Transform scattered search results into coherent narrative

**Goals**:
- Synthesize findings across all searches
- Organize by topic/theme
- Extract actionable insights
- Maintain readability for human consumption

**Output**: Structured report with summary, detailed findings, and sources

## Design Principles

### **Simplicity Over Sophistication**
- Single-pass processing (no iterative refinement)
- Fixed query count (no dynamic adjustment)
- Standard report format (no personalization)

### **Speed Through Parallelization**
- All searches run simultaneously
- No dependencies between searches
- Total time = slowest single search

### **Trust the LLM**
- Let the model handle complexity in prompts
- No complex parsing or structuring logic
- Minimal post-processing of results

## Information Flow

```
1. Human Intent (transcript)
   ↓
2. Machine Queries (structured)
   ↓
3. Web Information (raw)
   ↓
4. Human-Readable Report (synthesized)
```

## Critical Success Factors

1. **Query Quality**: The extractor must capture the essence of user interests
2. **Search Coverage**: Queries must be diverse enough to cover all angles
3. **Synthesis Quality**: The compiler must create coherent narrative from fragments

## Minimal Viable Pipeline

```
Input:  "I'm interested in AI and marketing..."
Step 1: ["AI marketing tools 2024", "agentic AI latest", ...]
Step 2: [SearchResult1, SearchResult2, ...] (parallel)
Step 3: Structured report with findings
Output: Actionable intelligence ready for consumption
```

This architecture achieves most of the value with minimal complexity, perfect for MVP validation.



# Simplified Deep Search Architecture with Prompts

## Core Flow
```
Interview Transcript → Query Extraction → Parallel Search → Report Compilation
```

## System Components with Key Prompts

### 1. **Query Extractor**
**Role**: Transform human conversation into machine-searchable queries

**Core Prompt Structure**:
```
From this interview transcript, extract 5-8 specific search queries.

TRANSCRIPT: [user interview content]

EXTRACTION RULES:
- Identify main topics and specific interests mentioned
- For current events/tools, add temporal markers ("2024", "latest", "this month")
- Create diverse query types:
  * Tool comparisons (X vs Y)
  * Latest developments (recent advances in Z)
  * Practical applications (how to use X for Y)
  * Industry trends (emerging patterns in Z)
- Make queries specific and searchable, not vague

OUTPUT FORMAT:
[
  {"query": "specific search string", "intent": "what we hope to find"},
  ...
]

EXAMPLE:
Input: "I'm tracking AI coding tools like Cursor and Windsurf"
Output: {"query": "Cursor vs Windsurf comparison 2024", "intent": "Compare features and capabilities of AI coding assistants"}
```

### 2. **Search Orchestrator**
**Role**: Execute multiple searches efficiently and in parallel

**Core Prompt Structure**:
```
Execute a focused web search for the following:

SEARCH QUERY: [specific query]
INTENT: [what we're looking for]

SEARCH PARAMETERS:
- Prioritize recent information (last 6 months strongly preferred)
- Focus on authoritative sources:
  * Official documentation and company blogs
  * Recognized experts and thought leaders
  * Peer-reviewed research
  * Reputable tech publications
- Extract specific information:
  * Key facts and developments
  * Specific tools, products, or solutions mentioned
  * Quantitative data and benchmarks
  * Expert opinions and insights

FILTERING REQUIREMENTS:
- Exclude promotional content and ads
- Avoid social media hype and unverified claims
- Skip outdated information (>1 year old unless foundational)

For each finding, note:
- The specific insight or fact
- The source and its credibility
- How recent the information is
```

### 3. **Report Compiler**
**Role**: Transform scattered search results into coherent narrative

**Core Prompt Structure**:
```
Compile these search results into a comprehensive yet concise report.

SEARCH RESULTS: [all search outputs]

COMPILATION INSTRUCTIONS:

1. EXECUTIVE SUMMARY (2 paragraphs)
   - Paragraph 1: Most significant findings across all searches
   - Paragraph 2: Key implications and opportunities for the user

2. DETAILED FINDINGS
   Organize by logical themes, not by search query:
   
   ### [Theme 1 - e.g., "Agentic AI Developments"]
   - Synthesize findings from multiple searches
   - Highlight connections between different pieces of information
   - Note consensus vs. conflicting viewpoints
   
   ### [Theme 2 - e.g., "Tool Comparisons"]
   - Direct comparisons with specific features
   - User experiences and expert opinions
   - Practical implications

3. ACTIONABLE INSIGHTS
   - What specific actions can the user take?
   - Which tools or resources should they explore?
   - What trends should they monitor?

4. SOURCE BIBLIOGRAPHY
   - List all sources with clear titles
   - Group by credibility/type (Research, Official, Expert Opinion)

QUALITY REQUIREMENTS:
- Every claim must be traceable to a search result
- Prioritize recent developments over historical context
- Focus on practical value over theoretical discussion
- Maintain professional tone but ensure readability
```

## Prompt Design Principles

### **Clarity Over Complexity**
- Direct instructions without ambiguity
- Specific examples where helpful
- Clear output format expectations

### **Context Preservation**
- Each prompt includes the "why" behind instructions
- Intent is passed forward through the pipeline
- Temporal context maintained throughout

### **Quality Filters Built-In**
- Source authority requirements in search
- Recency preferences explicit
- Anti-noise instructions embedded

## Information Transformation

```
Stage 1: Human → Machine
"I want to know about AI tools" → "Cursor vs Windsurf comparison 2024"

Stage 2: Queries → Information
"Latest agentic AI" → Structured findings with sources

Stage 3: Information → Intelligence  
Raw search results → Organized, actionable report
```

## Critical Prompt Elements

1. **Specificity**: Vague queries yield poor results
2. **Temporality**: Recent information is usually more valuable
3. **Authority**: Source quality directly impacts output quality
4. **Actionability**: Focus on "what can the user do with this"

## Example Pipeline Execution

**Input**: "I'm interested in AI coding assistants and marketing automation"

**Query Extraction Output**:
- "AI coding assistants comparison 2024"
- "marketing automation AI tools latest"
- "Cursor IDE latest features updates"
- "AI marketing automation implementation guide"

**Search Focus**: Recent, authoritative, practical

**Report Structure**: Summary → Findings by Theme → Actions → Sources

This prompt architecture ensures consistent, high-quality output while maintaining simplicity.