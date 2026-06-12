// ============================================================================
// Demo Narration Data - v85: Audience-Specific Scripts & Presenter Support
// ============================================================================
// Comprehensive narration content for each demo path, including:
// - Presenter scripts (what to say)
// - Talking points (key messages)
// - Aha moments (highlight callouts)
// - Transition hooks (between steps)
// - Q&A prompts (natural pause points)
// ============================================================================

import type { DemoStep } from '@/store/useDemoStore'
import type { DemoAudienceType } from '@/store/useDemoAnalyticsStore'

// ============================================================================
// TYPES
// ============================================================================

export interface StepNarration {
  presenterScript: string
  keyMessage: string
  visualFocus: string
  ahaMoment?: AhaMoment
  transitionHook: string
  pauseForQA?: boolean
  qaPrompts?: string[]
  timing: {
    minSeconds: number
    maxSeconds: number
    suggestedSeconds: number
  }
}

export interface AhaMoment {
  trigger: 'auto' | 'manual' | 'on-action'
  title: string
  message: string
  metric?: string
  icon: 'sparkles' | 'rocket' | 'chart' | 'shield' | 'clock' | 'brain'
  highlightSelector?: string
}

export interface PathNarration {
  pathId: string
  audienceType: DemoAudienceType
  openingHook: string
  closingStatement: string
  keyDifferentiators: string[]
  competitivePoints: string[]
  objectionHandlers: Record<string, string>
  steps: Record<DemoStep, StepNarration>
}

// ============================================================================
// INVESTOR PATH NARRATION
// ============================================================================

