// lib/discord/bot.ts
import { env } from "cloudflare:workers";

const DISCORD_API = "https://discord.com/api/v10";

export class DiscordBot {
  private token: string;
  private guildId: string;
  private gameChannelId: string;

  constructor() {
    this.token = env.DISCORD_BOT_TOKEN;
    this.guildId = env.DISCORD_GUILD_ID;
    this.gameChannelId = env.DISCORD_GAME_CHANNEL_ID;
  }

  private async discordRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${DISCORD_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bot ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createGameThread(gameName: string, playerDiscordIds: string[]) {
    try {
      const thread = await this.discordRequest(
        `/channels/${this.gameChannelId}/threads`,
        {
          method: "POST",
          body: JSON.stringify({
            name: `🎮 ${gameName}`,
            auto_archive_duration: 1440,
            type: 11,
          }),
        }
      );

      for (const discordId of playerDiscordIds) {
        try {
          await this.discordRequest(
            `/channels/${thread.id}/thread-members/${discordId}`,
            { method: "PUT" }
          );
        } catch (err) {
          console.error(`Failed to add user ${discordId}:`, err);
        }
      }

      return {
        success: true,
        threadId: thread.id,
        threadUrl: `https://discord.com/channels/${this.guildId}/${thread.id}`,
      };
    } catch (error) {
      console.error("Failed to create thread:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteGameThread(threadId: string) {
    try {
      await this.discordRequest(`/channels/${threadId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to delete thread:", error);
      return { success: false, error: error.message };
    }
  }

  async sendThreadMessage(threadId: string, content: string) {
    try {
      await this.discordRequest(`/channels/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send message:", error);
      return { success: false, error: error.message };
    }
  }
}