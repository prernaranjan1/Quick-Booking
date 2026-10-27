import { useEffect, useRef, useState } from 'react'
import { BotIcon, SendIcon, XIcon } from 'lucide-react'
import { apiRequest } from '../lib/api'

// Must match MAX_HISTORY_TURNS / MAX_MESSAGE_LENGTH in server/controllers/chatController.js
const MAX_HISTORY_TURNS = 10
const MAX_MESSAGE_LENGTH = 500

const QUICK_QUESTIONS = [
  { label: '🎬 What\'s showing?', text: 'Which movies are showing this week?' },
  { label: '💺 Seat prices', text: 'How do seat categories and prices work?' },
  { label: '🍿 Snacks', text: 'What snacks can I add?' },
  { label: '🎟️ How to book', text: 'How do I book a ticket?' }
]

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'model', text: "Hi! I'm the Quick Booking assistant. Ask me about movies, show times, seats, prices or snacks." }
  ])
  const [history, setHistory] = useState([])
  const messagesRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, isSending])

  useEffect(() => {
    if (isOpen && !isSending) inputRef.current?.focus()
  }, [isOpen, isSending])

  const sendMessage = async (text) => {
    const message = text.trim()
    if (!message || isSending) return

    setInput('')
    setIsSending(true)
    setMessages((prev) => [...prev, { role: 'user', text: message }])

    try {
      const { reply } = await apiRequest('/api/chat', {
        method: 'POST',
        body: { message, history }
      })

      setMessages((prev) => [...prev, { role: 'model', text: reply }])
      setHistory((prev) => [
        ...prev,
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: reply }] }
      ].slice(-MAX_HISTORY_TURNS))
    } catch (error) {
      const showServerMessage = error.status === 429 || error.status === 400 || error.status === 503
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: showServerMessage ? error.message : "Sorry, I'm having trouble connecting right now."
        }
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="print:hidden">
      {!isOpen && (
        <button
          type="button"
          aria-label="Open assistant"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-primary hover:bg-primary-dull shadow-lg transition cursor-pointer"
        >
          <BotIcon className="w-7 h-7" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[calc(100vw-3rem)] max-w-sm h-[32rem] max-h-[calc(100vh-3rem)] rounded-2xl overflow-hidden border border-primary/30 bg-[#111] shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-primary/15 border-b border-primary/20">
            <div>
              <p className="font-semibold">Quick Booking Assistant</p>
              <p className="text-xs text-gray-400">AI answers can be wrong. Check details before booking.</p>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-white/10 cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((item, index) => (
              <div key={index} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
                    item.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {item.text}
                </p>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <p className="rounded-2xl px-3 py-2 bg-gray-800 text-gray-400">Typing...</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question.label}
                type="button"
                disabled={isSending}
                onClick={() => sendMessage(question.text)}
                className="shrink-0 text-xs px-3 py-1 rounded-full border border-primary/40 hover:bg-primary/15 disabled:opacity-50 cursor-pointer"
              >
                {question.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
            className="flex items-center gap-2 p-3 border-t border-gray-800"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={isSending}
              placeholder="Ask about movies..."
              className="flex-1 bg-gray-900 rounded-full px-4 py-2 text-sm outline-none border border-gray-700 focus:border-primary disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={isSending || !input.trim()}
              className="p-2 rounded-full bg-primary hover:bg-primary-dull disabled:opacity-50 cursor-pointer"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Chatbot
