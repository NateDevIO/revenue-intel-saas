"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, showSuccess } from "@/lib/toast";

interface CustomerInsightsProps {
  customerId: string;
  customerName: string;
}

interface AIInsight {
  customer_id: string;
  customer_name: string;
  insight: string;
  model: string;
}

export function CustomerInsights({ customerId, customerName }: CustomerInsightsProps) {
  const [question, setQuestion] = useState("");
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetInsights = async (customQuestion?: string) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/ai/customer-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          question: customQuestion || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get AI insights");
      }

      const data: AIInsight = await response.json();
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
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>AI-Powered Insights</CardTitle>
        </div>
        <CardDescription>
          Get instant analysis and recommendations powered by Claude AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick analysis button */}
        {!insight && !loading && (
          <Button
            onClick={() => handleGetInsights()}
            className="w-full"
            variant="default"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Customer Analysis
          </Button>
        )}

        {/* Ask a question */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ask a specific question</label>
          <div className="flex gap-2">
            <Textarea
              placeholder="e.g., Why is this customer at risk? What actions should we take?"
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
                Analyzing customer data with Claude AI...
              </p>
            </div>
          </div>
        )}

        {/* AI Insight */}
        {insight && !loading && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      AI Analysis for {insight.customer_name}
                    </p>
                    <span className="text-xs text-gray-500">{insight.model}</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700">
                      {insight.insight}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
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
              {[
                "Why is this customer at risk?",
                "What actions should we take?",
                "What's driving their health score?",
                "How can we prevent churn?",
              ].map((suggestedQ) => (
                <Button
                  key={suggestedQ}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuestion(suggestedQ);
                    handleGetInsights(suggestedQ);
                  }}
                  disabled={loading}
                  className="text-xs"
                >
                  {suggestedQ}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* API Key Notice */}
        <div className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded p-2">
          <strong>Note:</strong> Requires ANTHROPIC_API_KEY environment variable to be set in the backend.
        </div>
      </CardContent>
    </Card>
  );
}
