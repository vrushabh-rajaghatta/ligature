
/**
 * Channel Templates Service
 * Custom message templates for notification channels
 * 
 * v0.42.4 - Channel Templates
 * 
 * Supports:
 * - Per-channel template customization
 * - Variable interpolation
 * - Conditional blocks
 * - Platform-specific formatting
 */

import { Notification, NotificationType } from './notification-service';
import { ChannelType, NotificationChannel, SlackMessage, SlackBlock, TeamsMessage, TeamsSection } from './notification-channels-service';

// =============================================================================
// TYPES
// =============================================================================

// Slack attachment type (simplified from Slack API)
export interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: { title: string; value: string; short?: boolean }[];
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

// Teams potential action type (simplified from Teams connector API)
export interface TeamsPotentialAction {
  '@type': 'OpenUri' | 'HttpPOST' | 'ActionCard' | 'InvokeAddInCommand';
  name: string;
  targets?: { os: string; uri: string }[];
  body?: string;
  headers?: { name: string; value: string }[];
}

// Slack block element type
export interface SlackBlockElement {
  type: 'mrkdwn' | 'plain_text' | 'image' | 'button' | 'static_select' | 'users_select';
  text?: string;
  textTemplate?: string;
  image_url?: string;
  alt_text?: string;
  action_id?: string;
  url?: string;
  value?: string;
  style?: 'primary' | 'danger';
}

// Discord embed type
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
}

// Rendered message types for each channel
export interface RenderedSlackMessage extends SlackMessage {
  attachments?: SlackAttachment[];
}

export interface RenderedTeamsMessage extends Omit<TeamsMessage, "potentialAction"> {
  potentialAction?: TeamsPotentialAction[];
}

export interface RenderedDiscordMessage {
  embeds: DiscordEmbed[];
}

export interface RenderedWebhookPayload {
  notification?: {
    id?: string;
    type?: string;
    title?: string;
    message?: string;
    priority?: string;
    createdAt?: number;
  };
  source?: string;
  environment?: string;
  sentAt?: number;
  body?: string;
  [key: string]: unknown;  // Allow additional dynamic fields from templates
}

export interface RenderedGenericMessage {
  title: string;
  message: string;
  color: string;
  timestamp: number;
}

// Union type for all rendered messages
export type RenderedMessage = 
  | RenderedSlackMessage 
  | RenderedTeamsMessage 
  | RenderedDiscordMessage 
  | RenderedWebhookPayload 
  | RenderedGenericMessage;

