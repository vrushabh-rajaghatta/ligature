/**
 * Notification Channels Service
 * Slack/Teams integration for notifications
 * 
 * v0.42.3 - Notification Channels
 */

import { Notification, NotificationType } from './notification-service';

// =============================================================================
// TYPES
// =============================================================================

export type ChannelType = 'slack' | 'teams' | 'discord' | 'webhook';

export interface NotificationChannel {
  id: string;
  type: ChannelType;
  name: string;
  enabled: boolean;
  config: ChannelConfig;
  notificationTypes: NotificationType[];
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
  errorCount: number;
  lastError?: string;
}

export interface ChannelConfig {
  webhookUrl?: string;
  accessToken?: string;
  channelId?: string;
  botToken?: string;
  mentionUsers?: boolean;
  includeActions?: boolean;
  customTemplate?: string;
  headers?: Record<string, string>;
}

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
}

// Slack block element types
interface SlackButtonElement {
  type: 'button';
  text: { type: 'plain_text'; text: string };
  action_id: string;
  url?: string;
  style?: 'primary' | 'danger';
}

interface SlackImageElement {
  type: 'image';
  image_url: string;
  alt_text: string;
}

interface SlackContextElement {
  type: 'mrkdwn' | 'plain_text' | 'image';
  text?: string;
  image_url?: string;
  alt_text?: string;
}

type SlackBlockElement = SlackButtonElement | SlackImageElement | SlackContextElement;

export interface SlackBlock {
  type: 'section' | 'divider' | 'actions' | 'context' | 'header';
  text?: { type: 'mrkdwn' | 'plain_text'; text: string };
  fields?: { type: 'mrkdwn' | 'plain_text'; text: string }[];
  accessory?: SlackButtonElement | SlackImageElement;
  elements?: SlackBlockElement[];
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: { title: string; value: string; short?: boolean }[];
  footer?: string;
  ts?: number;
}

export interface TeamsMessage {
  '@type': 'MessageCard';
  '@context': 'http://schema.org/extensions';
  themeColor?: string;
  summary: string;
  title?: string;
  sections?: TeamsSection[];
  potentialAction?: TeamsAction[];
}

export interface TeamsSection {
  activityTitle?: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts?: { name: string; value: string }[];
  text?: string;
  markdown?: boolean;
}

export interface TeamsAction {
  '@type': 'OpenUri' | 'ActionCard';
  name: string;
  targets?: { os: string; uri: string }[];
}

export interface ChannelDeliveryResult {
  channelId: string;
  success: boolean;
  timestamp: number;
  error?: string;
  response?: Record<string, unknown>;
}

// =============================================================================
// NOTIFICATION CHANNELS SERVICE
// =============================================================================

export class NotificationChannelsService {
  private channels: Map<string, NotificationChannel> = new Map();
  private deliveryHistory: ChannelDeliveryResult[] = [];
  private maxHistoryItems = 100;

  // ---------------------------------------------------------------------------
  // Channel Management
  // ---------------------------------------------------------------------------

