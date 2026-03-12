import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import {
  sendChatMessage,
  clearMessages,
  clearError,
  fetchModels,
  setProvider,
  setModel,
} from '../store/slices/chatbotSlice';
import { fetchEvents } from '../store/slices/eventsSlice';
import type { ChatMessage, ModelInfo } from '../types';
import toast from 'react-hot-toast';
import './ChatbotPage.css';

export const ChatbotPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    messages,
    isLoading,
    error,
    isStreaming,
    currentThought,
    currentAction,
    currentObservation,
    streamIteration,
    availableModels,
    selectedProvider,
    selectedModel,
    isLoadingModels,
  } = useAppSelector((state) => state.chatbot);
  const { user } = useAppSelector((state) => state.auth);

  const [inputText, setInputText] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchModels());
  }, [dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const message = inputText.trim();
    setInputText('');

    try {
      await dispatch(sendChatMessage({ message })).unwrap();
      dispatch(fetchEvents({}));
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all messages?')) {
      dispatch(clearMessages());
    }
  };

  const getModelDisplayName = () => {
    if (!availableModels) return selectedModel;
    const models = availableModels.models[selectedProvider as 'anthropic' | 'ollama'] || [];
    const model = models.find((m: ModelInfo) => m.name === selectedModel);
    return model?.display_name || selectedModel;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <h1 className="chatbot-title">AI Assistant</h1>
          <button
            className="model-selector"
            onClick={() => setShowModelPicker(!showModelPicker)}
          >
            <span className="model-provider-icon">
              {selectedProvider === 'anthropic' ? '☁️' : '🖥️'}
            </span>
            <span className="model-name">{getModelDisplayName()}</span>
            <ChevronDown size={14} />
          </button>
        </div>
        {messages.length > 0 && (
          <button className="clear-btn" onClick={handleClearChat}>
            <Trash2 size={16} />
            Clear
          </button>
        )}
      </div>

      {showModelPicker && (
        <div className="model-picker">
          <div className="model-picker-header">
            <h3>Select AI Model</h3>
            <button onClick={() => setShowModelPicker(false)}>&times;</button>
          </div>

          {isLoadingModels ? (
            <div className="model-picker-loading">
              <Loader2 className="spinning" size={24} />
            </div>
          ) : (
            <>
              <div className="provider-tabs">
                {availableModels?.providers.map((provider: string) => (
                  <button
                    key={provider}
                    className={`provider-tab ${selectedProvider === provider ? 'active' : ''}`}
                    onClick={() => dispatch(setProvider(provider))}
                  >
                    {provider === 'anthropic' ? '☁️ Cloud' : '🖥️ Local'}
                  </button>
                ))}
              </div>

              <div className="model-list">
                {availableModels?.models[selectedProvider as 'anthropic' | 'ollama']?.map(
                  (model: ModelInfo) => (
                    <button
                      key={model.name}
                      className={`model-item ${selectedModel === model.name ? 'active' : ''}`}
                      onClick={() => {
                        dispatch(setModel(model.name));
                        setShowModelPicker(false);
                      }}
                    >
                      <div className="model-info">
                        <span className="model-item-name">{model.display_name}</span>
                        {model.size && (
                          <span className="model-size">{formatSize(model.size)}</span>
                        )}
                      </div>
                      {selectedModel === model.name && <span className="model-check">✓</span>}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="chatbot-messages">
        {messages.length === 0 ? (
          <div className="welcome-container">
            <div className="welcome-icon">🤖</div>
            <h2 className="welcome-title">AI Calendar Assistant</h2>
            <p className="welcome-text">Hi {user?.first_name || 'there'}! I can help you:</p>
            <div className="feature-list">
              <span>📅 Create events</span>
              <span>🔍 Check your schedule</span>
              <span>✏️ Update events</span>
              <span>❓ Answer questions</span>
            </div>
            <p className="welcome-prompt">
              Try asking: "Create an event tomorrow at 3pm called Team Meeting"
            </p>
          </div>
        ) : (
          messages.map((message: ChatMessage, index: number) => (
            <div
              key={index}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="message-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {isStreaming && (
        <div className="streaming-container">
          <div className="streaming-header">
            <Loader2 className="spinning" size={16} />
            <span>AI is working... (Step {streamIteration})</span>
          </div>

          {currentThought && (
            <div className="streaming-step">
              <span className="streaming-step-title">💭 Thinking:</span>
              <p className="streaming-step-content">{currentThought}</p>
            </div>
          )}

          {currentAction && (
            <div className="streaming-step">
              <span className="streaming-step-title">⚡ Action:</span>
              <p className="streaming-step-content">{currentAction}</p>
            </div>
          )}

          {currentObservation && (
            <div className="streaming-step">
              <span className="streaming-step-title">👀 Observation:</span>
              <p className="streaming-step-content">{currentObservation}</p>
            </div>
          )}
        </div>
      )}

      {isLoading && !isStreaming && (
        <div className="loading-indicator">
          <Loader2 className="spinning" size={16} />
          <span>AI is thinking...</span>
        </div>
      )}

      <div className="chatbot-input">
        <textarea
          className="message-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatbotPage;
