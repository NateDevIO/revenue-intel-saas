import { showSuccess, showError } from "./toast";

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-HTTPS
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Share current page URL with optional message
 */
export async function shareCurrentPage(options: ShareOptions = {}) {
  const url = options.url || window.location.href;
  const title = options.title || document.title;
  const text = options.text || `Check out ${title}`;

  // Try native share API first (mobile devices)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error) {
      // User cancelled or share failed
      console.log("Share cancelled or failed:", error);
    }
  }

  // Fallback to clipboard
  const success = await copyToClipboard(url);
  if (success) {
    showSuccess("Link copied to clipboard!", "Share this link with others");
    return true;
  } else {
    showError("Failed to copy link", "Please copy the URL manually");
    return false;
  }
}

/**
 * Generate a shareable link with parameters
 */
export function generateShareLink(
  path: string,
  params?: Record<string, string | number>
): string {
  const baseUrl = window.location.origin;
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

/**
 * Share dashboard with specific filters
 */
export async function shareDashboard(filters?: Record<string, string | number>) {
  const url = generateShareLink(window.location.pathname, filters);
  return shareCurrentPage({
    title: "SaaS Revenue Dashboard",
    text: "Check out this revenue analytics dashboard",
    url,
  });
}

/**
 * Share customer insights
 */
export async function shareCustomerInsight(customerId: string, customerName: string) {
  const url = generateShareLink("/customers", { customer: customerId });
  return shareCurrentPage({
    title: `Customer Insights: ${customerName}`,
    text: `View detailed analytics for ${customerName}`,
    url,
  });
}

/**
 * Email share with pre-filled content
 */
export function shareViaEmail(subject: string, body: string) {
  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

/**
 * Download data as JSON
 */
export function downloadAsJSON(data: any, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
