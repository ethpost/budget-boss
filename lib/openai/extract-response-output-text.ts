export type OpenAIResponseContent = {
  text?: string;
  type?: string;
};

export type OpenAIResponseOutputItem = {
  content?: OpenAIResponseContent[];
  text?: string;
  type?: string;
};

export type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIResponseOutputItem[];
  status?: string;
  incomplete_details?: {
    reason?: string;
  } | null;
  error?: {
    message?: string;
  };
};

export function extractResponseOutputText(
  response: OpenAIResponsePayload
): string | null {
  if (response.output_text?.trim()) {
    return response.output_text.trim();
  }

  const pieces: string[] = [];

  for (const item of response.output ?? []) {
    if (item.text?.trim()) {
      pieces.push(item.text.trim());
    }

    for (const content of item.content ?? []) {
      if (content.text?.trim()) {
        pieces.push(content.text.trim());
      }
    }
  }

  const text = pieces.join("\n").trim();
  return text.length > 0 ? text : null;
}

export function describeMissingResponseText(
  response: OpenAIResponsePayload
): string {
  if (response.status === "incomplete") {
    const reason = response.incomplete_details?.reason;
    return reason
      ? `OpenAI response was incomplete: ${reason}.`
      : "OpenAI response was incomplete.";
  }

  if (response.status && response.status !== "completed") {
    return `OpenAI response status was ${response.status}.`;
  }

  return "OpenAI did not return an answer.";
}
