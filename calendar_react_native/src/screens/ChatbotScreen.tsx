// ChatbotScreen - AI-powered calendar assistant!
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { sendChatMessage, sendChatMessageStream, clearMessages, clearError, fetchModels, setProvider, setModel } from '../store/slices/chatbotSlice';
import { fetchEvents } from '../store/slices/eventsSlice';
import { COLORS, FONT_SIZES } from '../constants/config';
import { ChatMessage } from '../services/calendarAgentService';

export const ChatbotScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
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
  } = useSelector((state: RootState) => state.chatbot);
  const { user } = useSelector((state: RootState) => state.auth);

  const [inputText, setInputText] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch models on mount
  useEffect(() => {
    dispatch(fetchModels());
  }, [dispatch]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        {
          text: 'OK',
          onPress: () => dispatch(clearError()),
        },
      ]);
    }
  }, [error, dispatch]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const message = inputText.trim();
    setInputText('');

    try {
      await dispatch(sendChatMessage({ message })).unwrap();
      // Refresh events after agent completes (in case it created/modified events)
      dispatch(fetchEvents());
    } catch (err) {
      // Error handled by Redux and alert
      console.error('Failed to send message:', err);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => dispatch(clearMessages()),
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <View style={styles.messageHeader}>
          <Text style={styles.messageRole}>
            {isUser ? '👤 You' : '🤖 AI Assistant'}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  const renderWelcomeMessage = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeIcon}>🤖</Text>
      <Text style={styles.welcomeTitle}>AI Calendar Assistant</Text>
      <Text style={styles.welcomeText}>
        Hi {user?.first_name || 'there'}! I can help you:
      </Text>
      <View style={styles.featureList}>
        <Text style={styles.featureItem}>📅 Create events</Text>
        <Text style={styles.featureItem}>🔍 Check your schedule</Text>
        <Text style={styles.featureItem}>✏️ Update events</Text>
        <Text style={styles.featureItem}>❓ Answer questions</Text>
      </View>
      <Text style={styles.welcomePrompt}>
        Try asking: "Create an event tomorrow at 3pm called Team Meeting"
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {messages.length === 0 && renderWelcomeMessage()}
    </View>
  );

  // Get display name for current model
  const getModelDisplayName = () => {
    if (!availableModels) return selectedModel;
    const models = availableModels.models[selectedProvider as 'anthropic' | 'ollama'] || [];
    const model = models.find(m => m.name === selectedModel);
    return model?.display_name || selectedModel;
  };

  // Format file size for display
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const renderModelPicker = () => (
    <Modal
      visible={showModelPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowModelPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select AI Model</Text>
            <TouchableOpacity onPress={() => setShowModelPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoadingModels ? (
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          ) : (
            <ScrollView style={styles.modelList}>
              {/* Provider Tabs */}
              <View style={styles.providerTabs}>
                {availableModels?.providers.map((provider) => (
                  <TouchableOpacity
                    key={provider}
                    style={[
                      styles.providerTab,
                      selectedProvider === provider && styles.providerTabActive,
                    ]}
                    onPress={() => dispatch(setProvider(provider))}
                  >
                    <Text
                      style={[
                        styles.providerTabText,
                        selectedProvider === provider && styles.providerTabTextActive,
                      ]}
                    >
                      {provider === 'anthropic' ? '☁️ Cloud' : '🖥️ Local'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Model List */}
              {availableModels?.models[selectedProvider as 'anthropic' | 'ollama']?.map((model) => (
                <TouchableOpacity
                  key={model.name}
                  style={[
                    styles.modelItem,
                    selectedModel === model.name && styles.modelItemActive,
                  ]}
                  onPress={() => {
                    dispatch(setModel(model.name));
                    setShowModelPicker(false);
                  }}
                >
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName}>{model.display_name}</Text>
                    {model.size && (
                      <Text style={styles.modelSize}>{formatSize(model.size)}</Text>
                    )}
                  </View>
                  {selectedModel === model.name && (
                    <Text style={styles.modelCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              {availableModels?.models[selectedProvider as 'anthropic' | 'ollama']?.length === 0 && (
                <Text style={styles.noModels}>
                  No models available for {selectedProvider}
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderStreamingSteps = () => {
    if (!isStreaming) return null;

    return (
      <View style={styles.streamingContainer}>
        <View style={styles.streamingHeader}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.streamingHeaderText}>
            AI is working... (Step {streamIteration})
          </Text>
        </View>

        {currentThought && (
          <View style={styles.streamingStep}>
            <Text style={styles.streamingStepTitle}>💭 Thinking:</Text>
            <Text style={styles.streamingStepContent}>{currentThought}</Text>
          </View>
        )}

        {currentAction && (
          <View style={styles.streamingStep}>
            <Text style={styles.streamingStepTitle}>⚡ Action:</Text>
            <Text style={styles.streamingStepContent}>{currentAction}</Text>
          </View>
        )}

        {currentObservation && (
          <View style={styles.streamingStep}>
            <Text style={styles.streamingStepTitle}>👀 Observation:</Text>
            <Text style={styles.streamingStepContent}>{currentObservation}</Text>
          </View>
        )}
      </View>
    );
  };

  const Container = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const containerProps = Platform.OS === 'ios'
    ? { behavior: 'padding' as const, keyboardVerticalOffset: 90 }
    : {};

  return (
    <Container
      style={styles.container}
      {...containerProps}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <TouchableOpacity
            style={styles.modelSelector}
            onPress={() => setShowModelPicker(true)}
          >
            <Text style={styles.modelSelectorIcon}>
              {selectedProvider === 'anthropic' ? '☁️' : '🖥️'}
            </Text>
            <Text style={styles.modelSelectorText} numberOfLines={1}>
              {getModelDisplayName()}
            </Text>
            <Text style={styles.modelSelectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity
            onPress={handleClearChat}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Model Picker Modal */}
      {renderModelPicker()}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />

      {/* Streaming Steps */}
      {renderStreamingSteps()}

      {/* Loading Indicator */}
      {isLoading && !isStreaming && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor={COLORS.TEXT.DISABLED}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>📤</Text>
        </TouchableOpacity>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.SECONDARY,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 6,
  },
  modelSelectorIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  modelSelectorText: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    maxWidth: 150,
  },
  modelSelectorArrow: {
    fontSize: 10,
    color: COLORS.TEXT.DISABLED,
    marginLeft: 6,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.ERROR,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  welcomeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureList: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureItem: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginVertical: 4,
  },
  welcomePrompt: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.PRIMARY,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 6,
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.PRIMARY,
    marginLeft: 40,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    marginRight: 40,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageRole: {
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '600',
    color: COLORS.TEXT.SECONDARY,
  },
  messageTime: {
    fontSize: FONT_SIZES.SMALL - 2,
    color: COLORS.TEXT.DISABLED,
  },
  messageText: {
    fontSize: FONT_SIZES.MEDIUM,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: COLORS.TEXT.PRIMARY,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderTopWidth: 1,
    borderTopColor: COLORS.BACKGROUND.SECONDARY,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.TEXT.DISABLED,
  },
  sendButtonText: {
    fontSize: 20,
  },
  streamingContainer: {
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderTopWidth: 1,
    borderTopColor: COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  streamingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streamingHeaderText: {
    marginLeft: 8,
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  streamingStep: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  streamingStepTitle: {
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '600',
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  streamingStepContent: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.PRIMARY,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.SECONDARY,
  },
  modalTitle: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.TEXT.SECONDARY,
    padding: 4,
  },
  modelList: {
    padding: 16,
  },
  providerTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 4,
  },
  providerTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  providerTabActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  providerTabText: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: '500',
  },
  providerTabTextActive: {
    color: '#FFFFFF',
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderRadius: 10,
    marginBottom: 8,
  },
  modelItemActive: {
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '500',
  },
  modelSize: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  modelCheck: {
    fontSize: 18,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  noModels: {
    textAlign: 'center',
    color: COLORS.TEXT.SECONDARY,
    fontSize: FONT_SIZES.MEDIUM,
    paddingVertical: 20,
  },
});
