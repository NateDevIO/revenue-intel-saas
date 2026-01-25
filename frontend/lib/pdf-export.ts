import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFExportOptions {
  filename?: string;
  title?: string;
  orientation?: "portrait" | "landscape";
}

/**
 * Export an HTML element to PDF
 */
export async function exportToPDF(
  elementId: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    filename = "export.pdf",
    title = "Export",
    orientation = "portrait",
  } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });

    // Calculate dimensions to fit A4
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20; // 10mm margins on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10; // Top margin

    // Add title
    pdf.setFontSize(16);
    pdf.text(title, pageWidth / 2, position, { align: "center" });
    position += 10;

    // Add image (with pagination if needed)
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - position - 10; // Account for margins

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
    }

    // Add footer with timestamp
    const pageCount = pdf.getNumberOfPages();
    pdf.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.text(
        `Generated ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );
    }

    pdf.save(filename);
  } catch (error) {
    console.error("PDF export failed:", error);
    throw error;
  }
}

/**
 * Export dashboard to PDF
 */
export async function exportDashboardToPDF(title: string = "Dashboard Report") {
  await exportToPDF("dashboard-content", {
    filename: `${title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`,
    title,
    orientation: "portrait",
  });
}

/**
 * Export specific section to PDF
 */
export async function exportSectionToPDF(
  sectionId: string,
  sectionTitle: string
) {
  await exportToPDF(sectionId, {
    filename: `${sectionTitle.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`,
    title: sectionTitle,
    orientation: "portrait",
  });
}