export interface ChannelTemplate {
  id: string;
  name: string;
  description?: string;
  channelType: ChannelType;
  notificationType?: NotificationType;  // If not set, applies to all types
  template: TemplateContent;
  variables: TemplateVariable[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

export interface TemplateContent {
  // Common fields
  titleTemplate?: string;
  messageTemplate?: string;
  colorTemplate?: string;  // Can be variable-based

  // Slack-specific
  slack?: {
    blocks?: SlackBlockTemplate[];
    attachments?: SlackAttachment[];
    iconEmoji?: string;
    username?: string;
  };

  // Teams-specific
  teams?: {
    themeColor?: string;
    sections?: TeamsSectionTemplate[];
    potentialAction?: TeamsPotentialAction[];
  };

  // Discord-specific
  discord?: {
    embedTitle?: string;
    embedDescription?: string;
    embedColor?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
    thumbnail?: string;
    footer?: string;
  };

  // Generic webhook
  webhook?: {
    bodyTemplate?: string;  // JSON template
    headers?: Record<string, string>;
  };
}

export interface SlackBlockTemplate {
  type: SlackBlock['type'];
  textTemplate?: string;
  textType?: 'mrkdwn' | 'plain_text';
  fields?: { textTemplate: string; textType: 'mrkdwn' | 'plain_text' }[];
  elements?: SlackBlockElement[];
}

export interface TeamsSectionTemplate {
  activityTitleTemplate?: string;
  activitySubtitleTemplate?: string;
  textTemplate?: string;
  facts?: { nameTemplate: string; valueTemplate: string }[];
}

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json';
  format?: string;  // For dates: e.g., 'YYYY-MM-DD'
}

export interface TemplateContext {
  notification: Notification;
  channel: NotificationChannel;
  customVariables?: Record<string, unknown>;
  timestamp?: number;
  environment?: string;
}

// =============================================================================
// BUILT-IN VARIABLES
// =============================================================================

const BUILT_IN_VARIABLES: TemplateVariable[] = [
  { name: 'title', description: 'Notification title', type: 'string' },
  { name: 'message', description: 'Notification message', type: 'string' },
  { name: 'type', description: 'Notification type', type: 'string' },
  { name: 'priority', description: 'Notification priority', type: 'string' },
  { name: 'timestamp', description: 'Creation timestamp', type: 'date' },
  { name: 'formattedTime', description: 'Formatted creation time', type: 'string' },
  { name: 'formattedDate', description: 'Formatted creation date', type: 'string' },
  { name: 'actionUrl', description: 'Action URL', type: 'string' },
  { name: 'actionLabel', description: 'Action label', type: 'string' },
  { name: 'userId', description: 'User ID', type: 'string' },
  { name: 'channelName', description: 'Channel name', type: 'string' },
  { name: 'channelType', description: 'Channel type', type: 'string' },
  { name: 'appName', description: 'Application name', type: 'string', defaultValue: 'Ligature' },
  { name: 'environment', description: 'Environment (dev/staging/prod)', type: 'string', defaultValue: 'prod' },
];

// =============================================================================
// DEFAULT TEMPLATES
// =============================================================================

const DEFAULT_SLACK_TEMPLATE: ChannelTemplate = {
  id: 'default-slack',
  name: 'Default Slack Template',
  description: 'Standard Slack notification format',
  channelType: 'slack',
  template: {
    titleTemplate: '{{title}}',
    messageTemplate: '{{message}}',
    slack: {
      blocks: [
        {
          type: 'header',
          textTemplate: '{{title}}',
          textType: 'plain_text',
        },
        {
          type: 'section',
          textTemplate: '{{message}}',
          textType: 'mrkdwn',
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', textTemplate: '*Type:* {{type}}' },
            { type: 'mrkdwn', textTemplate: '*Priority:* {{priority}}' },
            { type: 'mrkdwn', textTemplate: '*Time:* {{formattedTime}}' },
          ],
        },
      ],
      iconEmoji: ':bell:',
      username: '{{appName}}',
    },
  },
  variables: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDefault: true,
};

const DEFAULT_TEAMS_TEMPLATE: ChannelTemplate = {
  id: 'default-teams',
  name: 'Default Teams Template',
  description: 'Standard Microsoft Teams notification format',
  channelType: 'teams',
  template: {
    titleTemplate: '{{title}}',
    messageTemplate: '{{message}}',
    teams: {
      themeColor: '{{color}}',
      sections: [
        {
          textTemplate: '{{message}}',
          facts: [
            { nameTemplate: 'Type', valueTemplate: '{{type}}' },
            { nameTemplate: 'Priority', valueTemplate: '{{priority}}' },
            { nameTemplate: 'Time', valueTemplate: '{{formattedTime}}' },
          ],
        },
      ],
    },
  },
  variables: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDefault: true,
};

const DEFAULT_DISCORD_TEMPLATE: ChannelTemplate = {
  id: 'default-discord',
  name: 'Default Discord Template',
  description: 'Standard Discord notification format',
  channelType: 'discord',
  template: {
    titleTemplate: '{{title}}',
    messageTemplate: '{{message}}',
    discord: {
      embedTitle: '{{title}}',
      embedDescription: '{{message}}',
      embedColor: '{{color}}',
      fields: [
        { name: 'Type', value: '{{type}}', inline: true },
        { name: 'Priority', value: '{{priority}}', inline: true },
      ],
      footer: '{{appName}} • {{formattedTime}}',
    },
  },
  variables: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDefault: true,
};

