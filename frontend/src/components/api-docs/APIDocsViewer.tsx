
/**
 * API Documentation Viewer Component
 * Renders OpenAPI specification in a user-friendly format
 * 
 * @version 0.15.31
 */


import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Check,
  Search,
  ExternalLink,
  Lock,
  Tag,
  FileJson,
  Server
} from 'lucide-react';
import type { OpenAPISpec } from '@/lib/openapi';

// =============================================================================
// TYPES
// =============================================================================

interface EndpointInfo {
  method: string;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  operationId: string;
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema: Record<string, unknown>;
  }>;
  requestBody?: {
    required?: boolean;
    content: Record<string, { schema: Record<string, unknown> }>;
  };
  responses: Record<string, { description: string; content?: Record<string, unknown> }>;
  security?: Array<Record<string, string[]>>;
}

interface APIDocsViewerProps {
  spec: OpenAPISpec;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const methodColors: Record<string, string> = {
  get: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  post: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  put: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  patch: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function MethodBadge({ method }: { method: string }) {
  const colorClass = methodColors[method.toLowerCase()] || 'bg-gray-500/20 text-gray-400';
  return (
    <span className={`px-2 py-0.5 text-xs font-mono font-bold uppercase rounded border ${colorClass}`}>
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-gray-400 hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function SchemaViewer({ schema, depth = 0 }: { schema: Record<string, unknown>; depth?: number }) {
  if (!schema) return null;

  if (schema.$ref) {
    const refName = (schema.$ref as string).split('/').pop();
    return <span className="text-cyan-400">{refName}</span>;
  }

  if (schema.type === 'array' && schema.items) {
    return (
      <span>
        Array&lt;<SchemaViewer schema={schema.items as Record<string, unknown>} depth={depth + 1} />&gt;
      </span>
    );
  }

  if (schema.type === 'object' && schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const required = (schema.required as string[]) || [];

    if (depth > 1) {
      return <span className="text-gray-400">object</span>;
    }

    return (
      <div className="ml-4 border-l border-gray-700 pl-3 space-y-1">
        {Object.entries(props).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className={required.includes(key) ? 'text-white' : 'text-gray-400'}>
              {key}
              {required.includes(key) && <span className="text-red-400">*</span>}
            </span>
            <span className="text-gray-500">: </span>
            <SchemaViewer schema={value} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  const typeStr = schema.type as string;
  const format = schema.format ? ` (${schema.format})` : '';
  const enumValues = schema.enum ? `: ${(schema.enum as string[]).join(' | ')}` : '';

  return (
    <span className="text-purple-400">
      {typeStr}{format}{enumValues}
    </span>
  );
}

// =============================================================================
// ENDPOINT CARD
// =============================================================================

function EndpointCard({ endpoint }: { endpoint: EndpointInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <MethodBadge method={endpoint.method} />
        <code className="text-sm text-gray-300 flex-grow font-mono">{endpoint.path}</code>
        <span className="text-sm text-gray-400 truncate max-w-md">{endpoint.summary}</span>
      </button>

      {expanded && (
        <div className="px-4 py-4 bg-gray-900/50 space-y-4">
          {/* Description */}
          {endpoint.description && (
            <p className="text-sm text-gray-300">{endpoint.description}</p>
          )}

          {/* Security */}
          {endpoint.security && endpoint.security.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-gray-400">Requires authentication</span>
            </div>
          )}

          {/* Parameters */}
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Parameters</h4>
              <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                {endpoint.parameters.map((param) => (
                  <div key={param.name} className="flex items-start gap-2 text-sm">
                    <code className="text-cyan-400">{param.name}</code>
                    <span className="text-gray-500">({param.in})</span>
                    {param.required && <span className="text-red-400 text-xs">required</span>}
                    <span className="text-gray-400">
                      <SchemaViewer schema={param.schema} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body */}
          {endpoint.requestBody && (
            <div>
              <h4 className="text-sm font-medium text-white mb-2">
                Request Body
                {endpoint.requestBody.required && (
                  <span className="text-red-400 text-xs ml-2">required</span>
                )}
              </h4>
              <div className="bg-gray-800/50 rounded-lg p-3">
                {Object.entries(endpoint.requestBody.content).map(([contentType, content]) => (
                  <div key={contentType}>
                    <span className="text-xs text-gray-500 font-mono">{contentType}</span>
                    <div className="mt-1">
                      <SchemaViewer schema={content.schema} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responses */}
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Responses</h4>
            <div className="space-y-2">
              {Object.entries(endpoint.responses).map(([status, response]) => (
                <div key={status} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-mono ${
                        status.startsWith('2') ? 'text-green-400' : 
                        status.startsWith('4') ? 'text-amber-400' : 
                        status.startsWith('5') ? 'text-red-400' : 'text-gray-400'
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-sm text-gray-400">{response.description}</span>
                  </div>
                  {response.content && (
                    <div className="mt-2 text-sm">
                      {Object.entries(response.content).map(([contentType, content]) => (
                        <div key={contentType}>
                          <span className="text-xs text-gray-500 font-mono">{contentType}</span>
                          {(content as { schema?: Record<string, unknown> }).schema && (
                            <div className="mt-1">
                              <SchemaViewer schema={(content as { schema: Record<string, unknown> }).schema} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* cURL Example */}
          <div>
            <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <Code className="w-4 h-4" />
              Example
            </h4>
            <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-300 relative">
              <CopyButton text={`curl -X ${endpoint.method.toUpperCase()} "http://localhost:3000${endpoint.path}"`} />
              <pre className="overflow-x-auto">
                curl -X {endpoint.method.toUpperCase()} &quot;http://localhost:3000{endpoint.path}&quot;
                {endpoint.requestBody && ' \\\n  -H "Content-Type: application/json" \\\n  -d \'{"..."}\''}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function APIDocsViewer({ spec }: APIDocsViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all endpoints from paths
  const endpoints = useMemo(() => {
    const result: EndpointInfo[] = [];
    
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        result.push({
          method,
          path,
          ...(operation as Omit<EndpointInfo, 'method' | 'path'>),
        });
      }
    }

    return result;
  }, [spec]);

  // Filter endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((endpoint) => {
      const matchesSearch =
        !searchTerm ||
        endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.operationId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTag = !selectedTag || endpoint.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [endpoints, searchTerm, selectedTag]);

  // Group by tag
  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, EndpointInfo[]> = {};

    for (const endpoint of filteredEndpoints) {
      const tag = endpoint.tags[0] || 'Other';
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(endpoint);
    }

    return groups;
  }, [filteredEndpoints]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <FileJson className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold">{spec.info.title}</h1>
              <p className="text-sm text-gray-400">Version {spec.info.version}</p>
            </div>
          </div>

          {/* Servers */}
          <div className="flex items-center gap-4 text-sm mb-4">
            <Server className="w-4 h-4 text-gray-400" />
            {spec.servers.map((server) => (
              <span key={server.url} className="text-gray-400">
                <code className="text-cyan-400">{server.url}</code>
                <span className="ml-2">({server.description})</span>
              </span>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <select
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Tags</option>
                {spec.tags.map((tag) => (
                  <option key={tag.name} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              <Code className="w-4 h-4" />
              Raw JSON
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm text-gray-400">
          <span>{endpoints.length} endpoints</span>
          <span>{spec.tags.length} categories</span>
          <span>{Object.keys(spec.components.schemas).length} schemas</span>
        </div>

        {/* Endpoints by Tag */}
        <div className="space-y-8">
          {Object.entries(groupedEndpoints).map(([tag, tagEndpoints]) => {
            const tagInfo = spec.tags.find((t) => t.name === tag);

            return (
              <div key={tag}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">{tag}</h2>
                  {tagInfo?.description && (
                    <p className="text-sm text-gray-400">{tagInfo.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {tagEndpoints.map((endpoint) => (
                    <EndpointCard
                      key={`${endpoint.method}-${endpoint.path}`}
                      endpoint={endpoint}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredEndpoints.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No endpoints match your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default APIDocsViewer;
