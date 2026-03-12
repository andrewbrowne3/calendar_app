import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import calendarAgentService, { ChatMessage, ModelInfo, ModelsResponse } from '../../services/calendarAgentService';
import { logger } from '../../utils/logger';

interface ChatbotState {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  isAgentAvailable: boolean;
  // Streaming state
  isStreaming: boolean;
  currentThought: string | null;
  currentAction: string | null;
  currentObservation: string | null;
  streamIteration: number;
  // Model selection state
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
  // Streaming state
  isStreaming: false,
  currentThought: null,
  currentAction: null,
  currentObservation: null,
  streamIteration: 0,
  // Model selection state
  availableModels: null,
  selectedProvider: 'anthropic',
  selectedModel: 'claude-3-7-sonnet-20250219',
  isLoadingModels: false,
};

// Async thunks
export const fetchModels = createAsyncThunk(
  'chatbot/fetchModels',
  async (_, { rejectWithValue }) => {
    try {
      logger.info('Fetching available AI models');
      const models = await calendarAgentService.getModels();
      return models;
    } catch (error: any) {
      logger.error('Failed to fetch models:', error);
      return rejectWithValue(error.message || 'Failed to fetch models');
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'chatbot/sendMessage',
  async (
    { message }: { message: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as any;
      const { conversationId, selectedProvider, selectedModel } = state.chatbot;

      logger.info('Sending chat message:', { message, provider: selectedProvider, model: selectedModel });

      const response = await calendarAgentService.sendMessage(
        message,
        conversationId || undefined,
        selectedProvider,
        selectedModel
      );

      logger.info('Chat response received:', response);

      return {
        userMessage: message,
        assistantMessage: response.response,
        conversationId: response.conversation_id,
      };
    } catch (error: any) {
      logger.error('Chat message failed:', error);
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

export const checkAgentHealth = createAsyncThunk(
  'chatbot/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const isAvailable = await calendarAgentService.healthCheck();
      return { isAvailable };
    } catch (error: any) {
      logger.error('Agent health check failed:', error);
      return rejectWithValue(error.message || 'Health check failed');
    }
  }
);

export const sendChatMessageStream = createAsyncThunk(
  'chatbot/sendMessageStream',
  async (
    { message }: { message: string },
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      const state = getState() as any;
      const { conversationId, selectedProvider, selectedModel } = state.chatbot;

      logger.info('Starting streaming chat message:', { message, provider: selectedProvider, model: selectedModel });

      let finalResponse = '';
      let finalConversationId = conversationId;
      let totalIterations = 0;

      // Iterate through streaming events
      for await (const event of calendarAgentService.sendMessageStream(
        message,
        conversationId || undefined,
        selectedProvider,
        selectedModel,
        (thought) => dispatch(updateThought(thought)),
        (action) => dispatch(updateAction(action)),
        (observation) => dispatch(updateObservation(observation))
      )) {
        // Update iteration count
        if (event.iteration !== undefined) {
          dispatch(updateIteration(event.iteration));
          totalIterations = event.iteration;
        }

        // Handle complete event
        if (event.type === 'complete') {
          finalResponse = event.response || '';
          finalConversationId = event.conversation_id || conversationId;
          totalIterations = event.iterations || totalIterations;
        }

        // Handle error event
        if (event.type === 'error') {
          throw new Error(event.message || 'Streaming error');
        }
      }

      logger.info('Streaming completed:', { finalResponse, totalIterations });

      return {
        userMessage: message,
        assistantMessage: finalResponse,
        conversationId: finalConversationId,
      };
    } catch (error: any) {
      logger.error('Streaming chat message failed:', error);
      return rejectWithValue(error.message || 'Failed to stream message');
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
      // Set default model for the provider
      if (state.availableModels) {
        state.selectedModel = state.availableModels.default_model[action.payload as 'anthropic' | 'ollama'] || '';
      }
    },
    setModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Send message
      .addCase(sendChatMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.isLoading = false;

        // Add user message
        const userMessage: ChatMessage = {
          role: 'user',
          content: action.payload.userMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(userMessage);

        // Add assistant response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: action.payload.assistantMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(assistantMessage);

        // Update conversation ID
        state.conversationId = action.payload.conversationId;
        state.error = null;
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Health check
      .addCase(checkAgentHealth.fulfilled, (state, action) => {
        state.isAgentAvailable = action.payload.isAvailable;
      })
      .addCase(checkAgentHealth.rejected, (state) => {
        state.isAgentAvailable = false;
      })
      // Send message stream
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

        // Add user message
        const userMessage: ChatMessage = {
          role: 'user',
          content: action.payload.userMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(userMessage);

        // Add assistant response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: action.payload.assistantMessage,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(assistantMessage);

        // Update conversation ID
        state.conversationId = action.payload.conversationId;
        state.error = null;

        // Clear streaming state
        state.currentThought = null;
        state.currentAction = null;
        state.currentObservation = null;
        state.streamIteration = 0;
      })
      .addCase(sendChatMessageStream.rejected, (state, action) => {
        state.isStreaming = false;
        state.isLoading = false;
        state.error = action.payload as string;
        // Clear streaming state
        state.currentThought = null;
        state.currentAction = null;
        state.currentObservation = null;
        state.streamIteration = 0;
      })
      // Fetch models
      .addCase(fetchModels.pending, (state) => {
        state.isLoadingModels = true;
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.isLoadingModels = false;
        state.availableModels = action.payload;
        // Set defaults from server response
        state.selectedProvider = action.payload.default_provider;
        state.selectedModel = action.payload.default_model[action.payload.default_provider as 'anthropic' | 'ollama'];
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
