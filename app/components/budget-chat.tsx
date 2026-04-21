"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  buildBudgetChatResponse,
  type BudgetChatContext,
} from "../../lib/budget-health/domain/build-budget-chat-response";
import {
  resolveBudgetChatCategorySelection,
  type BudgetChatCategoryOption,
} from "../../lib/budget-health/domain/resolve-budget-chat-category";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
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
        "Ask me about the month-end projection, the main driver, or recent history. I stay grounded in the current budget snapshot.",
    },
  ]);
  const [input, setInput] = useState("");

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
            `Show me ${selectedCategory.categoryName}`,
            "What is driving this?",
            "How confident are you?",
            "What does history say?",
          ]
        : [
            "What is driving this?",
            "How confident are you?",
            "What does history say?",
            "Show the biggest over-budget categories.",
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

  function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;

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
    const reply = buildBudgetChatResponse({
      message: trimmed,
      context: {
        ...props.context,
        selectedCategoryName: activeCategory?.categoryName ?? props.context.selectedCategoryName,
        selectedCategoryBehaviorType:
          activeCategory?.categoryBehaviorType ?? props.context.selectedCategoryBehaviorType,
        selectedCategoryActualSpendToDate:
          activeCategory?.actualSpendToDate ?? props.context.selectedCategoryActualSpendToDate,
        selectedCategoryPlannedBudgetAmount:
          activeCategory?.plannedBudgetAmount ?? props.context.selectedCategoryPlannedBudgetAmount,
        selectedCategoryProjectedVarianceAmount:
          activeCategory?.projectedVarianceAmount ??
          props.context.selectedCategoryProjectedVarianceAmount,
        selectedCategoryHref: activeCategory?.href ?? props.context.selectedCategoryHref,
      },
    });
    appendMessage("assistant", reply);
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
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
            onClick={() => sendMessage(prompt)}
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
          placeholder="Ask about budget health, history, or drivers..."
          aria-label="Ask Budget Boss"
        />
        <button className="primaryButton" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
