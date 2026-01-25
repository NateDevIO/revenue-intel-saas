"use client";

import { useState } from "react";
import { Download, Share2, FileDown, Link as LinkIcon, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF } from "@/lib/pdf-export";
import { shareCurrentPage, shareViaEmail } from "@/lib/share";
import { showSuccess, showError, showLoading } from "@/lib/toast";

interface ExportShareMenuProps {
  /**
   * ID of the element to export
   */
  exportElementId?: string;

  /**
   * Title for the export
   */
  exportTitle?: string;

  /**
   * Custom export data (for JSON/CSV)
   */
  exportData?: any;

  /**
   * Filename for exports (without extension)
   */
  filename?: string;

  /**
   * Show/hide specific export options
   */
  showPDF?: boolean;
  showShare?: boolean;
  showEmail?: boolean;

  /**
   * Button variant
   */
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportShareMenu({
  exportElementId,
  exportTitle = "Export",
  exportData,
  filename = "export",
  showPDF = true,
  showShare = true,
  showEmail = true,
  variant = "outline",
  size = "default",
}: ExportShareMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handlePDFExport = async () => {
    if (!exportElementId) {
      showError("Export failed", "No content specified for export");
      return;
    }

    setIsExporting(true);
    const loadingToast = showLoading("Generating PDF...");

    try {
      await exportToPDF(exportElementId, {
        filename: `${filename}.pdf`,
        title: exportTitle,
      });
      showSuccess("PDF exported successfully!", "Your file has been downloaded");
    } catch (error) {
      showError("PDF export failed", "Please try again");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    await shareCurrentPage({
      title: exportTitle,
      text: `Check out this ${exportTitle.toLowerCase()}`,
    });
  };

  const handleEmailShare = () => {
    const subject = exportTitle;
    const body = `Hi,\n\nI wanted to share this report with you:\n\n${window.location.href}\n\nBest regards`;
    shareViaEmail(subject, body);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export & Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {showPDF && exportElementId && (
          <DropdownMenuItem onClick={handlePDFExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        )}

        {showShare && (
          <>
            {showPDF && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Link
            </DropdownMenuItem>
          </>
        )}

        {showEmail && (
          <DropdownMenuItem onClick={handleEmailShare}>
            <Mail className="h-4 w-4 mr-2" />
            Share via Email
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
