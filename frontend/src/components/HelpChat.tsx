import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { postHelpChat, type HelpChatTurn } from '../utils/api';

interface HelpChatProps {
  userId: string;
}

interface UiMessage {
  role: 'user' | 'model';
  text: string;
}

const WELCOME =
  'မင်္ဂလာပါ။ AgencyMS အသုံးပြုနည်းကို မြန်မာလို မေးနိုင်ပါသည်။ ဥပမာ — အလုပ်သမား Excel ဘယ်မှာ တင်ရမလဲ။';

export const HelpChat: React.FC<HelpChatProps> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: 'model', text: WELCOME },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    inputRef.current?.focus();
  }, [open, messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setSending(true);

    try {
      const history: HelpChatTurn[] = messages
        .filter((m) => m.role === 'user' || m.role === 'model')
        .slice(1) // skip welcome
        .map((m) => ({ role: m.role, text: m.text }));

      const { reply } = await postHelpChat(userId, text, history);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'မေးခွန်း ပို့၍ မရပါ။ ခဏနေပြီး ပြန်ကြိုးစားပါ။';
      setMessages((prev) => [...prev, { role: 'model', text: msg }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:bottom-6 md:right-6"
        aria-label={open ? 'အကူအညီ ပိတ်ရန်' : 'အကူအညီ ဖွင့်ရန်'}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-40 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:bottom-24 md:right-6">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                အကူအညီ (မြန်မာ)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AgencyMS အသုံးပြုနည်းသာ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              aria-label="ပိတ်ရန်"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex max-h-80 min-h-[16rem] flex-col gap-2 overflow-y-auto px-3 py-3"
          >
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'mr-auto bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                စဉ်းစားနေသည်…
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
              မြန်မာလိုသာ မေးပါ။
            </p>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="မေးခွန်း ရေးပါ…"
                disabled={sending}
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="ပို့ရန်"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
