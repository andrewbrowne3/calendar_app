// Calendar AI Agent Service - Chat with your calendar!
import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from '../constants/config';
import storageService from './storage';
import { logger } from '../utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601 date string
}

export interface ChatRequest {
  message: string;
  email?: string;
  password?: string;
  conversation_id?: string;
  provider?: string;
  model?: string;
}

export interface ModelInfo {
  name: string;
  provider: string;
  display_name: string;
  size?: number;
  modified_at?: string;
}

export interface ModelsResponse {
  providers: string[];
  default_provider: string;
  default_model: {
    anthropic: string;
    ollama: string;
  };
  models: {
    anthropic: ModelInfo[];
    ollama: ModelInfo[];
  };
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  completed: boolean;
}

export interface StreamEvent {
  type: 'start' | 'think' | 'act' | 'observe' | 'complete' | 'error';
  content?: string;
  iteration?: number;
  conversation_id?: string;
  response?: string;
  message?: string;
  iterations?: number;
}

class CalendarAgentService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: 120000, // 2 minutes for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth
    this.client.interceptors.request.use(
      async (config) => {
        const token = await storageService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          logger.debug('Auth token added to AI agent request');
        }
        return config;
      },
      (error) => {
        logger.error('AI agent request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch available AI models from the server
   */
  async getModels(): Promise<ModelsResponse> {
    try {
      logger.info('Fetching available AI models');
      const response = await this.client.get<ModelsResponse>(
        API_CONFIG.ENDPOINTS.AI_AGENT.MODELS
      );
      logger.info('Models fetched:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  /**
   * Send a message to the AI calendar agent
   */
  async sendMessage(
    message: string,
    conversationId?: string,
    provider?: string,
    model?: string
  ): Promise<ChatResponse> {
    try {
      logger.info('Sending message to AI agent:', { message, provider, model });

      // Get user credentials for agent to use
      const user = await storageService.getUser();

      const payload: ChatRequest = {
        message,
        conversation_id: conversationId,
        provider,
        model,
      };

      // Auto-include user credentials so agent can log in automatically
      if (user?.email) {
        payload.email = user.email;
        // Note: This assumes password is "Sierra-Ciara$" as specified
        // In production, you'd retrieve this from secure storage
        payload.password = 'Sierra-Ciara$';
        logger.debug('User credentials included for auto-login');
      }

      const response = await this.client.post<ChatResponse>(
        API_CONFIG.ENDPOINTS.AI_AGENT.CHAT,
        payload
      );

      logger.info('AI agent response received:', response.data);
      return response.data;

    } catch (error) {
      logger.error('AI agent error:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }

        if (axiosError.response?.status === 500) {
          throw new Error('AI service temporarily unavailable. Please try again.');
        }

        if (axiosError.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The AI is thinking too hard! Please try again.');
        }

        throw new Error(
          (axiosError.response?.data as any)?.detail ||
          'Failed to communicate with AI agent'
        );
      }

      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Send a message with streaming ReAct steps
   */
  async *sendMessageStream(
    message: string,
    conversationId?: string,
    provider?: string,
    model?: string,
    onThink?: (thought: string) => void,
    onAct?: (action: string) => void,
    onObserve?: (observation: string) => void
  ): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      logger.info('Starting streaming message to AI agent:', { message, provider, model });

      const user = await storageService.getUser();
      const token = await storageService.getAccessToken();

      const payload: ChatRequest = {
        message,
        conversation_id: conversationId,
        provider,
        model,
      };

      // Auto-include user credentials so agent can log in automatically
      if (user?.email) {
        payload.email = user.email;
        // Note: This assumes password is "Sierra-Ciara$" as specified
        // In production, you'd retrieve this from secure storage
        payload.password = 'Sierra-Ciara$';
        logger.debug('User credentials included for auto-login');
      }

      // Make streaming request
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AI_AGENT.CHAT}/stream`,
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
        const errorText = await response.text();
        logger.error('Streaming request failed:', { status: response.status, error: errorText });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        logger.error('No response body available from streaming endpoint');
        throw new Error('Streaming not supported: No response body');
      }

      const reader = response.body.getReader();
      if (!reader) {
        throw new Error('Could not create stream reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Call callbacks for specific event types
              if (data.type === 'think' && onThink) {
                onThink(data.content);
              } else if (data.type === 'act' && onAct) {
                onAct(data.content);
              } else if (data.type === 'observe' && onObserve) {
                onObserve(data.content);
              }

              // Yield the event
              yield data as StreamEvent;
            } catch (parseError) {
              logger.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      logger.info('Streaming completed');

    } catch (error) {
      logger.error('Streaming error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Streaming failed'
      );
    }
  }

  /**
   * Check if AI agent is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get(API_CONFIG.ENDPOINTS.AI_AGENT.HEALTH);
      logger.debug('AI agent health check:', response.data);
      return response.status === 200;
    } catch (error) {
      logger.error('AI agent health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const calendarAgentService = new CalendarAgentService();
export default calendarAgentService;
