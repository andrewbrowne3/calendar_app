// Calendar AI Agent Service

import { API_CONFIG } from '../utils/config';
import storageService from '../utils/storage';
import type { ModelsResponse, StreamEvent } from '../types';

interface ChatRequest {
  message: string;
  email?: string;
  password?: string;
  conversation_id?: string;
  provider?: string;
  model?: string;
}

interface ChatResponse {
  response: string;
  conversation_id: string;
  completed: boolean;
}

class AgentService {
  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AI_AGENT.MODELS}`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    return response.json();
  }

  async sendMessage(
    message: string,
    conversationId?: string,
    provider?: string,
    model?: string
  ): Promise<ChatResponse> {
    const user = storageService.getUser();
    const token = storageService.getAccessToken();

    const payload: ChatRequest = {
      message,
      conversation_id: conversationId,
      provider,
      model,
    };

    // Include user credentials for auto-login
    if (user?.email) {
      payload.email = user.email;
      payload.password = 'Sierra-Ciara$'; // Default password
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AI_AGENT.CHAT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to send message');
    }

    return response.json();
  }

  async *sendMessageStream(
    message: string,
    conversationId?: string,
    provider?: string,
    model?: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const user = storageService.getUser();
    const token = storageService.getAccessToken();

    const payload: ChatRequest = {
      message,
      conversation_id: conversationId,
      provider,
      model,
    };

    if (user?.email) {
      payload.email = user.email;
      payload.password = 'Sierra-Ciara$';
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AI_AGENT.CHAT_STREAM}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Streaming not supported');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data as StreamEvent;
          } catch (parseError) {
            console.error('Failed to parse SSE data:', parseError);
          }
        }
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AI_AGENT.HEALTH}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const agentService = new AgentService();
export default agentService;
