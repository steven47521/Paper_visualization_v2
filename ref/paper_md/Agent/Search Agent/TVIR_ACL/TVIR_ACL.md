# TVIR: Building Deep Research Agents Towards Text-Visual Interleaved Report Generation

> Note: This Markdown was generated from PDF text extraction because the Doc2X quota was exhausted during the final conversion pass.

## Page 1

TVIR: Building Deep Research Agents Towards Text-Visual Interleaved Report Generation

Anonymous ACL submission

Abstract

Deep Research Agents have shown strong capability in multi-step information retrieval, reasoning, and long-form report generation, but existing benchmarks and systems remain predominantly text-centric, with limited evaluation of whether visual elements are factually reliable and well aligned with the surrounding analysis. To address this gap, we introduce TVIR (Text-Visual Interleaved Report Generation), which includes TVIR-BENCH, a benchmark of 100 expert-curated multimodal deep research tasks that require visual elements to serve specific analytical sub-goals, and TVIR-AGENT, a hierarchical multi-agent framework for constructing structured outlines, retrieving images, generating charts with traceable sources, and composing reports through context-aware sequential writing. We further develop a dual-path evaluation framework that combines Textual Assessment and Visual Assessment. Experiments across nine deep research systems show that TVIR-AGENT achieves strong overall performance, underscoring the importance of explicit multimodal design and evaluation for evidence-driven report generation.

## Page 2

To this end, we introduce TVIR (Text-Visual Interleaved Report generation), a unified benchmark and the corresponding agentic framework designed to advance deep research towards multimodal, evidence-driven report generation. First, we present TVIR-BENCH, a multimodal deep research benchmark consisting of 100 expert-curated tasks spanning diverse domains and complexity levels. Unlike prior benchmarks, it enforces strict design principles that require visual elements, both retrieved images and code-generated charts, to be semantically grounded in specific analytical sub-goals, rather than appended post hoc.

Second, we propose TVIR-AGENT, a hierarchical multi-agent framework that enables text-visual interleaved report generation. The agent decomposes user tasks into structured plans with explicit multimodal constraints, instantiates images and charts with traceable sources, and generates long-form reports through context-aware sequential writing. By explicitly modeling visual evidence throughout the planning and writing stages, TVIR-AGENT treats visuals as integral components of reasoning rather than optional embellishments.

Finally, we introduce a comprehensive evaluation suite that jointly audits textual and visual quality. Our framework combines Textual Assessment, focusing on citation grounding, logical consistency, and analytical depth, with Visual Assessment, which measures figure quality, chart fidelity, and cross-modal alignment between text and visuals. Through extensive experiments across multiple deep research systems, we highlight the insufficiency of existing paradigms and underscore the need for multimodal deep research agent designs.

## Page 3

### 3 TVIR-BENCH

#### 3.1 Data Design

Domain Coverage: To ensure comprehensive and representative domain coverage, the benchmark draws on domain taxonomies and task distributions of several existing deep research benchmarks, including DeepResearchBench, LiveResearchBench, and DeepResearchEval, and develops a ten-domain taxonomy. While preserving coverage of the humanities and basic sciences, the benchmark places greater emphasis on Technology and Intelligence and Finance and Business to better align with high-stakes decision-making needs.

Task Design and Complexity: Task construction is guided by five core design principles: role-driven, demand-oriented, deep research, frontier-focused, and multimodal integration. These principles ensure that tasks are grounded in realistic user needs, require substantive analytical synthesis rather than simple information retrieval, and incorporate explicit multimodal elements to better reflect real-world deep research workflows. Tasks are further organized into three complexity levels corresponding to low, medium, and high requirements for multimodal integration and instruction following.

#### 3.2 Data Construction

The dataset is constructed through a systematic expert-driven workflow consisting of expert topic proposal, LLM-based task drafting, multi-expert review, and checklist compilation.

## Page 4

#### 3.3 Dataset Statistics

TVIR-BENCH comprises 100 high-quality multimodal deep research tasks, including 50 Chinese tasks and 50 English tasks. They span 10 major domains and are proportionally balanced across the three predefined complexity levels. The sub-questions within these tasks cover eight high-level functional types, such as trend prediction, mechanism explanation, and comparative analysis, with a roughly balanced distribution across the dataset.

#### 3.4 Evaluation Framework

The paper proposes a multi-dimensional evaluation framework for end-to-end auditing of generated research reports. It consists of two complementary components: Textual Assessment and Visual Assessment. Both are computed as the arithmetic mean of their respective fine-grained metric scores. Unless otherwise specified, all metrics are evaluated using an LLM-as-a-Judge, with scores normalized to a scale of 1–100.

Report preprocessing extracts reference entries, fact-citation pairs for textual assessment, and figure elements for visual assessment, together with captions, base64-encoded visual content, surrounding context, and associated citation indices.

## Page 5

### 4 TVIR-AGENT

The proposed framework contains four stages:

1. Planning: a structured outline is generated from user queries and external sources such as web pages and PDFs.
2. Visualization: the outline is enriched with charts and images.
3. Writing: a draft report is produced based on the enriched outline.
4. Polishing: the report is refined through normalization and reference deduplication to produce the final output.

#### 4.1 Research-Grounded Planning

The Planner parses the user task and iteratively invokes external tools such as Google Search and web scraping to retrieve and verify relevant information, which it organizes into a structured outline. Each section contains a title, a brief summary, planned visual requirements, and section-level research notes. These research notes provide factual grounding for subsequent stages and serve as reusable knowledge references.

#### 4.2 Visual Asset Instantiation

This stage instantiates the visual requirements of each section and produces an augmented outline. Two specialized agents are employed: an Image Searcher for visual concepts such as portraits, scenes, or architecture diagrams, and a Chart Generator for content involving data distributions or relationships.

## Page 6

The Chart Generator retrieves relevant data through search and web scraping tools, verifies authenticity and cross-source consistency, generates Python plotting code, and executes it in a sandbox to produce charts. After this stage, each section is associated with instantiated visual assets together with captions, descriptions, and source provenance.

#### 4.3 Context-Aware Sequential Writing

The Writer generates the report section by section. To maintain coherence across sections and reduce redundancy, it conditions on both section specifications and a dynamically updated global context.

## Pages 7-34

The remainder of the paper continues with:

- detailed framework design
- benchmark construction methodology
- evaluation metrics
- implementation details
- experiments across deep research systems
- ablation and case-study analysis
- appendices covering prompts, metric computation, and additional examples

For full details, please refer to the accompanying PDF in the same folder.
