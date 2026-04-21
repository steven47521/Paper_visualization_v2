# Reference Paper Taxonomy

This file records the current literature taxonomy rebuilt from the updated taxonomy PDF in `ref/`.

## Storage Rule

- PDF: `ref/paper_pdf/<heading...>/<paper-file>.pdf`
- Markdown: `ref/paper_md/<heading...>/<paper-stem>/<paper-stem>.md`
- Legacy flat files from the previous organization are archived under `_legacy_flat_backup_2026-04-21`.

## Current Coverage

- Total tracked entries in current Eval taxonomy: `48`
- Newly added entries in this update: `23`
- Current taxonomy coverage status: all tracked entries now have both PDF and Markdown artifacts in the rebuilt hierarchy.
- Legacy item removed from the current Eval taxonomy but preserved in archive: `2410.13639`

## Taxonomy

### Agent

#### Code Agent

- `2406.07436` McEval: Massively Multilingual Code Evaluation
- `2410.21157` M2rc-Eval: Massively Multilingual Repository-level Code Completion Evaluation
- `2412.00535` FullStack Bench: Evaluating LLMs as Full Stack Coders
- `2511.05459` SWE-Compass: Towards Unified Evaluation of Agentic Coding Abilities for Large Language Models
- [NEW] `2507.04952` ArtifactsBench: Bridging the Visual-Interactive Gap in LLM Code Generation Evaluation
- [NEW] `2512.12730` NL2Repo-Bench: Towards Long-Horizon Repository Generation Evaluation of Coding Agents
- [NEW] `2512.06915` Multi-Docker-Eval: A Shovel of the Gold Rush Benchmark on Automatic Environment Building for Software Engineering
- [NEW] `2604.11641` CodeTracer: Towards Traceable Agent States (CodeTraceBench)
- [NEW] `Web_Coding_Bench` WebCompass: Towards Multimodal Web Coding Evaluation for Code Language Models

#### Search Agent

- `2512.01948` How Far Are We from Genuinely Useful Deep Research Agents?
- [NEW] `2604.14683` DR3-Eval: Towards Realistic and Reproducible Deep Research Evaluation
- [NEW] `2510.11652` ACADREASON: Exploring the Limits of Reasoning Models with Academic Research Problems
- [NEW] `TVIR_ACL` TVIR

### Multimodal Agent

- [NEW] `2602.08367` WorldTravel: A Realistic Multimodal Travel-Planning Benchmark with Tightly Coupled Constraints
- [NEW] `2508.13186` MM-BrowseComp: A Comprehensive Benchmark for Multimodal Browsing Agents

### MLLM Benchmark

#### Image Understanding

- `2406.05862` II-Bench: An Image Implication Understanding Benchmark for Multimodal Large Language Models
- `2409.06851` LIME: Less Is More for Evaluation of MLLMs
- `2410.13854` Can MLLMs Understand the Deep Implication Behind Chinese Images?

#### Long Video Understanding

- `2510.17722` MT-Video-Bench: A Holistic Video Understanding Benchmark for Evaluating Multimodal LLMs in Multi-Turn Dialogues
- [NEW] `2505.23922` ScaleLong: A Multi-Timescale Benchmark for Long Video Understanding
- [NEW] `2511.07250` MVU-Eval: Towards Multi-Video Understanding Evaluation for Multimodal LLMs
- [NEW] `2504.15415` IV-Bench: A Benchmark for Image-Grounded Video Perception and Reasoning in Multimodal LLMs

#### Video Captioning

- [NEW] `2512.03405` ViDiC: Video Difference Captioning
- [NEW] `2510.18726` IF-VidCap: Can Video Caption Models Follow Instructions?
- [NEW] `2502.12782` VidCapBench: A Comprehensive Benchmark of Video Captioning for Controllable Text-to-Video Generation

#### Omni Understanding

- `2409.15272` OmniBench: Towards The Future of Universal Omni-Language Models
- [NEW] `2510.10689` OmniVideoBench: Towards Audio-Visual Understanding Evaluation for Omni MLLMs
- [NEW] `OmniCap_IF` OmniCap-IF: Benchmarking and Improving Instruction Following Abilities for Omni-Video Captioning

### AIGC

- [NEW] `2512.21094` T2AV-Compass: Towards Unified Evaluation for Text-to-Audio-Video Generation

### LLM Benchmark

#### Instruction Following

- `2402.14762` MT-Bench-101: A Fine-Grained Benchmark for Evaluating Large Language Models in Multi-Turn Dialogues
- [NEW] `2509.04292` Inverse IFEval: Can LLMs Unlearn Stubborn Training Conventions to Follow Real Instructions?

#### Long Context

- `2502.19361` Can Large Language Models Detect Errors in Long Chain-of-Thought Reasoning?
- `2409.16191` HelloBench: Evaluating Long Text Generation Capabilities of Large Language Models
- [NEW] `2603.12963` Long-form RewardBench: Evaluating Reward Models for Long-form Generation

#### Math

- `2402.14660` ConceptMath: A Bilingual Concept-Wise Benchmark for Measuring Mathematical Reasoning of Large Language Models
- [NEW] `2507.06181` CriticLean: Critic-Guided Reinforcement Learning for Mathematical Formalization (CriticLeanBench)

#### Reasoning

- `2410.06526` KOR-Bench: Benchmarking Language Models on Knowledge-Orthogonal Reasoning Tasks
- `2505.14552` KORGym: A Dynamic Game Platform for LLM Reasoning Evaluation
- `2408.09174` TableBench: A Comprehensive and Complex Benchmark for Table Question Answering
- `2410.11710` MTU-Bench: A Multi-granularity Tool-Use Benchmark for Large Language Models

#### Knowledge

- `2502.14739` SuperGPQA: Scaling LLM Evaluation across 285 Graduate Disciplines
- `2411.07140` Chinese SimpleQA: A Chinese Factuality Evaluation for Large Language Models
- `2309.09298` OWL: A Large Language Model for IT Operations

#### Safety

- `2412.15265` Chinese SafetyQA: A Safety Short-form Factuality Benchmark for Large Language Models
- `2502.11090` SafeDialBench: A Fine-Grained Safety Evaluation Benchmark for Large Language Models in Multi-Turn Dialogues with Diverse Jailbreak Attacks
- [NEW] `2505.23793` USB: A Comprehensive and Unified Safety Evaluation Benchmark for Multimodal Large Language Models

#### Role-playing

- `2310.00746` RoleLLM: Benchmarking, Eliciting, and Enhancing Role-Playing Abilities of Large Language Models
- `RoleAgent` RoleAgent: Building, Interacting, and Benchmarking High-quality Role-Playing Agents from Scripts

## Notes

- `Web_Coding_Bench.pdf`, `TVIR_ACL.pdf`, and `OmniCap_IF.pdf` came from existing local reference files mentioned in the updated taxonomy PDF and were placed into the rebuilt hierarchy directly.
- `2604.14683.pdf` is the current arXiv PDF for DR3-Eval; the older `DR3-Eval.pdf` source was preserved only in the legacy archive.
- `TVIR_ACL.md` was generated with PDF text extraction fallback because the final Doc2X request hit the current parsing quota limit after the other conversions had completed.
