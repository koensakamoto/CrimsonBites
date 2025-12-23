import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { SendIcon, BotIcon } from "lucide-react"

// Utility to get local date string in YYYY-MM-DD format
function getLocalDateString(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

const AIAssistant = ({ 
    isMobile = false, 
    addToTracker,
    diningHall,
    mealType,
    date
}) => {
    const [query, setQuery] = useState("")
    const [chatHistory, setChatHistory] = useState([
        {
            id: '1',
            role: 'assistant',
            content: 'Hi! I\'m your nutrition assistant. I can help you track your nutrition, suggest meals based on today\'s dining hall options, analyze your progress, and answer questions about your health goals. What would you like to know?',
            timestamp: new Date()
        },
    ])
    const [isLoading, setIsLoading] = useState(false)
    const [isStreaming, setIsStreaming] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!query.trim() || isLoading) {
            return;
        }

        const userMessage = {
            id: Date.now().toString(),
            role: "user",
            content: query,
            timestamp: new Date()
        };
        
        setChatHistory(prev => [...prev, userMessage])
        setIsLoading(true)
        setIsStreaming(true)
        const currentQuery = query;
        setQuery("")

        try {
            // Create context-aware message that includes current page context
            let contextualMessage = currentQuery;
            if (diningHall && mealType && date) {
                contextualMessage += ` (Context: Looking at ${diningHall} ${mealType} options for ${getLocalDateString(date)})`;
            }

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    message: contextualMessage,
                    session_id: `dashboard_${Date.now()}`
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // Create a placeholder message for streaming
            const assistantMessageId = (Date.now() + 1).toString();
            const assistantMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true
            };
            setChatHistory(prev => [...prev, assistantMessage]);

            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'response' && data.content) {
                                accumulatedContent += data.content;
                                setChatHistory(prev => prev.map(msg => 
                                    msg.id === assistantMessageId 
                                        ? { ...msg, content: accumulatedContent }
                                        : msg
                                ));
                            } else if (data.type === 'complete') {
                                setChatHistory(prev => prev.map(msg => 
                                    msg.id === assistantMessageId 
                                        ? { ...msg, isStreaming: false }
                                        : msg
                                ));
                                setIsStreaming(false);
                            } else if (data.type === 'error') {
                                setChatHistory(prev => prev.map(msg => 
                                    msg.id === assistantMessageId 
                                        ? { 
                                            ...msg, 
                                            content: data.content || 'Sorry, I encountered an error. Please try again.',
                                            isStreaming: false,
                                            isError: true
                                        }
                                        : msg
                                ));
                                setIsStreaming(false);
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', line);
                        }
                    }
                }
            }

        } catch (error) {
            console.error("AI Assistant error:", error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
                timestamp: new Date(),
                isError: true
            };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    }

    const formatTime = useCallback((timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    const clearChat = useCallback(() => {
        setChatHistory([
            {
                id: '1',
                role: 'assistant',
                content: 'Hi! I\'m your nutrition assistant. I can help you track your nutrition, suggest meals based on today\'s dining hall options, analyze your progress, and answer questions about your health goals. What would you like to know?',
                timestamp: new Date()
            },
        ]);
    }, []);

    // Suggested prompts based on context (memoized)
    const suggestedPrompts = useMemo(() => {
        const basePrompts = [
            "How many calories have I eaten today?",
            "What should I eat for lunch?",
            "How am I doing with my nutrition goals?",
            "Show me my weight progress this month"
        ];

        if (diningHall && mealType) {
            return [
                `What's the healthiest option at ${diningHall} for ${mealType}?`,
                `Suggest a high-protein meal from ${diningHall}`,
                ...basePrompts.slice(0, 2)
            ];
        }

        return basePrompts.slice(0, 4);
    }, [diningHall, mealType]);

    return (
        <div className={`bg-white rounded-lg shadow ${isMobile ? '' : 'h-100'}`}>
            <div className="p-4 bg-red-600 text-white rounded-t-lg flex items-center justify-between">
                <div className="flex items-center">
                    <BotIcon size={20} className="mr-2" />
                    <h3 className="font-medium">Nutrition Assistant</h3>
                </div>
                <button
                    onClick={clearChat}
                    className="p-1 hover:bg-red-700 rounded transition-colors"
                    aria-label="Clear chat history"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
            
            <div className={`p-4 overflow-y-auto ${isMobile ? 'max-h-60' : 'h-72'}`}>
                {chatHistory.map((message) => (
                    <div
                        key={message.id}
                        className={`mb-3 ${
                            message.role === 'user' 
                                ? 'bg-red-100 ml-8 rounded-tl-lg rounded-bl-lg rounded-tr-lg' 
                                : message.isError 
                                    ? 'bg-red-50 mr-8 rounded-tr-lg rounded-br-lg rounded-tl-lg border border-red-200'
                                    : 'bg-gray-100 mr-8 rounded-tr-lg rounded-br-lg rounded-tl-lg'
                        } p-3`}
                    >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                            {message.isStreaming && (
                                <span className="inline-block w-2 h-4 bg-gray-600 opacity-75 animate-pulse ml-1"></span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {formatTime(message.timestamp)}
                        </div>
                        {message.isError && (
                            <div className="flex items-center space-x-1 mt-2 text-red-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs">Message failed</span>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Show typing indicator when streaming */}
                {isStreaming && (
                    <div className="flex items-center space-x-2 text-gray-500 mb-3">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm">AI is thinking...</span>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Suggested prompts when input is empty */}
            {!query && !isLoading && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                    <div className="space-y-1">
                        {suggestedPrompts.slice(0, 2).map((prompt, index) => (
                            <button
                                key={index}
                                onClick={() => setQuery(prompt)}
                                className="block w-full text-left text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            >
                                "{prompt}"
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="p-3 border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex items-center">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={isStreaming ? "AI is responding..." : "Ask about nutrition, goals, or get meal suggestions..."}
                        className="flex-grow px-3 h-10 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isLoading}
                        aria-label="Chat with nutrition assistant"
                    />
                    <button
                        type="submit"
                        className="bg-red-600 text-white px-4 h-10 rounded-r-md hover:bg-red-700 focus:outline-none flex items-center justify-center disabled:bg-red-400 transition-colors"
                        disabled={isLoading || !query.trim()}
                    >
                        {isLoading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <SendIcon size={18} />
                        )}
                    </button>
                </form>
                <p className="text-xs text-gray-400 mt-1">
                    Powered by AI • Real-time nutrition insights
                </p>
            </div>
        </div>
    )
}

export default AIAssistant;