"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showError, showSuccess } from "@/lib/toast";
import type { PageInsightResponse } from "@/types";

interface PageInsightsProps {
  pageId: string;
  pageTitle: string;
  apiEndpoint: string;
  buttonLabel?: string;
  suggestedQuestions: string[];
  contextData?: Record<string, any>;
}

export function PageInsights({
  pageId,
  pageTitle,
  apiEndpoint,
  buttonLabel = "Generate Insights",
  suggestedQuestions,
  contextData,
}: PageInsightsProps) {
  const [question, setQuestion] = useState("");
  const [insight, setInsight] = useState<PageInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleGetInsights = async (customQuestion?: string) => {
    setLoading(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: customQuestion || null,
          context_data: contextData || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get AI insights");
      }

      const data: PageInsightResponse = await response.json();
      setInsight(data);
      showSuccess("AI analysis complete!");
    } catch (error) {
      console.error("Error getting AI insights:", error);
      showError(
        "Failed to get AI insights",
        error instanceof Error ? error.message : "Please try again later"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = () => {
    if (!question.trim()) {
      showError("Please enter a question");
      return;
    }
    handleGetInsights(question);
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">
              AI Insights — {pageTitle}
            </CardTitle>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {!isOpen && (
          <CardDescription>
            Click to expand and generate AI-powered analysis
          </CardDescription>
        )}
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {/* Generate button */}
          {!insight && !loading && (
            <Button
              onClick={() => handleGetInsights()}
              className="w-full"
              variant="default"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {buttonLabel}
            </Button>
          )}

          {/* Custom question input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Ask a specific question
            </label>
            <div className="flex gap-2">
              <Textarea
                placeholder="e.g., What should I focus on this week?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
                className="min-h-[80px]"
                disabled={loading}
              />
              <Button
                onClick={handleAskQuestion}
                disabled={loading || !question.trim()}
                size="icon"
                className="h-[80px] w-12"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                <p className="text-sm text-muted-foreground">
                  Analyzing {pageTitle.toLowerCase()} data with Claude AI...
                </p>
              </div>
            </div>
          )}

          {/* AI result */}
          {insight && !loading && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        AI Analysis — {pageTitle}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {insight.model}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap text-sm">
                        {insight.insight}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setInsight(null);
                    setQuestion("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => handleGetInsights(question || undefined)}
                  variant="ghost"
                  size="sm"
                >
                  <Sparkles className="mr-2 h-3 w-3" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {/* Suggested questions */}
          {!loading && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Suggested questions:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuestion(q);
                      handleGetInsights(q);
                    }}
                    disabled={loading}
                    className="text-xs"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* API Key Notice */}
          <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
            <strong>Note:</strong> Requires ANTHROPIC_API_KEY environment
            variable to be set in the backend.
          </div>
        </CardContent>
      )}
    </Card>
  );
}