const DEFAULT_WEBHOOK_TEMPLATE: ChannelTemplate = {
  id: 'default-webhook',
  name: 'Default Webhook Template',
  description: 'Standard JSON webhook payload',
  channelType: 'webhook',
  template: {
    webhook: {
      bodyTemplate: JSON.stringify({
        notification: {
          id: '{{id}}',
          type: '{{type}}',
          title: '{{title}}',
          message: '{{message}}',
          priority: '{{priority}}',
          createdAt: '{{timestamp}}',
          actionUrl: '{{actionUrl}}',
        },
        source: '{{appName}}',
        environment: '{{environment}}',
        sentAt: '{{now}}',
      }, null, 2),
    },
  },
  variables: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDefault: true,
};

// =============================================================================
// CHANNEL TEMPLATES SERVICE
// =============================================================================

export class ChannelTemplatesService {
  private templates: Map<string, ChannelTemplate> = new Map();
  private channelBindings: Map<string, string> = new Map();  // channelId -> templateId

  constructor() {
    // Register default templates
    this.registerTemplate(DEFAULT_SLACK_TEMPLATE);
    this.registerTemplate(DEFAULT_TEAMS_TEMPLATE);
    this.registerTemplate(DEFAULT_DISCORD_TEMPLATE);
    this.registerTemplate(DEFAULT_WEBHOOK_TEMPLATE);
  }

  // ---------------------------------------------------------------------------
  // Template Management
  // ---------------------------------------------------------------------------

  registerTemplate(template: ChannelTemplate): void {
    this.templates.set(template.id, template);
  }

  createTemplate(
    template: Omit<ChannelTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): ChannelTemplate {
    const fullTemplate: ChannelTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    this.templates.set(fullTemplate.id, fullTemplate);
    return fullTemplate;
  }

  updateTemplate(
    id: string,
    updates: Partial<Omit<ChannelTemplate, 'id' | 'createdAt'>>
  ): ChannelTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updated = {
      ...template,
      ...updates,
      id, // Don't allow ID change
      updatedAt: Date.now(),
    };