  addChannel(channel: Omit<NotificationChannel, 'id' | 'createdAt' | 'updatedAt' | 'errorCount'>): NotificationChannel {
    const fullChannel: NotificationChannel = {
      ...channel,
      id: `channel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      errorCount: 0,
    };
    
    this.channels.set(fullChannel.id, fullChannel);
    return fullChannel;
  }

  updateChannel(id: string, updates: Partial<NotificationChannel>): NotificationChannel | null {
    const channel = this.channels.get(id);
    if (!channel) return null;
    
    const updated = {
      ...channel,
      ...updates,
      id, // Don't allow ID change
      updatedAt: Date.now(),
    };
    
    this.channels.set(id, updated);
    return updated;
  }

  removeChannel(id: string): boolean {
    return this.channels.delete(id);
  }

  getChannel(id: string): NotificationChannel | undefined {
    return this.channels.get(id);
  }

  getAllChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  getEnabledChannels(): NotificationChannel[] {
    return this.getAllChannels().filter(c => c.enabled);
  }

  // ---------------------------------------------------------------------------
  // Message Delivery
  // ---------------------------------------------------------------------------

  async sendNotification(notification: Notification): Promise<ChannelDeliveryResult[]> {
    const results: ChannelDeliveryResult[] = [];
    const channels = this.getEnabledChannels().filter(c => 
      c.notificationTypes.length === 0 || c.notificationTypes.includes(notification.type)
    );

    for (const channel of channels) {
      const result = await this.deliverToChannel(channel, notification);
      results.push(result);
      this.deliveryHistory.push(result);
      
      // Update channel stats
      channel.lastUsed = Date.now();
      if (!result.success) {
        channel.errorCount++;
        channel.lastError = result.error;
      }
      this.channels.set(channel.id, channel);
    }

    // Trim history
    if (this.deliveryHistory.length > this.maxHistoryItems) {
      this.deliveryHistory = this.deliveryHistory.slice(-this.maxHistoryItems);
    }

    return results;
  }

  private async deliverToChannel(channel: NotificationChannel, notification: Notification): Promise<ChannelDeliveryResult> {
    try {
      let response: Record<string, unknown> | string | undefined;
      
      switch (channel.type) {
        case 'slack':
          response = await this.sendToSlack(channel, notification);
          break;
        case 'teams':
          response = await this.sendToTeams(channel, notification);
          break;
        case 'discord':
          response = await this.sendToDiscord(channel, notification);
          break;
        case 'webhook':
          response = await this.sendToWebhook(channel, notification);
          break;
      }

      return {
        channelId: channel.id,
        success: true,
        timestamp: Date.now(),
        response: typeof response === 'string' ? { text: response } : response,
      };
    } catch (error) {
      return {
        channelId: channel.id,
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Slack Integration
  // ---------------------------------------------------------------------------

  private async sendToSlack(channel: NotificationChannel, notification: Notification): Promise<string> {
    const message = this.buildSlackMessage(notification, channel.config);
    const url = channel.config.webhookUrl;
    
    if (!url) {
      throw new Error('Slack webhook URL not configured');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return await response.text();
  }

  private buildSlackMessage(notification: Notification, config: ChannelConfig): SlackMessage {
    const color = this.getNotificationColor(notification);
    
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: notification.title },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: notification.message },
      },
    ];

    // Add context
    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `*Type:* ${notification.type}` },
        { type: 'mrkdwn', text: `*Priority:* ${notification.priority}` },
        { type: 'mrkdwn', text: `*Time:* <!date^${Math.floor(notification.createdAt / 1000)}^{date_short_pretty} at {time}|${new Date(notification.createdAt).toISOString()}>` },
      ],
    });

    // Add action button if URL available
    if (notification.actionUrl && config.includeActions) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: notification.actionLabel || 'View' },
            url: notification.actionUrl,
            style: 'primary',
          } as any,
        ],
      });
    }

    return {
      blocks,
      attachments: [
        {
          color,
          footer: 'Ligature',
          ts: Math.floor(notification.createdAt / 1000),
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Teams Integration
  // ---------------------------------------------------------------------------

  private async sendToTeams(channel: NotificationChannel, notification: Notification): Promise<any> {
    const message = this.buildTeamsMessage(notification, channel.config);
    const url = channel.config.webhookUrl;
    
    if (!url) {
      throw new Error('Teams webhook URL not configured');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Teams API error: ${response.status}`);
    }

