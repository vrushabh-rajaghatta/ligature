
/**
 * AMA Content Formatter - v0.30.6
 * 
 * Formats streaming/generated content as professional AMA-style regulatory document HTML.
 * Converts plain text with markdown-like patterns into properly formatted content.
 * 
 * Used across all AI generation panels:
 * - BatchGenerationPanel
 * - AuthoringStreamingPanel
 * - AISectionEditor
 * - HAQStreamingPanel
 * - HAQRAGPanel
 * - SafetyNarrativeStreamingPanel
 * - AIGenerationPanel
 * - SectionGenerationWorkflow
 */

/**
 * Converts streaming/generated text to professional AMA-style HTML.
 * 
 * Handles:
 * - Markdown headers (# ## ###) → styled <h1-h3>
 * - **bold** → <strong>
 * - *italic* → <em>
 * - Bullet lists (- or •) → <ul><li>
 * - Numbered lists (1. 2.) → <ol><li>
 * - Paragraph breaks → justified <p> tags
 * 
 * @param content - Raw text content (plain text or with markdown)
 * @returns Properly formatted HTML string
 */
export function formatAsAMAContent(content: string): string {
  if (!content) return '';
  
  let html = content;
  
  // Escape HTML entities first (but preserve any existing HTML)
  if (!content.includes('<p>') && !content.includes('<h')) {
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  // Convert markdown-style headers to HTML with AMA styling
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 12pt; font-weight: bold; margin: 1.5em 0 0.75em 0;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 12pt; font-weight: bold; margin: 1.5em 0 0.75em 0;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 14pt; font-weight: bold; margin: 1.5em 0 0.75em 0;">$1</h1>');
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert bullet points to proper list items
  const bulletPattern = /^[\s]*[-•]\s+(.+)$/gm;
  if (bulletPattern.test(html)) {
    const lines = html.split('\n');
    let inList = false;
    const processedLines: string[] = [];
    
    for (const line of lines) {
      const bulletMatch = line.match(/^[\s]*[-•]\s+(.+)$/);
      if (bulletMatch) {
        if (!inList) {
          processedLines.push('<ul style="margin: 0.75em 0; padding-left: 2em;">');
          inList = true;
        }
        processedLines.push(`<li style="margin: 0.25em 0;">${bulletMatch[1]}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(line);
      }
    }
    if (inList) {
      processedLines.push('</ul>');
    }
    html = processedLines.join('\n');
  }
  
  // Convert numbered lists (1. 2. 3.)
  const numberedPattern = /^[\s]*(\d+)\.\s+(.+)$/gm;
  if (numberedPattern.test(html)) {
    const lines = html.split('\n');
    let inList = false;
    const processedLines: string[] = [];
    
    for (const line of lines) {
      const numMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
      if (numMatch) {
        if (!inList) {
          processedLines.push('<ol style="margin: 0.75em 0; padding-left: 2em;">');
          inList = true;
        }
        processedLines.push(`<li style="margin: 0.25em 0;">${numMatch[1]}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ol>');
          inList = false;
        }
        processedLines.push(line);
      }
    }
    if (inList) {
      processedLines.push('</ol>');
    }
    html = processedLines.join('\n');
  }
  
  // Convert double newlines to paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p style="margin: 0.75em 0; text-align: justify;">');
  
  // Convert single newlines within paragraphs to spaces (AMA doesn't use hard line breaks in prose)
  html = html.replace(/([^>])\n([^<])/g, '$1 $2');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p style="margin: 0.75em 0; text-align: justify;">${html}</p>`;
  }
  
  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');
  
  return html;
}

/**
 * CSS styles for AMA regulatory document content areas.
 * Apply to the container div that holds generated content.
 */
export const AMA_CONTENT_STYLES = {
  fontFamily: '"Times New Roman", Times, Georgia, serif',
  fontSize: '12pt',
  lineHeight: '1.6',
  color: '#1a1a1a',
} as const;

/**
 * Tailwind classes for AMA content container.
 */
export const AMA_CONTAINER_CLASSES = 'bg-white p-6 overflow-y-auto';

/**
 * React component wrapper for AMA-styled content.
 * Use this for consistent styling across all AI generation displays.
 */
export interface AMAContentDisplayProps {
  content: string;
  className?: string;
  showCursor?: boolean;
}

/**
 * Streaming cursor component for use with AMA content.
 */
export function StreamingCursor() {
  return (
    <span 
      className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-0.5" 
      style={{ verticalAlign: 'text-bottom' }}
    />
  );
}