    this.templates.set(id, updated);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (template?.isDefault) {
      return false; // Don't delete default templates
    }
    return this.templates.delete(id);
  }

  getTemplate(id: string): ChannelTemplate | undefined {
    return this.templates.get(id);
  }

  getTemplatesForChannel(channelType: ChannelType): ChannelTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.channelType === channelType);
  }

  getTemplatesForNotificationType(type: NotificationType): ChannelTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => !t.notificationType || t.notificationType === type
    );
  }

  getAllTemplates(): ChannelTemplate[] {
    return Array.from(this.templates.values());
  }

  // ---------------------------------------------------------------------------
  // Channel Bindings
  // ---------------------------------------------------------------------------

  bindTemplateToChannel(channelId: string, templateId: string): void {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }
    this.channelBindings.set(channelId, templateId);
  }

  unbindChannel(channelId: string): boolean {
    return this.channelBindings.delete(channelId);
  }

  getChannelTemplate(channelId: string, channelType: ChannelType): ChannelTemplate {
    const boundId = this.channelBindings.get(channelId);
    if (boundId) {
      const template = this.templates.get(boundId);
      if (template) return template;
    }

    // Fall back to default template for channel type
    return this.getDefaultTemplate(channelType);
  }

  getDefaultTemplate(channelType: ChannelType): ChannelTemplate {
    const defaults: Record<ChannelType, string> = {
      slack: 'default-slack',
      teams: 'default-teams',
      discord: 'default-discord',
      webhook: 'default-webhook',
    };
    
    return this.templates.get(defaults[channelType])!;
  }

  // ---------------------------------------------------------------------------
  // Template Rendering
  // ---------------------------------------------------------------------------

  render(template: ChannelTemplate, context: TemplateContext): RenderedMessage {
    const variables = this.buildVariableContext(template, context);

    switch (template.channelType) {
      case 'slack':
        return this.renderSlack(template, variables);
      case 'teams':
        return this.renderTeams(template, variables);
      case 'discord':
        return this.renderDiscord(template, variables);
      case 'webhook':
        return this.renderWebhook(template, variables);
      default:
        return this.renderGeneric(template, variables);
    }
  }

  private buildVariableContext(
    template: ChannelTemplate,
    context: TemplateContext
  ): Record<string, string | number> {
    const { notification, channel, customVariables = {}, timestamp = Date.now() } = context;

    // Build context from notification
    const vars: Record<string, string | number> = {
      // Notification fields
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      timestamp: notification.createdAt,
      actionUrl: notification.actionUrl || '',
      actionLabel: 'View',
      userId: notification.recipientId,

      // Formatted dates
      formattedTime: new Date(notification.createdAt).toLocaleTimeString(),
      formattedDate: new Date(notification.createdAt).toLocaleDateString(),
      formattedDateTime: new Date(notification.createdAt).toLocaleString(),
      isoTime: new Date(notification.createdAt).toISOString(),
      unixTime: Math.floor(notification.createdAt / 1000),

      // Channel info
      channelName: channel.name,
      channelType: channel.type,

      // Color based on priority
      color: this.getPriorityColor(notification.priority),
      colorHex: this.getPriorityColor(notification.priority),
      colorInt: parseInt(this.getPriorityColor(notification.priority).replace('#', ''), 16),

      // App info
      appName: 'Ligature',
      environment: context.environment || 'production',
      now: Date.now(),
      nowFormatted: new Date().toISOString(),

      // Custom variables
      ...customVariables,
    };

    // Apply template variable defaults
    for (const variable of Array.from(template.variables)) {
      if (vars[variable.name] === undefined && variable.defaultValue !== undefined) {
        vars[variable.name] = variable.defaultValue;
      }
    }

    return vars;
  }

  private interpolate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      if (value === undefined) return match;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  private renderSlack(template: ChannelTemplate, vars: Record<string, any>): SlackMessage {
    const slackConfig = template.template.slack;
    const result: SlackMessage = {};

    // Render text
    if (template.template.messageTemplate) {
      result.text = this.interpolate(template.template.messageTemplate, vars);
    }

    // Render blocks
    if (slackConfig?.blocks) {
      result.blocks = slackConfig.blocks.map(blockTemplate => {
        const block: SlackBlock = { type: blockTemplate.type };

        if (blockTemplate.textTemplate) {
          block.text = {
            type: blockTemplate.textType || 'mrkdwn',
            text: this.interpolate(blockTemplate.textTemplate, vars),
          };
        }

        if (blockTemplate.fields) {
          block.fields = blockTemplate.fields.map(f => ({
            type: f.textType || 'mrkdwn',
            text: this.interpolate(f.textTemplate, vars),
          }));
        }

        if (blockTemplate.elements) {
          block.elements = blockTemplate.elements.map(el => {
            if (el.textTemplate) {
              return {
                ...el,
                text: this.interpolate(el.textTemplate, vars),
              };
            }
            return el;
          }) as any[];
        }

        return block;
      });
    }

    // Add attachments for color
    result.attachments = [{
      color: vars.color,
      footer: 'Ligature',
    }];

    // Username and icon
    if (slackConfig?.username) {
      result.username = this.interpolate(slackConfig.username, vars);
    }
    if (slackConfig?.iconEmoji) {
      result.icon_emoji = slackConfig.iconEmoji;
    }

    return result;
  }

  private renderTeams(template: ChannelTemplate, vars: Record<string, any>): TeamsMessage {
    const teamsConfig = template.template.teams;

    const message: TeamsMessage = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: this.interpolate(template.template.titleTemplate || '{{title}}', vars),
      title: this.interpolate(template.template.titleTemplate || '{{title}}', vars),
      themeColor: vars.color?.replace('#', '') || '3b82f6',
    };

    // Render sections
    if (teamsConfig?.sections) {
      message.sections = teamsConfig.sections.map(sectionTemplate => {
        const section: TeamsSection = { markdown: true };

        if (sectionTemplate.activityTitleTemplate) {
          section.activityTitle = this.interpolate(sectionTemplate.activityTitleTemplate, vars);
        }
        if (sectionTemplate.activitySubtitleTemplate) {
          section.activitySubtitle = this.interpolate(sectionTemplate.activitySubtitleTemplate, vars);
        }
        if (sectionTemplate.textTemplate) {
          section.text = this.interpolate(sectionTemplate.textTemplate, vars);
        }
        if (sectionTemplate.facts) {
          section.facts = sectionTemplate.facts.map(f => ({
            name: this.interpolate(f.nameTemplate, vars),
            value: this.interpolate(f.valueTemplate, vars),
          }));
        }

        return section;
      });
    }

    // Add action if URL exists
    if (vars.actionUrl) {
      message.potentialAction = [{
        '@type': 'OpenUri',
        name: vars.actionLabel,
        targets: [{ os: 'default', uri: vars.actionUrl }],
      }];
    }

    return message;
  }

  private renderDiscord(template: ChannelTemplate, vars: Record<string, string | number>): RenderedDiscordMessage {
    const discordConfig = template.template.discord;

    const embed: DiscordEmbed = {
      title: this.interpolate(discordConfig?.embedTitle || '{{title}}', vars),
      description: this.interpolate(discordConfig?.embedDescription || '{{message}}', vars),
      color: vars.colorInt as number,
      timestamp: new Date(vars.timestamp as number).toISOString(),
    };

    if (discordConfig?.fields) {
      embed.fields = discordConfig.fields.map(f => ({
        name: this.interpolate(f.name, vars),
        value: this.interpolate(f.value, vars),
        inline: f.inline,
      }));
    }

    if (discordConfig?.footer) {
      embed.footer = { text: this.interpolate(discordConfig.footer, vars) };
    }

    if (discordConfig?.thumbnail) {
      embed.thumbnail = { url: this.interpolate(discordConfig.thumbnail, vars) };
    }

    return { embeds: [embed] };
  }

  private renderWebhook(template: ChannelTemplate, vars: Record<string, string | number>): RenderedWebhookPayload {
    const webhookConfig = template.template.webhook;

    if (webhookConfig?.bodyTemplate) {
      const interpolated = this.interpolate(webhookConfig.bodyTemplate, vars);
      try {
        return JSON.parse(interpolated) as RenderedWebhookPayload;
      } catch {
        return { body: interpolated };
      }
    }

    // Default webhook payload
    return {
      notification: {
        id: vars.id as string,
        type: vars.type as string,
        title: vars.title as string,
        message: vars.message as string,
        priority: vars.priority as string,
        createdAt: vars.timestamp as number,
      },
      source: vars.appName as string,
      sentAt: vars.now as number,
    };
  }

  private renderGeneric(template: ChannelTemplate, vars: Record<string, string | number>): RenderedGenericMessage {
    return {
      title: this.interpolate(template.template.titleTemplate || '{{title}}', vars),
      message: this.interpolate(template.template.messageTemplate || '{{message}}', vars),
      color: vars.color as string,
      timestamp: vars.timestamp as number,
    };
  }

  private getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      urgent: '#dc2626',
      high: '#f59e0b',
      normal: '#3b82f6',
      low: '#6b7280',
    };
    return colors[priority] || '#3b82f6';
  }

  // ---------------------------------------------------------------------------
  // Template Validation
  // ---------------------------------------------------------------------------

  validateTemplate(template: ChannelTemplate): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!template.name) {
      errors.push('Template name is required');
    }
    if (!template.channelType) {
      errors.push('Channel type is required');
    }

    // Check for undefined variables
    const usedVars = this.extractVariables(JSON.stringify(template.template));
    const definedVars = new Set([
      ...BUILT_IN_VARIABLES.map(v => v.name),
      ...template.variables.map(v => v.name),
    ]);

    for (const varName of Array.from(usedVars)) {
      if (!definedVars.has(varName)) {
        warnings.push(`Variable '${varName}' is used but not defined`);
      }
    }

    // Validate channel-specific structure
    switch (template.channelType) {
      case 'slack':
        if (!template.template.slack && !template.template.messageTemplate) {
          warnings.push('Slack template has no blocks or message template');
        }
        break;
      case 'teams':
        if (!template.template.teams && !template.template.messageTemplate) {
          warnings.push('Teams template has no sections or message template');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return Array.from(new Set(matches.map(m => m.slice(2, -2))));
  }

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  preview(
    template: ChannelTemplate,
    sampleNotification?: Partial<Notification>
  ): { raw: RenderedMessage; formatted: string } {
    const notification: Notification = {
      id: 'preview-001',
      type: 'mention',
      title: 'Sample Notification',
      message: 'This is a preview of how your notification will appear.',
      priority: 'normal',
      channel: 'both',
      recipientId: 'user-001',
      entityType: 'document',
      entityId: 'doc-001',
      entityTitle: 'Sample Document',
      isRead: false,
      isEmailSent: false,
      createdAt: Date.now(),
      actionUrl: 'https://example.com/action',
      ...sampleNotification,
    };

    const channel: NotificationChannel = {
      id: 'preview-channel',
      type: template.channelType,
      name: 'Preview Channel',
      enabled: true,
      config: {},
      notificationTypes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      errorCount: 0,
    };

    const rendered = this.render(template, { notification, channel });

    return {
      raw: rendered,
      formatted: JSON.stringify(rendered, null, 2),
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let templatesInstance: ChannelTemplatesService | null = null;

export function getChannelTemplates(): ChannelTemplatesService {
  if (!templatesInstance) {
    templatesInstance = new ChannelTemplatesService();
  }
  return templatesInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useChannelTemplates() {
  const [templates, setTemplates] = useState<ChannelTemplate[]>([]);
  const service = getChannelTemplates();

  useEffect(() => {
    setTemplates(service.getAllTemplates());
  }, [service]);

  const createTemplate = useCallback((
    template: Omit<ChannelTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newTemplate = service.createTemplate(template);
    setTemplates(service.getAllTemplates());
    return newTemplate;
  }, [service]);

  const updateTemplate = useCallback((
    id: string,
    updates: Partial<Omit<ChannelTemplate, 'id' | 'createdAt'>>
  ) => {
    const updated = service.updateTemplate(id, updates);
    setTemplates(service.getAllTemplates());
    return updated;
  }, [service]);

  const deleteTemplate = useCallback((id: string) => {
    const deleted = service.deleteTemplate(id);
    setTemplates(service.getAllTemplates());
    return deleted;
  }, [service]);

  const getTemplatesForChannel = useCallback((channelType: ChannelType) => {
    return service.getTemplatesForChannel(channelType);
  }, [service]);

  const preview = useCallback((
    template: ChannelTemplate,
    sampleNotification?: Partial<Notification>
  ) => {
    return service.preview(template, sampleNotification);
  }, [service]);

  const validate = useCallback((template: ChannelTemplate) => {
    return service.validateTemplate(template);
  }, [service]);

  return {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesForChannel,
    preview,
    validate,
    bindTemplateToChannel: service.bindTemplateToChannel.bind(service),
    unbindChannel: service.unbindChannel.bind(service),
    getChannelTemplate: service.getChannelTemplate.bind(service),
  };
}

export default ChannelTemplatesService;