    return await response.text();
  }

  private buildTeamsMessage(notification: Notification, config: ChannelConfig): TeamsMessage {
    const color = this.getNotificationColor(notification).replace('#', '');
    
    const message: TeamsMessage = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: color,
      summary: notification.title,
      title: notification.title,
      sections: [
        {
          text: notification.message,
          markdown: true,
          facts: [
            { name: 'Type', value: notification.type },
            { name: 'Priority', value: notification.priority },
            { name: 'Time', value: new Date(notification.createdAt).toLocaleString() },
          ],
        },
      ],
    };

    // Add action button if URL available
    if (notification.actionUrl && config.includeActions) {
      message.potentialAction = [
        {
          '@type': 'OpenUri',
          name: notification.actionLabel || 'View',
          targets: [
            { os: 'default', uri: notification.actionUrl },
          ],
        },
      ];
    }

    return message;
  }

  // ---------------------------------------------------------------------------
  // Discord Integration
  // ---------------------------------------------------------------------------

  private async sendToDiscord(channel: NotificationChannel, notification: Notification): Promise<any> {
    const url = channel.config.webhookUrl;
    
    if (!url) {
      throw new Error('Discord webhook URL not configured');
    }

    const color = parseInt(this.getNotificationColor(notification).replace('#', ''), 16);
    
    const embed = {
      title: notification.title,
      description: notification.message,
      color,
      fields: [
        { name: 'Type', value: notification.type, inline: true },
        { name: 'Priority', value: notification.priority, inline: true },
      ],
      timestamp: new Date(notification.createdAt).toISOString(),
      footer: { text: 'Ligature' },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return response.status === 204 ? 'OK' : await response.json();
  }

  // ---------------------------------------------------------------------------
  // Generic Webhook
  // ---------------------------------------------------------------------------

  private async sendToWebhook(channel: NotificationChannel, notification: Notification): Promise<any> {
    const url = channel.config.webhookUrl;
    
    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        createdAt: notification.createdAt,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata,
      },
      timestamp: Date.now(),
      source: 'ligature',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.config.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }

    return await response.json().catch(() => response.text());
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private getNotificationColor(notification: Notification): string {
    switch (notification.priority) {
      case 'urgent': return '#dc2626'; // red
      case 'high': return '#f59e0b';   // amber
      case 'normal': return '#3b82f6'; // blue
      case 'low': return '#6b7280';    // gray
      default: return '#3b82f6';
    }
  }

  async testChannel(channelId: string): Promise<ChannelDeliveryResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return {
        channelId,
        success: false,
        timestamp: Date.now(),
        error: 'Channel not found',
      };
    }

    const testNotification: Notification = {
      id: 'test-' + Date.now(),
      userId: 'system',
      recipientId: 'system',
      entityType: 'document',
      entityId: 'test',
      isEmailSent: false,
      type: 'mention',
      title: 'Test Notification',
      message: 'This is a test message from Ligature to verify the channel configuration.',
      priority: 'normal',
      channel: 'both',
      isRead: false,
      createdAt: Date.now(),
    };

    return this.deliverToChannel(channel, testNotification);
  }

  getDeliveryHistory(): ChannelDeliveryResult[] {
    return [...this.deliveryHistory];
  }

  getChannelStats(channelId: string): {
    totalDeliveries: number;
    successRate: number;
    lastSuccess?: number;
    lastFailure?: number;
  } {
    const history = this.deliveryHistory.filter(d => d.channelId === channelId);
    const successes = history.filter(d => d.success);
    
    return {
      totalDeliveries: history.length,
      successRate: history.length > 0 ? successes.length / history.length : 0,
      lastSuccess: successes.length > 0 ? successes[successes.length - 1].timestamp : undefined,
      lastFailure: history.find(d => !d.success)?.timestamp,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let channelsInstance: NotificationChannelsService | null = null;

export function getNotificationChannels(): NotificationChannelsService {
  if (!channelsInstance) {
    channelsInstance = new NotificationChannelsService();
  }
  return channelsInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useNotificationChannels() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const service = getNotificationChannels();

  useEffect(() => {
    setChannels(service.getAllChannels());
  }, [service]);

  const addChannel = useCallback((channel: Parameters<typeof service.addChannel>[0]) => {
    const newChannel = service.addChannel(channel);
    setChannels(service.getAllChannels());
    return newChannel;
  }, [service]);

  const updateChannel = useCallback((id: string, updates: Partial<NotificationChannel>) => {
    const updated = service.updateChannel(id, updates);
    setChannels(service.getAllChannels());
    return updated;
  }, [service]);

  const removeChannel = useCallback((id: string) => {
    const removed = service.removeChannel(id);
    setChannels(service.getAllChannels());
    return removed;
  }, [service]);

  const testChannel = useCallback((id: string) => {
    return service.testChannel(id);
  }, [service]);

  const getStats = useCallback((id: string) => {
    return service.getChannelStats(id);
  }, [service]);

  return {
    channels,
    addChannel,
    updateChannel,
    removeChannel,
    testChannel,
    getStats,
  };
}

export default NotificationChannelsService;
