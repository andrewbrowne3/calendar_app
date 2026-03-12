import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessage, ModelsResponse } from '../../types';
import agentService from '../../api/agentService';

interface ChatbotState {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  isAgentAvailable: boolean;
  isStreaming: boolean;
  currentThought: string | null;
  currentAction: string | null;
  currentObservation: string | null;
  streamIteration: number;
  availableModels: ModelsResponse | null;
  selectedProvider: string;
  selectedModel: string;
  isLoadingModels: boolean;
}

const initialState: ChatbotState = {
  messages: [],
  conversationId: null,
  isLoading: false,
  error: null,
  isAgentAvailable: true,
  isStreaming: false,
  currentThought: null,
  currentAction: null,
  currentObservation: null,
  streamIteration: 0,
  availableModels: null,
  selectedProvider: 'anthropic',
  selectedModel: 'claude-sonnet-4-6',
  isLoadingModels: false,
};

export const fetchModels = createAsyncThunk(
  'chatbot/fetchModels',
  async (_, { rejectWithValue }) => {
    try {
      const models = await agentService.getModels();
      return models;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch models';
      return rejectWithValue(message);
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'chatbot/sendMessage',
  async ({ message }: { message: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { chatbot: ChatbotState };
      const { conversationId, selectedProvider, selectedModel } = state.chatbot;

      const response = await agentService.sendMessage(
        message,
        conversationId || undefined,
        selectedProvider,
        selectedModel
      );

      return {
        userMessage: message,
        assistantMessage: response.response,
        conversationId: response.conversation_id,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      return rejectWithValue(message);
    }
  }
);

export const sendChatMessageStream = createAsyncThunk(
  'chatbot/sendMessageStream',
  async ({ message }: { message: string }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { chatbot: ChatbotState };
      const { conversationId, selectedProvider, selectedModel } = state.chatbot;

      let finalResponse = '';
      let finalConversationId = conversationId;
      let totalIterations = 0;

      for await (const event of agentService.sendMessageStream(
        message,
        conversationId || undefined,
        selectedProvider,
        selectedModel
      )) {
        if (event.iteration !== undefined) {
          dispatch(updateIteration(event.iteration));
          totalIterations = event.iteration;
        }

        if (event.type === 'think' && event.content) {
          dispatch(updateThought(event.content));
        } else if (event.type === 'act' && event.content) {
          dispatch(updateAction(event.content));
        } else if (event.type === 'observe' && event.content) {
          dispatch(updateObservation(event.content));
        }

        if (event.type === 'complete') {
          finalResponse = event.response || '';
          finalConversationId = event.conversation_id || conversationId;
          totalIterations = event.iterations || totalIterations;
        }

        if (event.type === 'error') {
          throw new Error(event.message || 'Streaming error');
        }
      }

      return {
        userMessage: message,
        assistantMessage: finalResponse,
        conversationId: finalConversationId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stream message';
      return rejectWithValue(errorMessage);
    }
  }
);

export const checkAgentHealth = createAsyncThunk(
  'chatbot/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const isAvailable = await agentService.healthCheck();
      return { isAvailable };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Health check failed';
      return rejectWithValue(message);
    }
  }
);

const chatbotSlice = createSlice({
  name: 'chatbot',
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
      state.conversationId = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    addUserMessage: (state, action: PayloadAction<string>) => {
      const newMessage: ChatMessage = {
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      };
      state.messages.push(newMessage);
    },
    updateThought: (state, action: PayloadAction<string>) => {
      state.currentThought = action.payload;
    },
    updateAction: (state, action: PayloadAction<string>) => {
      state.currentAction = action.payload;
    },
    updateObservation: (state, action: PayloadAction<string>) => {
      state.currentObservation = action.payload;
    },
    updateIteration: (state, action: PayloadAction<number>) => {
      state.streamIteration = action.payload;
    },
    clearStreamingState: (state) => {
      state.isStreaming = false;
      state.currentThought = null;
      state.currentAction = null;
      state.currentObservation = null;
      state.streamIteration = 0;
    },
    setProvider: (state, action: PayloadAction<string>) => {
      state.selectedProvider = action.payload;
      if (state.availableModels) {
        state.selectedModel =
          state.availableModels.default_model[action.payload as 'anthropic' | 'ollama'] || '';
      }
    },
    setModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.isLoading = false;

        const userMessage: ChatMessage = {
          role: 'user',
          content: action.payload.userMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(userMessage);

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: action.payload.assistantMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(assistantMessage);

        state.conversationId = action.payload.conversationId;
        state.error = null;
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(checkAgentHealth.fulfilled, (state, action) => {
        state.isAgentAvailable = action.payload.isAvailable;
      })
      .addCase(checkAgentHealth.rejected, (state) => {
        state.isAgentAvailable = false;
      })
      .addCase(sendChatMessageStream.pending, (state) => {
        state.isStreaming = true;
        state.isLoading = true;
        state.error = null;
        state.currentThought = null;
        state.currentAction = null;
        state.currentObservation = null;
        state.streamIteration = 0;
      })
      .addCase(sendChatMessageStream.fulfilled, (state, action) => {
        state.isStreaming = false;
        state.isLoading = false;

        const userMessage: ChatMessage = {
          role: 'user',
          content: action.payload.userMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(userMessage);

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: action.payload.assistantMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(assistantMessage);

        state.conversationId = action.payload.conversationId;
        state.error = null;
        state.currentThought = null;
        state.currentAction = null;
        state.currentObservation = null;
        state.streamIteration = 0;
      })
      .addCase(sendChatMessageStream.rejected, (state, action) => {
        state.isStreaming = false;
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentThought = null;
        state.currentAction = null;
        state.currentObservation = null;
        state.streamIteration = 0;
      })
      .addCase(fetchModels.pending, (state) => {
        state.isLoadingModels = true;
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.isLoadingModels = false;
        state.availableModels = action.payload;
        state.selectedProvider = action.payload.default_provider;
        state.selectedModel =
          action.payload.default_model[action.payload.default_provider as 'anthropic' | 'ollama'];
      })
      .addCase(fetchModels.rejected, (state) => {
        state.isLoadingModels = false;
      });
  },
});

export const {
  clearMessages,
  clearError,
  addUserMessage,
  updateThought,
  updateAction,
  updateObservation,
  updateIteration,
  clearStreamingState,
  setProvider,
  setModel,
} = chatbotSlice.actions;
export default chatbotSlice.reducer;
