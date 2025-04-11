import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fonts } from "@/app/utils/enums";

export default function EnhancedHandwritingApp() {
  const [content, setContent] = useState("");
  const [font, setFont] = useState("Caveat");
  const [color, setColor] = useState("#2563eb");
  const [pages, setPages] = useState([]);
  const [pageHeaders, setPageHeaders] = useState<Record<number, string>>({});
  const [headerAlignments, setHeaderAlignments] = useState<
    Record<number, string>
  >({});
  const [editingLine, setEditingLine] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [lineAlignments, setLineAlignments] = useState<Record<string, string>>(
    {}
  );
  const [showingControls, setShowingControls] = useState<string | null>(null);
  const editorRef = useRef(null);
  const previewRef = useRef(null);

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
  const [lineInputMode, setLineInputMode] = useState(false);

  const [isBold, setIsBold] = useState(false);
  const [isHeading, setIsHeading] = useState(false);
  const [isQuestion, setIsQuestion] = useState(false);

  const lineHeight = 24;
  const headerHeight = 60;
  const footerHeight = 40;

  useEffect(() => {
    paginateContent();
  }, [content, font, color, paperStyle, isBold, isHeading, isQuestion]);

  useEffect(() => {
    const initialHeaders = {};
    const initialHeaderAlignments = {};
    pages.forEach((page, index) => {
      if (!pageHeaders[index]) {
        initialHeaders[index] = `Notes - ${page.meta.pageNumber}`;
      }
      if (!headerAlignments[index]) {
        initialHeaderAlignments[index] = "center";
      }
    });
    setPageHeaders((prev) => ({ ...prev, ...initialHeaders }));
    setHeaderAlignments((prev) => ({ ...prev, ...initialHeaderAlignments }));
  }, [pages]);

  const paginateContent = () => {
    if (!content) {
      setPages([{ content: "", meta: { pageNumber: 1 } }]);
      return;
    }

    const sections = parseContent(content);

    const writableHeight = 842 - headerHeight - footerHeight;
    const linesPerPage = Math.floor(writableHeight / lineHeight);
    const charsPerLine = 60;
    const charsPerPage = linesPerPage * charsPerLine;

    let pages = [];
    let currentPage = { content: "", meta: { pageNumber: 1, sections: [] } };
    let charCount = 0;
    let lineCount = 0;

    sections.forEach((section) => {
      if (section.type === "code" || section.type === "table") {
        const blockLines = section.text.split("\n").length;

        if (lineCount + blockLines > linesPerPage) {
          pages.push(currentPage);

          currentPage = {
            content: section.text,
            meta: {
              pageNumber: pages.length + 1,
              sections: [{ ...section, startIndex: 0 }],
            },
          };
          charCount = section.text.length;
          lineCount = blockLines;
        } else {
          const startIndex = currentPage.content.length;
          currentPage.content += section.text;

          currentPage.meta.sections.push({
            ...section,
            startIndex,
          });

          charCount += section.text.length;
          lineCount += blockLines;
        }
      } else {
        const sectionLines = section.text.split("\n").length;

        if (
          lineCount + sectionLines > linesPerPage ||
          charCount + section.text.length > charsPerPage
        ) {
          pages.push(currentPage);

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
          const startIndex = currentPage.content.length;
          currentPage.content += section.text;

          currentPage.meta.sections.push({
            ...section,
            startIndex,
          });

          charCount += section.text.length;
          lineCount += sectionLines;
        }
      }
    });

    if (currentPage.content) {
      pages.push(currentPage);
    }

    if (pages.length === 0) {
      pages = [{ content: "", meta: { pageNumber: 1, sections: [] } }];
    }

    setPages(pages);
  };

  const parseContent = (rawContent) => {
    const lines = rawContent.split("\n");
    const sections = [];

    let inTable = false;
    let tableContent = "";
    let tableHeaders = [];

    let inCodeBlock = false;
    let codeContent = "";
    let codeLanguage = "";

    let currentParagraph = "";
    let currentParagraphType = "text";

    const processCurrentParagraph = () => {
      if (currentParagraph.trim()) {
        sections.push({
          text: currentParagraph,
          type: currentParagraphType,
          style: getParagraphStyle(currentParagraphType),
        });
        currentParagraph = "";
        currentParagraphType = "text";
      }
    };

    const getParagraphStyle = (type) => {
      switch (type) {
        case "heading1":
          return { fontSize: "28px", fontWeight: "bold" };
        case "heading2":
          return { fontSize: "24px", fontWeight: "bold" };
        case "heading3":
          return { fontSize: "22px", fontWeight: "bold" };
        case "question":
          return { fontWeight: "bold", color: "#000" };
        case "course":
          return { fontSize: "30px", fontWeight: "bold", color: "#2563eb" };
        default:
          return {};
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = trimmed.substring(3).trim();
          codeContent = "";

          processCurrentParagraph();
        } else {
          inCodeBlock = false;
          sections.push({
            text: codeContent,
            type: "code",
            language: codeLanguage,
            style: { fontFamily: "monospace", fontSize: "16px" },
          });
          codeContent = "";
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + "\n";
        continue;
      }

      if (
        trimmed.indexOf("|") !== -1 &&
        trimmed.lastIndexOf("|") !== trimmed.indexOf("|")
      ) {
        if (!inTable) {
          inTable = true;
          tableContent = line + "\n";

          processCurrentParagraph();

          const headerRow = trimmed
            .split("|")
            .filter((cell) => cell.trim() !== "");
          tableHeaders = headerRow.map((header) => header.trim());
        } else {
          tableContent += line + "\n";
        }
      } else if (inTable) {
        inTable = false;
        sections.push({
          text: tableContent,
          type: "table",
          style: { fontSize: "18px" },
          headers: tableHeaders,
        });
        tableContent = "";
        tableHeaders = [];

        i--;
      } else if (trimmed.match(/^[A-Z]{2,4}\s\d{3}:/)) {
        processCurrentParagraph();
        sections.push({
          text: trimmed + "\n",
          type: "course",
          style: { fontSize: "30px", fontWeight: "bold", color: "#2563eb" },
        });
      } else if (trimmed.match(/^\*\*Q\d+\.\s/) || trimmed.match(/^Q\d+\.\s/)) {
        processCurrentParagraph();
        let questionText = trimmed;

        questionText = questionText.replace(/^\*\*(.+)\*\*$/, "$1");
        sections.push({
          text: questionText + "\n",
          type: "question",
          style: { fontWeight: "bold", color: "#000" },
        });
      } else if (
        trimmed.startsWith("# ") ||
        (trimmed.startsWith("**") &&
          trimmed.endsWith("**") &&
          !trimmed.includes(":"))
      ) {
        processCurrentParagraph();

        let headingText = trimmed
          .replace(/^# /, "")
          .replace(/^\*\*(.+)\*\*$/, "$1");
        sections.push({
          text: headingText + "\n",
          type: "heading1",
          style: { fontSize: "28px", fontWeight: "bold" },
        });
      } else if (trimmed.startsWith("## ")) {
        processCurrentParagraph();
        sections.push({
          text: trimmed.replace(/^## /, "") + "\n",
          type: "heading2",
          style: { fontSize: "24px", fontWeight: "bold" },
        });
      } else if (trimmed.endsWith("?") && trimmed.length < 100) {
        processCurrentParagraph();
        sections.push({
          text: trimmed + "\n",
          type: "question",
          style: { fontWeight: "bold", color: "#000" },
        });
      } else if (trimmed.match(/^\d+\.\s/)) {
        processCurrentParagraph();
        currentParagraph = line + "\n";
        currentParagraphType = "listItem";
      } else {
        if (trimmed === "" && currentParagraph) {
          processCurrentParagraph();
        } else {
          currentParagraph += line + "\n";
        }
      }
    }

    processCurrentParagraph();

    if (inTable && tableContent) {
      sections.push({
        text: tableContent,
        type: "table",
        style: { fontSize: "18px" },
        headers: tableHeaders,
      });
    }

    if (inCodeBlock && codeContent) {
      sections.push({
        text: codeContent,
        type: "code",
        language: codeLanguage,
        style: { fontFamily: "monospace", fontSize: "16px" },
      });
    }

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

  const handleHeaderAlignment = (pageIndex, alignment) => {
    setHeaderAlignments((prev) => ({
      ...prev,
      [pageIndex]: alignment,
    }));
    setShowingControls(null);
  };

  const handleTextAlignment = (lineId, alignment) => {
    setLineAlignments((prev) => ({
      ...prev,
      [lineId]: alignment,
    }));
    setShowingControls(null);
  };

  const handleInlineEdit = (pageIndex, sectionIndex, lineIndex, text) => {
    const uniqueId = `${pageIndex}-${sectionIndex}-${lineIndex}`;
    setEditingLine(uniqueId);
    setEditingContent(text);
  };

  const saveInlineEdit = () => {
    if (!editingLine) return;

    const [pageIndex, sectionIndex, lineIndex] = editingLine
      .split("-")
      .map(Number);
    const page = pages[pageIndex];

    if (page && page.meta && page.meta.sections) {
      const section = page.meta.sections[sectionIndex];

      if (section) {
        const lines = section.text.split("\n");

        if (lineIndex < lines.length) {
          lines[lineIndex] = editingContent;

          const newSectionText = lines.join("\n");

          let newContent = content;
          const startIndex = section.startIndex;
          const endIndex = startIndex + section.text.length;
          newContent =
            newContent.substring(0, startIndex) +
            newSectionText +
            newContent.substring(endIndex);

          setContent(newContent);
        }
      }
    }

    setEditingLine(null);
    setEditingContent("");
  };

  const cancelInlineEdit = () => {
    setEditingLine(null);
    setEditingContent("");
  };

  const handleFormatClick = (format) => {
    switch (format) {
      case "bold":
        setIsBold(!isBold);
        break;
      case "heading":
        setIsHeading(!isHeading);
        setIsQuestion(false);

        if (!isHeading && editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const lineStart = textBefore.lastIndexOf("\n") + 1;

          if (textBefore.substring(lineStart).startsWith("# ")) {
            // Already a heading
          } else if (textBefore.substring(lineStart).startsWith("## ")) {
            const newTextBefore =
              textBefore.substring(0, lineStart) +
              "# " +
              textBefore.substring(lineStart + 3);
            setContent(newTextBefore + textAfter);
          } else {
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
        setIsQuestion(false);

        if (!isHeading && editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const lineStart = textBefore.lastIndexOf("\n") + 1;

          if (textBefore.substring(lineStart).startsWith("## ")) {
            // Already a subheading
          } else if (textBefore.substring(lineStart).startsWith("# ")) {
            const newTextBefore =
              textBefore.substring(0, lineStart) +
              "## " +
              textBefore.substring(lineStart + 2);
            setContent(newTextBefore + textAfter);
          } else {
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
        setIsHeading(false);

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
      case "table":
        if (editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const tableTemplate =
            "\n| Header 1 | Header 2 | Header 3 |\n" +
            "|----------|----------|----------|\n" +
            "| Cell 1   | Cell 2   | Cell 3   |\n" +
            "| Cell 4   | Cell 5   | Cell 6   |\n";

          setContent(textBefore + tableTemplate + textAfter);
        }
        break;
      case "code":
        if (editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const codeTemplate = "\n```python\n# Your code here\n```\n";

          setContent(textBefore + codeTemplate + textAfter);
        }
        break;
      case "course":
        if (editorRef.current) {
          const cursorPos = editorRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const courseTemplate = "\nCOURSE 101: Course Title\n";

          setContent(textBefore + courseTemplate + textAfter);
        }
        break;
      case "lineInputMode":
        setLineInputMode(!lineInputMode);
        break;
    }
  };

  const handlePaste = (e) => {
    const clipboardData = e.clipboardData;
    if (clipboardData && clipboardData.getData) {
      const pastedText = clipboardData.getData("text/plain");

      if (editorRef.current) {
        const cursorPos = editorRef.current.selectionStart;
        const textBefore = content.substring(0, cursorPos);
        const textAfter = content.substring(cursorPos);

        let processedText = pastedText;

        const codeBlockRegex = /^```[\s\S]*?```$/m;
        if (!codeBlockRegex.test(processedText)) {
          const codeLines = processedText
            .split("\n")
            .filter(
              (line) =>
                line.trim().startsWith("# ") ||
                line.includes(" = ") ||
                line.includes("def ") ||
                line.includes("class ") ||
                line.includes("import ") ||
                line.includes("print(")
            );

          if (codeLines.length >= 3 && !processedText.includes("```")) {
            if (
              codeLines.some(
                (line) =>
                  line.includes("def ") ||
                  line.includes("import ") ||
                  line.includes("print(")
              )
            ) {
              processedText = "```python\n" + processedText + "\n```";
            }
          }
        }

        setContent(textBefore + processedText + textAfter);

        e.preventDefault();
      }
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

      const pageElements =
        previewRef.current.querySelectorAll(".page-container");

      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const canvas = await html2canvas(
          pageElements[i].querySelector(".page-content"),
          {
            scale: 2,
            useCORS: true,
            logging: false,
          }
        );

        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        pdf.addImage(imgData, "JPEG", 0, 0, 595, 842);
      }

      pdf.save("handwritten-notes.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  const renderTable = (tableText, fontFamily, fontColor) => {
    const rows = tableText.trim().split("\n");
    if (rows.length < 2) return null;

    const headerCells = rows[0]
      .split("|")
      .filter((cell) => cell.trim() !== "")
      .map((cell) => cell.trim());

    const dataStartIndex = rows[1].includes("-") ? 2 : 1;

    const dataRows = rows.slice(dataStartIndex).map((row) =>
      row
        .split("|")
        .filter((cell) => cell.trim() !== "")
        .map((cell) => cell.trim())
    );

    return (
      <div className="table-container mt-2 mb-2">
        <table
          className="border-collapse w-full"
          style={{ fontFamily, color: fontColor }}
        >
          <thead>
            <tr className="border-b border-gray-400">
              {headerCells.map((cell, i) => (
                <th
                  key={i}
                  className="p-2 text-left"
                  style={{ fontWeight: "bold" }}
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-300">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCodeBlock = (codeText, language, fontFamily, fontColor) => {
    return (
      <div className="code-block-container mt-2 mb-2 rounded bg-gray-100 p-2 overflow-auto">
        <pre
          className="text-sm"
          style={{ fontFamily: "monospace", lineHeight: "1.5" }}
        >
          <code>{codeText}</code>
        </pre>
      </div>
    );
  };

  const renderAlignmentControls = (id) => {
    return (
      <div className="absolute right-0 top-0 bg-blue-50 border border-blue-200 rounded shadow-sm flex gap-1 z-30">
        <button
          className="p-1 hover:bg-blue-100"
          onClick={() => {
            if (id.startsWith("header-")) {
              handleHeaderAlignment(
                parseInt(id.replace("header-", "")),
                "left"
              );
            } else {
              handleTextAlignment(id, "left");
            }
          }}
          title="Align Left"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="15" y2="12"></line>
            <line x1="3" y1="18" x2="18" y2="18"></line>
          </svg>
        </button>
        <button
          className="p-1 hover:bg-blue-100"
          onClick={() => {
            if (id.startsWith("header-")) {
              handleHeaderAlignment(
                parseInt(id.replace("header-", "")),
                "center"
              );
            } else {
              handleTextAlignment(id, "center");
            }
          }}
          title="Center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="6" y1="12" x2="18" y2="12"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </button>
        <button
          className="p-1 hover:bg-blue-100"
          onClick={() => {
            if (id.startsWith("header-")) {
              handleHeaderAlignment(
                parseInt(id.replace("header-", "")),
                "right"
              );
            } else {
              handleTextAlignment(id, "right");
            }
          }}
          title="Align Right"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="9" y1="12" x2="21" y2="12"></line>
            <line x1="6" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    );
  };

  const renderFormattedLine = (line, fontFamily, fontColor, lineId) => {
    let formattedLine = line;

    formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
      return `<strong>${p1}</strong>`;
    });

    formattedLine = formattedLine.replace(/\*(.*?)\*/g, (match, p1) => {
      return `<em>${p1}</em>`;
    });

    formattedLine = formattedLine.replace(/__(.*?)__/g, (match, p1) => {
      return `<u>${p1}</u>`;
    });

    if (formattedLine.match(/^\d+\.\s/)) {
      const number = formattedLine.match(/^\d+/)[0];
      const text = formattedLine.replace(/^\d+\.\s/, "");
      return (
        <div className="flex">
          <span className="mr-2 font-bold">{number}.</span>
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    }

    const alignment = lineAlignments[lineId] || "left";

    return (
      <span
        dangerouslySetInnerHTML={{ __html: formattedLine }}
        style={{ textAlign: alignment, display: "block" }}
      />
    );
  };

  const renderLineInput = (
    pageIndex,
    sectionIndex,
    lineIndex,
    line,
    sectionStyle
  ) => {
    const lineId = `${pageIndex}-${sectionIndex}-${lineIndex}`;
    const alignment = lineAlignments[lineId] || "left";

    return (
      <div key={lineId} className="relative">
        <input
          type="text"
          defaultValue={line}
          style={{
            ...sectionStyle,
            textAlign: alignment,
            border: "none",
            borderBottom: paperStyle !== "blank" ? "none" : "1px dashed #ccc",
            background: "transparent",
            width: "100%",
            outline: "none",
            height: `${lineHeight}px`,
            lineHeight: `${lineHeight}px`,
            padding: "0 4px",
          }}
          className="hover:bg-blue-50 focus:bg-white focus:border-blue-300"
          onBlur={(e) => {
            handleInlineEdit(
              pageIndex,
              sectionIndex,
              lineIndex,
              e.target.value
            );
            saveInlineEdit();
          }}
          onMouseEnter={() => setShowingControls(lineId)}
          onMouseLeave={() => {
            if (showingControls === lineId) {
              setTimeout(() => {
                setShowingControls(null);
              }, 500);
            }
          }}
        />
        {showingControls === lineId && renderAlignmentControls(lineId)}
      </div>
    );
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

        <div className="flex flex-wrap gap-2 mb-4">
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
          <button
            onClick={() => handleFormatClick("table")}
            className="px-2 py-1 rounded border"
            title="Insert Table"
          >
            Table
          </button>
          <button
            onClick={() => handleFormatClick("code")}
            className="px-2 py-1 rounded border"
            title="Insert Code Block"
          >
            Code
          </button>
          <button
            onClick={() => handleFormatClick("course")}
            className="px-2 py-1 rounded border"
            title="Insert Course Header"
          >
            Course
          </button>
          <button
            onClick={() => handleFormatClick("lineInputMode")}
            className={`px-2 py-1 rounded border ${
              lineInputMode ? "bg-blue-100" : ""
            }`}
            title="Toggle Line-by-Line Input Mode"
          >
            Line Input Mode
          </button>
        </div>

        <div className="mb-4">
          {isEditing ? (
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleEditorChange}
              onPaste={handlePaste}
              placeholder="Start typing your text here... 
              
# Use # for main headings
## Use ## for subheadings
End with ? for questions
Regular text for answers
Use | to create tables like:
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

For code blocks:
```python
def example():
    return 'code'
```

For course headers:
COURSE 101: Course Title

For bold text:
**This text will be bold**"
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
                  maxWidth: "595px",
                  height: "842px",
                  boxSizing: "border-box",
                }}
              >
                {/* Header section */}
                <div
                  className="absolute top-0 left-0 right-0 z-20 p-4 border-b"
                  onMouseEnter={() => setShowingControls(`header-${pageIndex}`)}
                  onMouseLeave={() => {
                    if (showingControls === `header-${pageIndex}`) {
                      setTimeout(() => {
                        setShowingControls(null);
                      }, 500);
                    }
                  }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={pageHeaders[pageIndex] || ""}
                      onChange={(e) =>
                        handleHeaderChange(pageIndex, e.target.value)
                      }
                      className="w-full"
                      style={{
                        fontFamily: font,
                        color,
                        fontSize: "18px",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        textAlign:
                          (headerAlignments[pageIndex] as
                            | "left"
                            | "center"
                            | "right") || "center",
                        fontWeight: "bold",
                        height: `${headerHeight - 8}px`,
                      }}
                    />
                    {showingControls === `header-${pageIndex}` &&
                      renderAlignmentControls(`header-${pageIndex}`)}
                  </div>
                </div>

                {/* Paper background based on style */}
                <div
                  className="absolute inset-0"
                  style={{ top: headerHeight, bottom: footerHeight }}
                >
                  {paperStyle === "ruled" && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(#cedbea 1px, transparent 1px)",
                        backgroundSize: `100% ${lineHeight}px`,
                        backgroundPosition: "0 0",
                        zIndex: 0,
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
                        backgroundPosition: "0 0",
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Left margin */}
                  {paperStyle !== "blank" && (
                    <div
                      className="absolute inset-y-0 left-14 border-l border-red-300"
                      style={{ zIndex: 1 }}
                    />
                  )}
                  {paperStyle !== "blank" && (
                    <div
                      className="absolute inset-y-0 left-[59px] border-l border-red-300"
                      style={{ zIndex: 1 }}
                    />
                  )}
                </div>

                {/* Handwritten content with proper formatting */}
                <div className="relative h-full z-10">
                  <div
                    className="p-4 pt-16 pl-16"
                    style={{ paddingBottom: `${footerHeight}px` }}
                  >
                    {page.meta.sections ? (
                      page.meta.sections.map((section, sectionIndex) => {
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
                        } else if (section.type === "course") {
                          sectionStyle = {
                            ...sectionStyle,
                            fontSize: "30px",
                            fontWeight: "bold",
                            color: "#2563eb",
                            marginTop: "8px",
                            marginBottom: "8px",
                          };
                        }

                        if (section.type === "code") {
                          return (
                            <div
                              key={`section-${sectionIndex}`}
                              style={{ marginBottom: "8px" }}
                            >
                              {renderCodeBlock(
                                section.text,
                                section.language,
                                sectionStyle.fontFamily,
                                sectionStyle.color
                              )}
                            </div>
                          );
                        }

                        if (section.type === "table") {
                          return (
                            <div
                              key={`section-${sectionIndex}`}
                              style={{ marginBottom: "8px" }}
                            >
                              {renderTable(
                                section.text,
                                sectionStyle.fontFamily,
                                sectionStyle.color
                              )}
                            </div>
                          );
                        }

                        let displayText = section.text;
                        if (section.type === "heading1") {
                          displayText = displayText.replace(/^# /, "");
                        } else if (section.type === "heading2") {
                          displayText = displayText.replace(/^## /, "");
                        }

                        const lines = displayText.split("\n");

                        return (
                          <div
                            key={`section-${sectionIndex}`}
                            style={{ marginBottom: "4px" }}
                          >
                            {lines.map((line, lineIndex) => {
                              const lineId = `${pageIndex}-${sectionIndex}-${lineIndex}`;

                              if (!line.trim()) return null;

                              if (editingLine === lineId) {
                                return (
                                  <div
                                    key={`line-${lineIndex}`}
                                    className="relative"
                                    style={{ height: `${lineHeight}px` }}
                                  >
                                    <input
                                      type="text"
                                      value={editingContent}
                                      onChange={(e) =>
                                        setEditingContent(e.target.value)
                                      }
                                      style={{
                                        ...sectionStyle,
                                        width: "100%",
                                        height: `${lineHeight}px`,
                                        lineHeight: `${lineHeight}px`,
                                        textAlign:
                                          lineAlignments[lineId] || "left",
                                      }}
                                      className="w-full bg-blue-50 border border-blue-300 outline-none px-2"
                                      autoFocus
                                      onBlur={saveInlineEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveInlineEdit();
                                        if (e.key === "Escape")
                                          cancelInlineEdit();
                                      }}
                                    />
                                  </div>
                                );
                              }

                              // Line-by-line input mode
                              if (lineInputMode) {
                                return renderLineInput(
                                  pageIndex,
                                  sectionIndex,
                                  lineIndex,
                                  line,
                                  sectionStyle
                                );
                              }

                              // Regular display mode with hover controls
                              return (
                                <div
                                  key={`line-${lineIndex}`}
                                  className="relative"
                                  onMouseEnter={() =>
                                    setShowingControls(lineId)
                                  }
                                  onMouseLeave={() => {
                                    if (showingControls === lineId) {
                                      setTimeout(() => {
                                        setShowingControls(null);
                                      }, 500);
                                    }
                                  }}
                                >
                                  <div
                                    style={{
                                      ...sectionStyle,
                                      cursor: "text",
                                      padding: "0 4px",
                                      minHeight: `${lineHeight}px`,
                                      textAlign:
                                        lineAlignments[lineId] || "left",
                                    }}
                                    className="hover:bg-gray-50"
                                    onClick={() =>
                                      handleInlineEdit(
                                        pageIndex,
                                        sectionIndex,
                                        lineIndex,
                                        line
                                      )
                                    }
                                  >
                                    {renderFormattedLine(
                                      line,
                                      sectionStyle.fontFamily,
                                      sectionStyle.color,
                                      lineId
                                    )}
                                  </div>
                                  {showingControls === lineId &&
                                    renderAlignmentControls(lineId)}
                                </div>
                              );
                            })}
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
