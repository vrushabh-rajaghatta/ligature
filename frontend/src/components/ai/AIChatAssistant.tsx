

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  FileText,
  Search,
  Clock,
  ChevronRight,
  Loader2,
  User,
  Bot
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: { title: string; section: string }[];
}

interface SuggestedQuestion {
  text: string;
  category: string;
}

const suggestedQuestions: SuggestedQuestion[] = [
  { text: 'What questions has FDA asked about dissolution?', category: 'HAQ' },
  { text: 'Show me the status of LIG-2847 submissions', category: 'Submissions' },
  { text: 'Who is assigned to Module 2.5?', category: 'Planning' },
  { text: 'What documents need my approval?', category: 'Approvals' },
  { text: 'Summarize the latest regulatory intel', category: 'Strategy' },
  { text: 'What are the upcoming PDUFA dates?', category: 'Portfolio' },
];

// Simulated AI responses based on keywords
const getAIResponse = (query: string): { content: string; sources?: { title: string; section: string }[] } => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('dissolution') || lowerQuery.includes('fda') && lowerQuery.includes('question')) {
    return {
      content: `Based on our HAQ database, FDA has asked **47 questions about dissolution** across 3 submissions in the past 12 months. The most common themes are:\n\n1. **Method validation** (18 questions) - Particularly around discriminatory power\n2. **Acceptance criteria** (15 questions) - Justification of Q values\n3. **Apparatus selection** (14 questions) - USP Apparatus II vs IV\n\nThe average response time for dissolution questions is 5.2 days. Would you like me to show the specific questions or help draft a response?`,
      sources: [
        { title: 'HAQ-2024-001', section: 'CMC' },
        { title: 'HAQ-2023-089', section: 'CMC' },
        { title: 'HAQ Trend Analysis', section: 'Analytics' },
      ]
    };
  }
  
  if (lowerQuery.includes('lig-2847') || lowerQuery.includes('status')) {
    return {
      content: `**LIG-2847 (ligrastinib) Submission Status:**\n\n🇺🇸 **FDA NDA 123456**\n• Status: Under Review (65% complete)\n• PDUFA Date: Feb 15, 2025 (64 days)\n• Latest: Label negotiations in progress\n\n🇪🇺 **EMA MAA**\n• Status: Day 120 Review (45% complete)\n• Target: CHMP Opinion Apr 30, 2025\n• Latest: Day 80 response submitted\n\n🇯🇵 **PMDA JNDA**\n• Status: Pre-submission\n• Planned submission: Jan 15, 2025\n\nWould you like details on any specific region?`,
      sources: [
        { title: 'NDA 123456', section: 'Submissions' },
        { title: 'MAA EMEA/H/C/006123', section: 'Submissions' },
      ]
    };
  }
  
  if (lowerQuery.includes('module 2.5') || lowerQuery.includes('assigned')) {
    return {
      content: `**Module 2.5 Clinical Overview** assignments:\n\n• **Author (R):** Jennifer Walsh\n• **Accountable (A):** David Kim\n• **Consulted (C):** Sarah Chen\n• **Informed (I):** Robert Johnson\n\n**Current Status:** In Review (Step 3 of 5)\n• Author review: ✅ Complete\n• Medical review: ✅ Complete\n• Regulatory review: 🔄 In Progress\n• QA review: ⏳ Pending\n• Final approval: ⏳ Pending\n\nJennifer Walsh is currently at 95% workload capacity.`,
      sources: [
        { title: 'Planning - RACI Matrix', section: 'Module 2' },
        { title: 'Approval Workflow', section: 'Clinical Overview' },
      ]
    };
  }
  
  if (lowerQuery.includes('approval') || lowerQuery.includes('pending')) {
    return {
      content: `**Documents Pending Your Approval:**\n\n1. **2.5 Clinical Overview v2.3**\n   • Step: Regulatory Review\n   • Assigned: 2 days ago\n   • Author: Jennifer Walsh\n\n2. **3.2.P Drug Product v2.8**\n   • Step: Regulatory Review\n   • Assigned: Today\n   • Author: Michael Roberts\n\n3. **USPI Label Draft v1.2**\n   • Step: Medical/Legal Review\n   • Assigned: 3 days ago\n   • Author: Jennifer Walsh\n\nWould you like me to open any of these for review?`,
      sources: [
        { title: 'Approval Queue', section: 'Planning' },
      ]
    };
  }
  
  if (lowerQuery.includes('intel') || lowerQuery.includes('regulatory')) {
    return {
      content: `**Latest Regulatory Intelligence (Last 7 Days):**\n\n🔴 **CRITICAL:** FDA Draft Guidance on KRAS G12C Inhibitors\n• Impacts: Module 2.5, Labeling\n• Action: Review required\n\n🟡 **HIGH:** Mirati Adagrasib sNDA Submitted (1L NSCLC)\n• Competitive pressure increasing\n• Consider accelerating combination study\n\n🟡 **HIGH:** PRAC Hepatotoxicity Review\n• Class-wide safety signal\n• Review LIG-2847 hepatic data\n\n🔵 **MEDIUM:** EMA eCTD 4.0 Mandatory July 2025\n• LIG-3021 MAA must use v4.0\n\nWould you like details on any of these alerts?`,
      sources: [
        { title: 'Clarivate Alert', section: 'Strategy' },
        { title: 'Fyre Intel', section: 'Competitors' },
      ]
    };
  }
  
  if (lowerQuery.includes('pdufa') || lowerQuery.includes('date')) {
    return {
      content: `**Upcoming PDUFA & Target Dates:**\n\n| Product | Region | Type | Date | Days |\n|---------|--------|------|------|------|\n| LIG-2847 | 🇺🇸 FDA | PDUFA | Feb 15, 2025 | 64 |\n| LIG-5567 | 🇪🇺 EMA | CHMP Opinion | Mar 15, 2025 | 92 |\n| LIG-2847 | 🇪🇺 EMA | CHMP Opinion | Apr 30, 2025 | 138 |\n| LIG-2847 | 🇯🇵 PMDA | Approval | Jun 15, 2025 | 184 |\n\n**Next Critical:** Advisory Committee for LIG-2847 in 33 days (Jan 15, 2025)`,
      sources: [
        { title: 'Portfolio Dashboard', section: 'Calendar' },
      ]
    };
  }
  
  // Default response
  return {
    content: `I can help you with:\n\n• **Submissions** - Status, timelines, documents\n• **HAQ Intelligence** - Questions, trends, responses\n• **Planning** - Assignments, workload, approvals\n• **Strategy** - Reg intel, risks, assumptions\n• **Portfolio** - Pipeline, metrics, milestones\n\nTry asking something like "What questions has FDA asked about dissolution?" or "Show me pending approvals."`,
  };
};

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const response = getAIResponse(input);
    
    const assistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      sources: response.sources,
    };

    setIsTyping(false);
    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-accent-blue to-accent-purple rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed z-50 bg-surface border border-border rounded-xl shadow-2xl flex flex-col transition-all ${
        isExpanded 
          ? 'bottom-4 right-4 left-4 top-4 md:left-auto md:w-[600px] md:top-20' 
          : 'bottom-6 right-6 w-96 h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">Ligature AI</div>
            <div className="text-xs text-text-muted">Ask me anything</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-surface-card rounded-lg text-text-muted"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-surface-card rounded-lg text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Sparkles className="w-12 h-12 text-accent-purple mx-auto mb-3" />
              <h3 className="text-text-primary font-medium mb-1">How can I help?</h3>
              <p className="text-sm text-text-muted">
                I have access to all your regulatory data
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-text-muted uppercase tracking-wider">Suggested</div>
              {suggestedQuestions.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(q.text)}
                  className="w-full text-left p-3 bg-surface-card hover:bg-surface-elevated rounded-lg transition-colors"
                >
                  <div className="text-sm text-text-primary">{q.text}</div>
                  <div className="text-xs text-accent-blue mt-1">{q.category}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-surface-card text-text-primary'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.sources.map((source, i) => (
                        <span 
                          key={i}
                          className="text-xs bg-surface-elevated px-2 py-1 rounded text-text-muted flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          {source.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-surface-card p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about submissions, HAQs, planning..."
            className="flex-1 bg-surface-card border border-border rounded-lg px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
