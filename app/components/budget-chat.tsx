"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { type BudgetChatContext } from "../../lib/budget-health/domain/build-budget-chat-response";
import {
  resolveBudgetChatCategorySelection,
  type BudgetChatCategoryOption,
} from "../../lib/budget-health/domain/resolve-budget-chat-category";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type BehaviorChatResponse = {
  answer?: string;
  error?: string;
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function BudgetChat(props: {
  context: BudgetChatContext;
  categories: BudgetChatCategoryOption[];
}) {
  const router = useRouter();
  const categories = props.categories;
  const [selectedCategory, setSelectedCategory] = useState<BudgetChatCategoryOption | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask me about how your buying behavior is changing. I use your budget and transaction evidence, then reason from that evidence instead of making up numbers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!props.context.selectedCategoryName) {
      return;
    }

    const matchingCategory = categories.find(
      (category) => category.categoryName === props.context.selectedCategoryName
    );

    if (matchingCategory) {
      setSelectedCategory(matchingCategory);
    }
  }, [categories, props.context.selectedCategoryName]);

  const quickPrompts = useMemo(
    () =>
      selectedCategory
        ? [
            `Is ${selectedCategory.categoryName} actually the issue?`,
            "What behavior changed here?",
            "Is this more frequent or more expensive?",
            "What should I pay attention to?",
          ]
        : [
            "Where am I spending differently?",
            "What merchants are creeping up?",
            "Is dining actually the problem?",
            "Am I making more small purchases than usual?",
          ],
    [selectedCategory]
  );

  function appendMessage(role: ChatMessage["role"], content: string) {
    setMessages((current) => [
      ...current,
      {
        id: makeId(),
        role,
        content,
      },
    ]);
  }

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    const categorySelection = resolveBudgetChatCategorySelection({
      message: trimmed,
      categories,
    });

    if (categorySelection) {
      setSelectedCategory(categorySelection);
      router.replace(categorySelection.href, { scroll: false });
    }

    const activeCategory = categorySelection ?? selectedCategory;

    appendMessage("user", trimmed);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat/behavior", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: activeCategory
            ? `${trimmed}\n\nSelected category: ${activeCategory.categoryName}`
            : trimmed,
        }),
      });
      const payload = (await response.json()) as BehaviorChatResponse;

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error ?? "Budget Boss could not answer that yet.");
      }

      appendMessage("assistant", payload.answer);
    } catch (error) {
      appendMessage(
        "assistant",
        error instanceof Error
          ? error.message
          : "Budget Boss could not answer that yet."
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <section className="chatShell">
      <div className="chatTranscript" aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`chatBubble chatBubble--${message.role}`}
          >
            <p className="chatRole">{message.role === "assistant" ? "Budget Boss" : "You"}</p>
            <p className="chatContent">{message.content}</p>
          </article>
        ))}
      </div>

      {selectedCategory ? (
        <div className="chatContextBar">
          <span className="chatContextLabel">Selected category</span>
          <span className="chatContextValue">{selectedCategory.categoryName}</span>
          <Link className="chatContextLink" href={selectedCategory.dashboardHref}>
            Jump to category
          </Link>
        </div>
      ) : null}

      <div className="chatQuickReplies">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chatChip"
            onClick={() => void sendMessage(prompt)}
            disabled={isSending}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="chatComposer" onSubmit={handleSubmit}>
        <input
          className="chatInput"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about merchants, categories, frequency, or what changed..."
          aria-label="Ask Budget Boss"
          disabled={isSending}
        />
        <button className="primaryButton" type="submit" disabled={isSending}>
          {isSending ? "Thinking" : "Send"}
        </button>
      </form>
    </section>
  );
}
