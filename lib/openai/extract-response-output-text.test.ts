import { describe, expect, it } from "vitest";
import {
  describeMissingResponseText,
  extractResponseOutputText,
} from "./extract-response-output-text";

describe("extractResponseOutputText", () => {
  it("uses output_text when present", () => {
    expect(
      extractResponseOutputText({
        output_text: "  Grounded answer.  ",
      })
    ).toBe("Grounded answer.");
  });

  it("reads text from message content", () => {
    expect(
      extractResponseOutputText({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "Dining is up versus baseline.",
              },
            ],
          },
        ],
      })
    ).toBe("Dining is up versus baseline.");
  });

  it("describes incomplete responses", () => {
    expect(
      describeMissingResponseText({
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
      })
    ).toBe("OpenAI response was incomplete: max_output_tokens.");
  });
});