export const INVESTOR_NARRATION: PathNarration = {
  pathId: 'investor-pitch',
  audienceType: 'investor',
  openingHook: "Every year, pharmaceutical companies spend $2.6 billion and 10-15 years bringing a single drug to market. 40% of that cost is operational inefficiency trapped in document silos. Ligature is the first platform to transform that paradigm.",
  closingStatement: "Ligature isn't just another SaaS tool—it's the operating system for life sciences R&D. We're capturing the $25B market that Veeva pioneered but never fully integrated. The question isn't whether this transformation will happen, but who will lead it.",
  keyDifferentiators: [
    "First true IDOP connecting all R&D operations",
    "AI that understands regulatory context, not just language",
    "Data-centric architecture vs. document-centric legacy",
    "17+ integrated modules vs. point solutions"
  ],
  competitivePoints: [
    "Veeva: $40B market cap proving the thesis, but document-centric architecture limits AI potential",
    "Medidata/Oracle: Clinical-only, no regulatory integration",
    "Vault-type competitors: Single-module focus, integration tax",
  ],
  objectionHandlers: {
    "veeva-moat": "Veeva's strength is also its weakness—their document-centric architecture was built for a pre-AI world. Every document is a data silo. We're building for how AI actually works: structured data, relationships, context.",
    "pharma-slow": "Yes, pharma moves carefully—that's why our wedge is regulatory operations, where the pain is acute and the ROI is measurable in days, not years. Once we're in, we expand.",
    "competition": "The existing players optimized for different eras. Veeva built for document management, Oracle for clinical operations. None built for AI-native workflows across the full R&D lifecycle.",
  },
  steps: {
    'welcome': {
      presenterScript: "Welcome to Ligature—the R&D Connected Platform for Life Sciences. What you're about to see is not a mockup. This is a working platform with real AI integration, processing actual regulatory workflows.",
      keyMessage: "This is real, working software—not slides or mockups",
      visualFocus: "Platform logo and branding, professional presentation",
      timing: { minSeconds: 20, maxSeconds: 45, suggestedSeconds: 30 },
      transitionHook: "Let me show you what a connected pharmaceutical R&D platform actually looks like...",
    },
    'portfolio-overview': {
      presenterScript: "This is the Portfolio Command Center. Every product in your pipeline, every trial, every submission—connected in one view. What you're seeing here is Nexavant, our demo product, a KRAS G12C inhibitor in late-stage development for NSCLC.",
      keyMessage: "Single source of truth across 17+ integrated modules",
      visualFocus: "Product card for LIG-2847/Nexavant, status indicators",
      ahaMoment: {
        trigger: 'auto',
        title: 'Portfolio Intelligence',
        message: 'Click any product to see integrated data from clinical trials, regulatory submissions, safety signals, and CMC—all connected.',
        metric: '17+ Modules Connected',
        icon: 'chart',
        highlightSelector: '[data-product-id="LIG-2847"]',
      },
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Now let's look at where the clinical data actually lives...",
      pauseForQA: true,
      qaPrompts: [
        "What products are in your current pipeline?",
        "How many systems do you use to track this today?"
      ],
    },
    'clinical-data': {
      presenterScript: "This is the Clinical Development workspace. We're looking at the STELLAR trial—the Phase 3 pivotal study for Nexavant. Notice how enrollment, site performance, and endpoint data are all here, automatically connected to your submission documents.",
      keyMessage: "Clinical data flows directly to regulatory documents—no manual transcription",
      visualFocus: "Trial dashboard, enrollment metrics, site map",
      ahaMoment: {
        trigger: 'auto',
        title: 'Continuous Data Flow',
        message: 'Traditional systems require "database lock" before regulatory can start. Here, validated data flows continuously—enabling real-time CSR authoring.',
        metric: 'Eliminates Database Lock Delays',
        icon: 'clock',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "This data automatically feeds into our document authoring system. Let me show you...",
    },
    'document-authoring': {
      presenterScript: "Here's where the magic happens. This is our AI-powered authoring environment. We're looking at a Clinical Study Report section. Notice the structured content model—every section, every data point is addressable by AI.",
      keyMessage: "Structured content enables AI to draft with regulatory intelligence",
      visualFocus: "Document editor, section structure, AI generation button",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Watch what happens when we ask AI to draft a section...",
    },
    'ai-generation': {
      presenterScript: "I'm going to click 'Generate with AI' and you're going to see Claude draft this section in real-time. This isn't generic AI—it's pulling from the clinical data you just saw, citing source documents, and formatting to ICH standards automatically.",
      keyMessage: "AI that understands regulatory context, not just language",
      visualFocus: "AI streaming panel, real-time generation",
      ahaMoment: {
        trigger: 'on-action',
        title: 'Intelligent Generation',
        message: 'This draft took 8 seconds. A medical writer would need 2-3 hours. That\'s the AI multiplier—not replacement, but amplification.',
        metric: '73% Faster First Drafts',
        icon: 'brain',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "Now imagine applying this to the most painful regulatory workflow—Health Authority Questions...",
      pauseForQA: true,
      qaPrompts: [
        "How long does first draft writing take today?",
        "What's your current AI strategy for regulatory documents?"
      ],
    },
    'haq-response': {
      presenterScript: "Health Authority Questions—every regulatory team's nightmare. These are the questions FDA sends on Day 74 of NDA review. You typically have 30 days to respond, and your approval timeline depends on quality. This is where AI really shines.",
      keyMessage: "AI-drafted HAQ responses with 94%+ quality scores",
      visualFocus: "HAQ list, question panel, response generation",
      ahaMoment: {
        trigger: 'on-action',
        title: 'HAQ Intelligence',
        message: 'This response was drafted in 12 seconds with automatic citations to source documents. Quality scoring shows 94% match to approved response patterns.',
        metric: '94% Quality Score',
        icon: 'sparkles',
      },
      timing: { minSeconds: 60, maxSeconds: 120, suggestedSeconds: 90 },
      transitionHook: "While regulatory is responding to questions, the safety team is monitoring for signals. Let's see how that connects...",
    },
    'safety-signal': {
      presenterScript: "Pharmacovigilance is where AI's pattern recognition really matters. This signal detection dashboard shows emerging safety patterns across all sources—clinical trials, spontaneous reports, literature. The AI generates evaluation summaries for your safety committee.",
      keyMessage: "AI-powered signal detection and case narrative generation",
      visualFocus: "Signal dashboard, case narrative panel",
      ahaMoment: {
        trigger: 'auto',
        title: 'Safety Intelligence',
        message: 'This hepatotoxicity signal was detected 3 weeks earlier than traditional methods would have caught it. Early detection means earlier mitigation.',
        metric: '3 Weeks Earlier Detection',
        icon: 'shield',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "All of this content—documents, HAQ responses, safety narratives—flows into the submission. Let me show you the assembly process...",
    },
    'submission-building': {
      presenterScript: "This is the eCTD Workspace. Every document we've created automatically slots into the CTD structure. The validation engine runs 200+ business rules in real-time—before you submit, not after rejection.",
      keyMessage: "One-click submission building with real-time validation",
      visualFocus: "eCTD tree, validation status, document slots",
      ahaMoment: {
        trigger: 'auto',
        title: 'Submission Assembly',
        message: 'Traditional submission assembly takes 2-3 weeks. With pre-validated content and automatic structure generation, this takes hours.',
        metric: '85% Faster Assembly',
        icon: 'rocket',
      },
      timing: { minSeconds: 45, maxSeconds: 75, suggestedSeconds: 60 },
      transitionHook: "Once validated, submission goes directly to the gateway...",
    },
    'publishing': {
      presenterScript: "This is the Publishing Center—the final mile. Direct submission to FDA ESG, EMA CESP, or PMDA. Full audit trail, acknowledgment tracking, lifecycle management. No separate publishing system, no hand-offs, no errors.",
      keyMessage: "End-to-end from authoring to gateway in one platform",
      visualFocus: "Gateway selection, submission status, audit trail",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Let me bring this back to the investment thesis...",
    },
    'complete': {
      presenterScript: "What you've seen is the first true R&D Connected Platform. 17+ integrated modules, real AI integration, data-centric architecture. This is the Veeva replacement that the industry has been waiting for.",
      keyMessage: "First-mover in a $25B+ market transformation",
      visualFocus: "Platform metrics, integration map",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "",
      pauseForQA: true,
      qaPrompts: [
        "What questions do you have about the technology?",
        "What would you like to see in a deeper dive?",
        "How does this compare to what you've seen in the market?"
      ],
    },
  },
}

// ============================================================================
// EXECUTIVE PATH NARRATION
// ============================================================================

export const EXECUTIVE_NARRATION: PathNarration = {
  pathId: 'executive-overview',
  audienceType: 'executive',
  openingHook: "Your teams spend 40% of their time searching for information, reconciling data, and reformatting documents. Ligature eliminates that overhead by connecting everything.",
  closingStatement: "This is operational transformation, not incremental improvement. The question is whether you want to lead this change or react to it.",
  keyDifferentiators: [
    "73% faster document drafting",
    "Single source of truth across R&D",
    "AI that amplifies your experts, not replaces them",
    "Continuous compliance, not periodic audits"
  ],
  competitivePoints: [],
  objectionHandlers: {
    "change-management": "We designed for gradual adoption. Teams can start with one module—say, HAQ response—and expand naturally. No big bang required.",
    "data-migration": "Our platform reads from your existing systems during transition. No forced migration, no data loss, no downtime.",
  },
  steps: {
    'welcome': {
      presenterScript: "Welcome to Ligature. I'll show you how an intelligent platform can transform your R&D operations—starting with immediate productivity gains and building to strategic advantage.",
      keyMessage: "Immediate ROI with strategic platform benefits",
      visualFocus: "Platform overview, clean professional design",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "Let's start with your portfolio view...",
    },
    'portfolio-overview': {
      presenterScript: "This command center shows your entire pipeline at a glance. Every product, every trial, every submission status—connected and current. No more chasing spreadsheets.",
      keyMessage: "Real-time visibility across your entire portfolio",
      visualFocus: "Portfolio dashboard, status indicators",
      ahaMoment: {
        trigger: 'auto',
        title: 'Connected Intelligence',
        message: 'Every click reveals connected data. No silos, no surprises.',
        metric: 'One Platform',
        icon: 'chart',
      },
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Now watch how AI multiplies your team's capabilities...",
    },
    'clinical-data': {
      presenterScript: "Clinical operations data flows directly to regulatory documents. No more database lock delays, no more transcription errors.",
      keyMessage: "Continuous data flow eliminates handoff delays",
      visualFocus: "Trial metrics, data flow visualization",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Let me show you the AI in action...",
    },
    'document-authoring': {
      presenterScript: "Your medical writers spend hours on first drafts. Our AI creates compliant first drafts in seconds—freeing your experts to focus on strategy and review.",
      keyMessage: "AI amplifies experts instead of replacing them",
      visualFocus: "Document editor, AI generation",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Watch this...",
    },
    'ai-generation': {
      presenterScript: "Real-time AI drafting. This isn't generic content—it's pulling from your actual clinical data, citing your source documents, following ICH guidelines automatically.",
      keyMessage: "Context-aware AI, not generic language models",
      visualFocus: "Streaming generation, citations",
      ahaMoment: {
        trigger: 'on-action',
        title: 'Expert Amplification',
        message: 'Your medical writer reviews and refines. AI handles the tedious assembly. That\'s a 73% productivity gain.',
        metric: '73% Faster',
        icon: 'brain',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "This same capability transforms your most painful workflow...",
    },
    'haq-response': {
      presenterScript: "Health Authority Questions typically take weeks of expert time. With AI assistance, your team can respond faster and more consistently—with built-in quality scoring.",
      keyMessage: "Transform weeks of work into hours",
      visualFocus: "HAQ workflow, quality metrics",
      ahaMoment: {
        trigger: 'on-action',
        title: 'Approval Acceleration',
        message: 'Faster HAQ responses mean faster approvals. That\'s revenue acceleration.',
        metric: '30% Faster Response',
        icon: 'rocket',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "Let me wrap this up with the bottom line...",
    },
    'safety-signal': {
      presenterScript: "Safety signal detection with AI pattern recognition. Earlier detection means earlier mitigation—protecting patients and your investment.",
      keyMessage: "AI pattern recognition for earlier signal detection",
      visualFocus: "Signal dashboard",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "All connected to your submissions...",
    },
    'submission-building': {
      presenterScript: "Every document automatically validates against 200+ regulatory rules before submission. No rejection surprises.",
      keyMessage: "Pre-validated submissions, no rejection surprises",
      visualFocus: "Validation status",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "And straight to the gateway...",
    },
    'publishing': {
      presenterScript: "Direct gateway submission. Complete audit trail. This is end-to-end operational excellence.",
      keyMessage: "End-to-end workflow, complete audit trail",
      visualFocus: "Gateway submission",
      timing: { minSeconds: 20, maxSeconds: 45, suggestedSeconds: 30 },
      transitionHook: "",
    },
    'complete': {
      presenterScript: "Ligature: One platform connecting your entire R&D operation. Immediate productivity gains, strategic competitive advantage. What questions can I answer?",
      keyMessage: "Strategic platform for operational excellence",
      visualFocus: "Platform summary",
      timing: { minSeconds: 20, maxSeconds: 45, suggestedSeconds: 30 },
      transitionHook: "",
      pauseForQA: true,
      qaPrompts: [
        "Which workflow causes the most pain today?",
        "What's your timeline for platform decisions?"
      ],
    },
  },
}

// ============================================================================
// REGULATORY PATH NARRATION
// ============================================================================

export const REGULATORY_NARRATION: PathNarration = {
  pathId: 'regulatory-focus',
  audienceType: 'regulatory',
  openingHook: "I've spent my career in regulatory operations, and I built Ligature to solve the problems I lived every day. This isn't a tech company's idea of what regulatory needs—it's what regulatory professionals actually need.",
  closingStatement: "This is the platform I wished I had when I was managing submissions. Built by regulatory professionals, for regulatory professionals.",
  keyDifferentiators: [
    "ICH M4-compliant from the ground up",
    "eCTD 4.0 ready with backward compatibility",
    "HAQ response workflow designed by regulatory professionals",
    "Regional variations built in (FDA, EMA, PMDA, TGA, Health Canada)"
  ],
  competitivePoints: [
    "Unlike Veeva Vault, designed specifically for modern AI-enabled workflows",
    "Unlike generic document systems, understands CTD structure natively",
    "Unlike point solutions, connects clinical, safety, and CMC data"
  ],
  objectionHandlers: {
    "validation": "Full 21 CFR Part 11 compliance with comprehensive audit trails. We're designed for GxP environments.",
    "regional": "All major regional requirements built in—not as add-ons, but as first-class features.",
  },
  steps: {
    'welcome': {
      presenterScript: "Welcome to Ligature. I'm going to show you a platform built specifically for modern regulatory operations—HAQ management, eCTD authoring, submission lifecycle, all connected with AI assistance.",
      keyMessage: "Built by regulatory professionals, for regulatory professionals",
      visualFocus: "Platform branding",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "Let's start with your portfolio view and dive into the regulatory workflows...",
    },
    'portfolio-overview': {
      presenterScript: "Portfolio view with regulatory status front and center. Every application, every sequence, every pending question—visible at a glance.",
      keyMessage: "Regulatory status visibility across your portfolio",
      visualFocus: "Regulatory status indicators, application numbers",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 40 },
      transitionHook: "Let me show you the HAQ workflow—I know this is where the pain lives...",
    },
    'clinical-data': {
      presenterScript: "Clinical data that connects directly to your Module 2.7 and Module 5 documents. No more chasing study teams for data—it flows automatically.",
      keyMessage: "Clinical data flows to regulatory documents automatically",
      visualFocus: "Data connections to CTD modules",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "This data feeds directly into authoring...",
    },
    'document-authoring': {
      presenterScript: "Structured authoring with ICH templates built in. Every section knows its CTD location, formatting requirements, and cross-reference targets.",
      keyMessage: "ICH-compliant authoring with built-in structure",
      visualFocus: "CTD section structure, template application",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Now let's see the AI assist with a complex section...",
    },
    'ai-generation': {
      presenterScript: "AI drafting that understands regulatory requirements. Watch it pull clinical data, cite source documents, and format to ICH standards—all automatically. Your writers review and refine, not transcribe and format.",
      keyMessage: "AI that understands regulatory context and requirements",
      visualFocus: "Generation with ICH formatting, citations",
      ahaMoment: {
        trigger: 'on-action',
        title: 'Regulatory-Aware AI',
        message: 'This draft includes proper Module citations, table formatting per ICH guidelines, and cross-references to source data.',
        metric: 'ICH M4 Compliant',
        icon: 'sparkles',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "Now let's look at HAQ response—the workflow that keeps everyone up at night...",
    },
    'haq-response': {
      presenterScript: "Day 74 questions. You know the drill—30 days to respond, your approval depends on quality, and every question needs expert review. This workflow transforms how you manage responses.",
      keyMessage: "Complete HAQ lifecycle with AI assistance",
      visualFocus: "HAQ list, response workflow, quality scoring",
      ahaMoment: {
        trigger: 'on-action',
        title: 'HAQ Response Intelligence',
        message: 'AI drafts with automatic citations to your own submission. Quality scoring compares to approved response patterns. Your team reviews, not writes from scratch.',
        metric: '94% Quality Match',
        icon: 'brain',
      },
      timing: { minSeconds: 60, maxSeconds: 120, suggestedSeconds: 90 },
      transitionHook: "These responses flow directly into your amended submission...",
      pauseForQA: true,
      qaPrompts: [
        "How do you currently manage HAQ responses?",
        "What's your typical response time today?"
      ],
    },
    'safety-signal': {
      presenterScript: "Safety-Regulatory Bridge. Signals detected here automatically flag relevant submission documents. Your safety narrative work connects to your Module 2.7.4.",
      keyMessage: "Safety data connected to regulatory submissions",
      visualFocus: "Signal-to-document connections",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "All this content assembles into your eCTD...",
    },
    'submission-building': {
      presenterScript: "eCTD Workspace. Native Module 1-5 structure, sequence management, lifecycle tracking. Validation runs against 200+ business rules in real-time—you know before submission whether it will pass technical validation.",
      keyMessage: "Native eCTD structure with pre-submission validation",
      visualFocus: "CTD tree, validation rules, sequence history",
      ahaMoment: {
        trigger: 'auto',
        title: 'Validation Intelligence',
        message: 'Every rule from the FDA Technical Conformance Guide, EMA validation criteria, and regional requirements—checked before you submit.',
        metric: '200+ Rules Validated',
        icon: 'shield',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "And direct to gateway...",
    },
    'publishing': {
      presenterScript: "Direct submission to FDA ESG, EMA CESP, PMDA Gateway. Acknowledgment tracking, lifecycle management, complete audit trail for inspections.",
      keyMessage: "Multi-gateway publishing with complete audit trail",
      visualFocus: "Gateway selection, acknowledgment status",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "",
    },
    'complete': {
      presenterScript: "This is modern regulatory operations—connected, intelligent, compliant. What would you like to explore in more detail?",
      keyMessage: "Complete regulatory operations platform",
      visualFocus: "Platform summary",
      timing: { minSeconds: 20, maxSeconds: 45, suggestedSeconds: 30 },
      transitionHook: "",
      pauseForQA: true,
      qaPrompts: [
        "Which workflow would make the biggest difference?",
        "What's your current tool stack for regulatory?",
        "How do you handle multi-region submissions today?"
      ],
    },
  },
}

// ============================================================================
// TECHNICAL PATH NARRATION
// ============================================================================

export const TECHNICAL_NARRATION: PathNarration = {
  pathId: 'technical-deep-dive',
  audienceType: 'technical',
  openingHook: "Let me show you the architecture. This isn't a PowerPoint—it's a production application running Next.js 14, TypeScript, real Claude API integration, and a data model designed for regulatory complexity.",
  closingStatement: "Clean architecture, modern stack, designed for enterprise scale. Happy to go as deep as you'd like on any component.",
  keyDifferentiators: [
    "Next.js 14 + React + TypeScript",
    "Real Anthropic Claude API integration with streaming",
    "Zustand state management with cross-module sync",
    "ICH eCTD 4.0 compliant validation engine"
  ],
  competitivePoints: [],
  objectionHandlers: {
    "scale": "The architecture is stateless by design. Zustand stores are client-side, API calls are serverless, data is in your infrastructure. Horizontal scaling is straightforward.",
    "security": "We're designed for SOC 2 and HIPAA. Audit trails are immutable, PII handling follows GDPR requirements, API keys never touch the client.",
    "integration": "REST and GraphQL APIs for everything. We integrate with existing CTMS, EDC, safety databases—we read from your systems, not replace them.",
  },
  steps: {
    'welcome': {
      presenterScript: "Welcome to the technical deep dive. I'll walk you through the architecture, data model, AI integration, and validation engine. Feel free to interrupt with questions—I'm a developer, not a salesperson.",
      keyMessage: "Production application, not a prototype",
      visualFocus: "Application shell, architecture overview",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "Let's start with the data model...",
    },
    'portfolio-overview': {
      presenterScript: "Portfolio state is managed by Zustand stores with selective subscriptions. Each product, application, and document has a unique identifier that enables cross-module relationships without tight coupling.",
      keyMessage: "Zustand stores with cross-module relationship model",
      visualFocus: "State structure, component hierarchy",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "The clinical module shows how we handle domain-specific complexity...",
    },
    'clinical-data': {
      presenterScript: "Clinical data model supports CDISC standards—SDTM for submission data, ADaM for analysis datasets. The bridge to regulatory documents is maintained through a reference system that tracks data lineage.",
      keyMessage: "CDISC-aware data model with regulatory traceability",
      visualFocus: "Data model diagram, reference system",
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "This data feeds the authoring module...",
    },
    'document-authoring': {
      presenterScript: "The document model is hierarchical—documents contain sections, sections contain blocks, blocks contain content. Each level has metadata for CTD mapping, version control, and review status. The editor is built on custom components optimized for structured content.",
      keyMessage: "Hierarchical document model with CTD awareness",
      visualFocus: "Document structure, component architecture",
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "Now let me show you the AI integration...",
      pauseForQA: true,
      qaPrompts: [
        "How do you handle concurrent editing?",
        "What's the version control model?"
      ],
    },
    'ai-generation': {
      presenterScript: "Claude API integration with streaming responses. The prompt engineering is the interesting part—we inject regulatory context, source document references, and formatting requirements. The response is parsed in real-time and validated against the document schema.",
      keyMessage: "Context-injected prompts with schema-validated responses",
      visualFocus: "API call structure, prompt template, streaming handler",
      ahaMoment: {
        trigger: 'on-action',
        title: 'AI Architecture',
        message: 'Prompt includes: CTD section context, source data references, formatting schema, regulatory guidelines. Response streams to UI while validating structure.',
        metric: 'Real-Time Validation',
        icon: 'brain',
      },
      timing: { minSeconds: 60, maxSeconds: 120, suggestedSeconds: 90 },
      transitionHook: "The same pattern applies to HAQ responses...",
    },
    'haq-response': {
      presenterScript: "HAQ workflow state machine with draft, review, approval stages. AI generation includes citation extraction from source documents—the model identifies relevant sections and includes proper Module references.",
      keyMessage: "State machine workflow with AI citation extraction",
      visualFocus: "Workflow state, citation system",
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "Safety module has its own complexity...",
    },
    'safety-signal': {
      presenterScript: "Safety data follows ICSR/E2B structure. Signal detection uses pattern analysis across case data. The narrative generator produces E2B-compliant output with MedDRA coding.",
      keyMessage: "ICSR/E2B compliant with MedDRA integration",
      visualFocus: "Data structure, coding system",
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "Now the submission assembly...",
    },
    'submission-building': {
      presenterScript: "eCTD builder implements the ICH backbone structure. Validation engine runs rules from FDA Technical Conformance Guide, EMA Business Rules, and regional requirements. Rules are expressed declaratively and can be updated without code changes.",
      keyMessage: "Declarative validation rules, ICH backbone compliance",
      visualFocus: "Backbone structure, rule engine",
      ahaMoment: {
        trigger: 'auto',
        title: 'Validation Engine',
        message: 'Rules are loaded from configuration, not hardcoded. When FDA updates TCG, we update config—no deployment required.',
        metric: 'Config-Driven Rules',
        icon: 'shield',
      },
      timing: { minSeconds: 45, maxSeconds: 90, suggestedSeconds: 60 },
      transitionHook: "Publishing completes the pipeline...",
      pauseForQA: true,
      qaPrompts: [
        "How are validation rules maintained?",
        "What's the error handling strategy?"
      ],
    },
    'publishing': {
      presenterScript: "Gateway integration is abstracted—same API, different adapters for FDA ESG, EMA CESP, PMDA. Acknowledgment polling, lifecycle tracking, audit trail generation all handled consistently.",
      keyMessage: "Abstracted gateway integration with unified audit trail",
      visualFocus: "Gateway adapter pattern, audit system",
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "",
    },
    'complete': {
      presenterScript: "That's the architecture. Next.js 14, TypeScript throughout, real AI integration, domain-aware validation. What would you like to dig into?",
      keyMessage: "Modern stack, domain expertise, production ready",
      visualFocus: "Architecture summary",
      timing: { minSeconds: 20, maxSeconds: 45, suggestedSeconds: 30 },
      transitionHook: "",
      pauseForQA: true,
      qaPrompts: [
        "Questions on any specific component?",
        "How should we schedule a code review?",
        "What's your deployment environment?"
      ],
    },
  },
}

// ============================================================================
// HIGHLIGHTS PATH NARRATION (Quick auto-advancing tour)
// ============================================================================

export const HIGHLIGHTS_NARRATION: PathNarration = {
  pathId: 'highlights-reel',
  audienceType: 'executive',
  openingHook: "Let me give you a quick tour of the most impressive capabilities.",
  closingStatement: "That's the highlight reel. Would you like a deeper dive into any area?",
  keyDifferentiators: [
    "AI-powered regulatory operations",
    "Connected platform, not point solutions",
    "73% productivity improvement"
  ],
  competitivePoints: [],
  objectionHandlers: {},
  steps: {
    'welcome': {
      presenterScript: "Quick tour of Ligature's key capabilities.",
      keyMessage: "Fast-paced highlight of key features",
      visualFocus: "Platform branding",
      timing: { minSeconds: 10, maxSeconds: 20, suggestedSeconds: 15 },
      transitionHook: "Here's your portfolio...",
    },
    'portfolio-overview': {
      presenterScript: "Complete pipeline visibility. Every product, trial, submission—connected.",
      keyMessage: "Single source of truth",
      visualFocus: "Portfolio dashboard",
      ahaMoment: {
        trigger: 'auto',
        title: 'Connected Data',
        message: '17+ integrated modules in one platform.',
        metric: '17+ Modules',
        icon: 'chart',
      },
      timing: { minSeconds: 20, maxSeconds: 40, suggestedSeconds: 30 },
      transitionHook: "Watch the AI in action...",
    },
    'clinical-data': {
      presenterScript: "Clinical data flows directly to regulatory documents.",
      keyMessage: "Continuous data flow",
      visualFocus: "Trial dashboard",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "And here's the magic...",
    },
    'document-authoring': {
      presenterScript: "AI drafts regulatory documents in seconds.",
      keyMessage: "AI-powered authoring",
      visualFocus: "Document editor",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "Watch...",
    },
    'ai-generation': {
      presenterScript: "Real-time AI drafting. Citations included. ICH compliant.",
      keyMessage: "73% faster first drafts",
      visualFocus: "Streaming generation",
      ahaMoment: {
        trigger: 'auto',
        title: 'AI Drafting',
        message: '73% faster with automatic regulatory formatting.',
        metric: '73% Faster',
        icon: 'brain',
      },
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 45 },
      transitionHook: "Same for HAQ responses...",
    },
    'haq-response': {
      presenterScript: "Health Authority Questions—drafted with AI, quality scored automatically.",
      keyMessage: "94% quality match",
      visualFocus: "HAQ panel",
      ahaMoment: {
        trigger: 'auto',
        title: 'HAQ Intelligence',
        message: 'AI drafts with automatic source citations.',
        metric: '94% Quality',
        icon: 'sparkles',
      },
      timing: { minSeconds: 30, maxSeconds: 60, suggestedSeconds: 40 },
      transitionHook: "And safety signals...",
    },
    'safety-signal': {
      presenterScript: "AI-powered signal detection. 3 weeks earlier than traditional methods.",
      keyMessage: "Earlier detection",
      visualFocus: "Signal dashboard",
      ahaMoment: {
        trigger: 'auto',
        title: 'Signal Detection',
        message: 'Pattern recognition catches signals weeks earlier.',
        metric: '3 Weeks Earlier',
        icon: 'shield',
      },
      timing: { minSeconds: 20, maxSeconds: 40, suggestedSeconds: 30 },
      transitionHook: "All connected to submission...",
    },
    'submission-building': {
      presenterScript: "One-click submission building. 200+ validation rules.",
      keyMessage: "Pre-validated submissions",
      visualFocus: "eCTD workspace",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "Done!",
    },
    'publishing': {
      presenterScript: "Direct gateway submission. Full audit trail.",
      keyMessage: "End-to-end workflow",
      visualFocus: "Publishing center",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "",
    },
    'complete': {
      presenterScript: "That's Ligature. Questions?",
      keyMessage: "Ready for deeper dive",
      visualFocus: "Summary",
      timing: { minSeconds: 15, maxSeconds: 30, suggestedSeconds: 20 },
      transitionHook: "",
      pauseForQA: true,
      qaPrompts: ["What would you like to see more of?"],
    },
  },
}

// ============================================================================
// NARRATION ACCESS FUNCTIONS
// ============================================================================

const NARRATIONS: Record<string, PathNarration> = {
  'investor-pitch': INVESTOR_NARRATION,
  'executive-overview': EXECUTIVE_NARRATION,
  'regulatory-focus': REGULATORY_NARRATION,
  'technical-deep-dive': TECHNICAL_NARRATION,
  'highlights-reel': HIGHLIGHTS_NARRATION,
}

export function getNarrationForPath(pathId: string): PathNarration | null {
  return NARRATIONS[pathId] || null
}

export function getStepNarration(pathId: string, step: DemoStep): StepNarration | null {
  const narration = NARRATIONS[pathId]
  if (!narration) return null
  return narration.steps[step] || null
}

export function getAhaMomentForStep(pathId: string, step: DemoStep): AhaMoment | null {
  const stepNarration = getStepNarration(pathId, step)
  return stepNarration?.ahaMoment || null
}

export function getObjectionHandler(pathId: string, objectionKey: string): string | null {
  const narration = NARRATIONS[pathId]
  return narration?.objectionHandlers[objectionKey] || null
}

export function getAllAhaMoments(pathId: string): Array<{ step: DemoStep; moment: AhaMoment }> {
  const narration = NARRATIONS[pathId]
  if (!narration) return []
  
  const moments: Array<{ step: DemoStep; moment: AhaMoment }> = []
  for (const [step, stepNarration] of Object.entries(narration.steps)) {
    if (stepNarration.ahaMoment) {
      moments.push({ step: step as DemoStep, moment: stepNarration.ahaMoment })
    }
  }
  return moments
}

export function calculatePathDuration(pathId: string, steps: DemoStep[]): { min: number; max: number; suggested: number } {
  const narration = NARRATIONS[pathId]
  if (!narration) return { min: 0, max: 0, suggested: 0 }
  
  let min = 0, max = 0, suggested = 0
  for (const step of steps) {
    const stepNarration = narration.steps[step]
    if (stepNarration) {
      min += stepNarration.timing.minSeconds
      max += stepNarration.timing.maxSeconds
      suggested += stepNarration.timing.suggestedSeconds
    }
  }
  
  return { min, max, suggested }
}
