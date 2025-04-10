import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Rich text editor with handwriting simulation on A4 paper
export default function EnhancedHandwritingApp() {
  const [content, setContent] = useState("");
  const [font, setFont] = useState("Caveat");
  const [color, setColor] = useState("#2563eb");
  const [pages, setPages] = useState([]);
  const [pageHeaders, setPageHeaders] = useState({});
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  const fonts = [
    {
      name: "Caveat",
      label: "Casual Handwriting",
      family: "'Caveat', cursive",
    },
    {
      name: "Homemade Apple",
      label: "Neat Handwriting",
      family: "'Homemade Apple', cursive",
    },
    {
      name: "Reenie Beanie",
      label: "Quick Notes",
      family: "'Reenie Beanie', cursive",
    },
    {
      name: "Rock Salt",
      label: "Blocky Letters",
      family: "'Rock Salt', cursive",
    },
    {
      name: "Indie Flower",
      label: "School Notes",
      family: "'Indie Flower', cursive",
    },
    {
      name: "QEBradenHill",
      label: "Braden Hill",
      family: "'QEBradenHill', cursive",
    },
    {
      name: "QEDavidReid",
      label: "David Reid",
      family: "'QEDavidReid', cursive",
    },
    {
      name: "Dancing Script",
      label: "Elegant Script",
      family: "'Dancing Script', cursive",
    },
    { name: "Kalam", label: "Natural Notes", family: "'Kalam', cursive" },
  ];

  const colors = [
    { value: "#2563eb", label: "Blue" },
    { value: "#000000", label: "Black" },
    { value: "#dc2626", label: "Red" },
    { value: "#65a30d", label: "Green" },
    { value: "#7c3aed", label: "Purple" },
    { value: "#9f1239", label: "Burgundy" },
  ];

  const paperStyles = [
    { value: "ruled", label: "Ruled Paper" },
    { value: "grid", label: "Grid Paper" },
    { value: "blank", label: "Blank Paper" },
  ];

  const [paperStyle, setPaperStyle] = useState("ruled");
  const [isEditing, setIsEditing] = useState(true);

  // Format options
  const [isBold, setIsBold] = useState(false);
  const [isHeading, setIsHeading] = useState(false);
  const [isQuestion, setIsQuestion] = useState(false);

  // Line height for ruled paper to ensure text alignment with lines
  const lineHeight = 24;
  const footerHeight = 80; // Footer space height in pixels

  useEffect(() => {
    // Process the content and split into A4 pages
    paginateContent();
  }, [content, font, color, paperStyle, isBold, isHeading, isQuestion]);

  // Initialize headers for each page
  useEffect(() => {
    const initialHeaders = {};
    pages.forEach((page, index) => {
      if (!pageHeaders[index]) {
        initialHeaders[index] = `Notes - ${page.meta.pageNumber}`;
      }
    });
    setPageHeaders((prev) => ({ ...prev, ...initialHeaders }));
  }, [pages]);

  const paginateContent = () => {
    if (!content) {
      setPages([{ content: "", meta: { pageNumber: 1 } }]);
      return;
    }

    // Split content into sections based on formatting
    const sections = parseContent(content);

    // Calculate characters per A4 page (rough estimate)
    // A4 dimensions are 210mm x 297mm
    // Account for header and footer space
    const writableHeight =
      paperStyle === "ruled" ? 842 - 80 - footerHeight : 842 - 80;
    const linesPerPage = Math.floor(writableHeight / lineHeight);
    const charsPerLine = 60; // Approximate chars per line
    const charsPerPage = linesPerPage * charsPerLine;

    let pages = [];
    let currentPage = { content: "", meta: { pageNumber: 1 } };
    let charCount = 0;
    let lineCount = 0;

    sections.forEach((section) => {
      const sectionLines = section.text.split("\n").length;

      // If adding this section would exceed page capacity
      if (
        lineCount + sectionLines > linesPerPage ||
        charCount + section.text.length > charsPerPage
      ) {
        // Finish current page
        pages.push(currentPage);

        // Start new page
        currentPage = {
          content: section.text,
          meta: {
            pageNumber: pages.length + 1,
            sections: [{ ...section, startIndex: 0 }],
          },
        };
        charCount = section.text.length;
        lineCount = sectionLines;
      } else {
        // Add section to current page
        const startIndex = currentPage.content.length;
        currentPage.content += section.text;

        if (!currentPage.meta.sections) {
          currentPage.meta.sections = [];
        }

        currentPage.meta.sections.push({
          ...section,
          startIndex,
        });

        charCount += section.text.length;
        lineCount += sectionLines;
      }
    });

    // Add the last page if it has content
    if (currentPage.content) {
      pages.push(currentPage);
    }

    // Ensure at least one page
    if (pages.length === 0) {
      pages = [{ content: "", meta: { pageNumber: 1 } }];
    }

    setPages(pages);
  };

  const parseContent = (rawContent) => {
    // This function would analyze the content to identify:
    // - Headings (lines starting with # or ##)
    // - Questions (lines ending with ?)
    // - Answers (lines following questions)

    const lines = rawContent.split("\n");
    const sections = [];

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("# ")) {
        // Main heading
        sections.push({
          text: line + "\n",
          type: "heading1",
          style: { fontSize: "28px", fontWeight: "bold" },
        });
      } else if (trimmed.startsWith("## ")) {
        // Subheading
        sections.push({
          text: line + "\n",
          type: "heading2",
          style: { fontSize: "24px", fontWeight: "bold" },
        });
      } else if (trimmed.endsWith("?")) {
        // Question
        sections.push({
          text: line + "\n",
          type: "question",
          style: { fontWeight: "bold", color: "#000" },
        });
      } else {
        // Regular text or answer
        sections.push({
          text: line + "\n",
          type: "text",
          style: {},
        });
      }
    });

    return sections;
  };

  const handleEditorChange = (e) => {
    setContent(e.target.value);
  };

  const handleHeaderChange = (pageIndex, value) => {
    setPageHeaders((prev) => ({
      ...prev,
      [pageIndex]: value,
    }));
  };

  const handleFormatClick = (format) => {
    switch (format) {
      case "bold":
        setIsBold(!isBold);
        break;
      case "heading":
        setIsHeading(!isHeading);
        setIsQuestion(false); // Reset question format

        // Insert heading markdown at cursor position
        if (!isHeading && editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const lineStart = textBefore.lastIndexOf("\n") + 1;

          if (textBefore.substring(lineStart).startsWith("# ")) {
            // Already a heading, do nothing
          } else if (textBefore.substring(lineStart).startsWith("## ")) {
            // Convert subheading to heading
            const newTextBefore =
              textBefore.substring(0, lineStart) +
              "# " +
              textBefore.substring(lineStart + 3);
            setContent(newTextBefore + textAfter);
          } else {
            // Add heading
            const newTextBefore =
              textBefore.substring(0, lineStart) +
              "# " +
              textBefore.substring(lineStart);
            setContent(newTextBefore + textAfter);
          }
        }
        break;
      case "subheading":
        setIsHeading(!isHeading);
        setIsQuestion(false); // Reset question format

        // Insert subheading markdown at cursor position
        if (!isHeading && editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const lineStart = textBefore.lastIndexOf("\n") + 1;

          if (textBefore.substring(lineStart).startsWith("## ")) {
            // Already a subheading, do nothing
          } else if (textBefore.substring(lineStart).startsWith("# ")) {
            // Convert heading to subheading
            const newTextBefore =
              textBefore.substring(0, lineStart) +
              "## " +
              textBefore.substring(lineStart + 2);
            setContent(newTextBefore + textAfter);
          } else {
            // Add subheading
            const newTextBefore =
              textBefore.substring(0, lineStart) +
              "## " +
              textBefore.substring(lineStart);
            setContent(newTextBefore + textAfter);
          }
        }
        break;
      case "question":
        setIsQuestion(!isQuestion);
        setIsHeading(false); // Reset heading format

        // Add question mark at the end of the line if not present
        if (!isQuestion && editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const lineEnd = textAfter.indexOf("\n");
          const restAfter = lineEnd >= 0 ? textAfter.substring(lineEnd) : "";
          const currentLine =
            lineEnd >= 0 ? textAfter.substring(0, lineEnd) : textAfter;

          if (!currentLine.trim().endsWith("?")) {
            const newTextAfter =
              (currentLine.trim() ? currentLine.trim() + "?" : "?") + restAfter;
            setContent(textBefore + newTextAfter);
          }
        }
        break;
    }
  };

  const exportToPDF = async () => {
    if (!previewRef.current) return;

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      // Get all page elements
      const pageElements =
        previewRef.current.querySelectorAll(".page-container");

      for (let i = 0; i < pageElements.length; i++) {
        // If not the first page, add a new page to the PDF
        if (i > 0) {
          pdf.addPage();
        }

        // Capture the page as an image
        const canvas = await html2canvas(
          pageElements[i].querySelector(".page-content"),
          {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
          }
        );

        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        // Add to PDF (A4 page size in points at 72 DPI is 595x842)
        pdf.addImage(imgData, "JPEG", 0, 0, 595, 842);
      }

      // Save the PDF
      pdf.save("handwritten-notes.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Advanced Handwritten Notes</h1>

        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Handwriting Style
            </label>
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              className="border rounded p-2 w-full"
            >
              {fonts.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pen Color</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="border rounded p-2 w-full"
            >
              {colors.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Paper Style
            </label>
            <select
              value={paperStyle}
              onChange={(e) => setPaperStyle(e.target.value)}
              className="border rounded p-2 w-full"
            >
              {paperStyles.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleFormatClick("heading")}
            className={`px-2 py-1 rounded border ${
              isHeading ? "bg-blue-100" : ""
            }`}
            title="Main Heading (H1)"
          >
            H1
          </button>
          <button
            onClick={() => handleFormatClick("subheading")}
            className={`px-2 py-1 rounded border ${
              isHeading ? "bg-blue-100" : ""
            }`}
            title="Subheading (H2)"
          >
            H2
          </button>
          <button
            onClick={() => handleFormatClick("question")}
            className={`px-2 py-1 rounded border ${
              isQuestion ? "bg-blue-100" : ""
            }`}
            title="Question Format"
          >
            Q?
          </button>
          <button
            onClick={() => handleFormatClick("bold")}
            className={`px-2 py-1 rounded border ${
              isBold ? "bg-blue-100" : ""
            }`}
            title="Bold Text"
          >
            B
          </button>
        </div>

        <div className="mb-4">
          {isEditing ? (
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleEditorChange}
              placeholder="Start typing your text here... 
              
# Use # for main headings
## Use ## for subheadings
End with ? for questions
Regular text for answers"
              className="border rounded p-2 w-full h-64 font-mono"
            />
          ) : (
            <div className="border rounded p-2 bg-gray-50 w-full h-64 overflow-auto">
              <pre className="whitespace-pre-wrap">{content}</pre>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={toggleEditMode}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
          >
            {isEditing ? "Preview Editor Content" : "Return to Editor"}
          </button>

          <button
            onClick={exportToPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Export to PDF
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">
          Handwriting Preview ({pages.length} page
          {pages.length !== 1 ? "s" : ""})
        </h2>

        <div className="space-y-8" ref={previewRef}>
          {pages.map((page, pageIndex) => (
            <div key={pageIndex} className="page-container shadow-lg">
              {/* A4 page - 210mm × 297mm with proper aspect ratio */}
              <div
                className="page-content relative bg-white overflow-hidden border"
                style={{
                  width: "100%",
                  maxWidth: "595px", // A4 width in pixels at 72dpi
                  height: "842px", // A4 height in pixels at 72dpi
                  boxSizing: "border-box",
                }}
              >
                {/* Header section */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4 border-b">
                  <input
                    type="text"
                    value={pageHeaders[pageIndex] || ""}
                    onChange={(e) =>
                      handleHeaderChange(pageIndex, e.target.value)
                    }
                    className="w-full text-center font-bold"
                    style={{
                      fontFamily: font,
                      color,
                      fontSize: "18px",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Paper background based on style */}
                <div className="absolute inset-0 top-12">
                  {paperStyle === "ruled" && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(#cedbea 1px, transparent 1px)",
                        backgroundSize: `100% ${lineHeight}px`,
                        backgroundPosition: "0 -1px",
                        zIndex: 0,
                        height: `calc(100% - ${footerHeight}px)`,
                      }}
                    />
                  )}
                  {paperStyle === "grid" && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(#cedbea 1px, transparent 1px), linear-gradient(90deg, #cedbea 1px, transparent 1px)",
                        backgroundSize: `${lineHeight}px ${lineHeight}px`,
                        backgroundPosition: "-1px -1px",
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Left margin */}
                  {paperStyle !== "blank" && (
                    <div
                      className="absolute inset-y-0 left-12 border-l border-red-300"
                      style={{ zIndex: 1 }}
                    />
                  )}
                </div>

                {/* Handwritten content with proper formatting */}
                <div className="relative h-full z-10">
                  <div className="p-4 pt-16 pl-16">
                    {page.meta.sections ? (
                      page.meta.sections.map((section, i) => {
                        // Determine styling based on section type
                        let sectionStyle = {
                          fontFamily: font,
                          color,
                          fontSize: "20px",
                          lineHeight: `${lineHeight}px`,
                          ...section.style,
                        };

                        if (section.type === "heading1") {
                          sectionStyle = {
                            ...sectionStyle,
                            fontSize: "28px",
                            fontWeight: "bold",
                            marginTop: "8px",
                            marginBottom: "4px",
                          };
                        } else if (section.type === "heading2") {
                          sectionStyle = {
                            ...sectionStyle,
                            fontSize: "24px",
                            fontWeight: "bold",
                            marginTop: "8px",
                            marginBottom: "4px",
                          };
                        } else if (section.type === "question") {
                          sectionStyle = {
                            ...sectionStyle,
                            fontWeight: "bold",
                          };
                        }

                        // Format text - remove markdown symbols for display
                        let displayText = section.text;
                        if (section.type === "heading1") {
                          displayText = displayText.replace(/^# /, "");
                        } else if (section.type === "heading2") {
                          displayText = displayText.replace(/^## /, "");
                        }

                        return (
                          <div
                            key={i}
                            style={sectionStyle}
                            className="whitespace-pre-wrap"
                          >
                            {displayText}
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          fontFamily: font,
                          color,
                          fontSize: "20px",
                          lineHeight: `${lineHeight}px`,
                        }}
                        className="whitespace-pre-wrap"
                      >
                        {page.content}
                      </div>
                    )}
                  </div>
                </div>

                {/* Page number */}
                <div
                  className="absolute bottom-2 right-4 text-sm text-gray-500"
                  style={{ zIndex: 2 }}
                >
                  Page {page.meta.pageNumber} of {pages.length}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
