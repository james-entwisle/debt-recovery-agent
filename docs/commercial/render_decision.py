"""Render the two-page decision note. Requires reportlab and pypdf."""
import html
import re
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output/pdf/DECISION.pdf"


def inline(text):
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = html.escape(text)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    body = ParagraphStyle("Body", fontName="Helvetica", fontSize=11, leading=13.6,
                          spaceAfter=6, textColor=colors.HexColor("#17212b"))
    title = ParagraphStyle("Title", parent=body, fontName="Helvetica-Bold", fontSize=19,
                           leading=22, spaceAfter=9)
    heading = ParagraphStyle("Heading", parent=body, fontName="Helvetica-Bold", fontSize=12,
                             leading=15, spaceBefore=7, spaceAfter=5, keepWithNext=True)
    table_body = ParagraphStyle("Table", parent=body, fontSize=9.6, leading=12, spaceAfter=0)
    story = []
    paragraph = []
    lines = (ROOT / "DECISION.md").read_text().splitlines()

    def flush():
        if paragraph:
            story.append(Paragraph(inline(" ".join(paragraph)), body))
            paragraph.clear()

    index = 0
    while index < len(lines):
        line = lines[index]
        if line.startswith("|"):
            flush()
            rows = []
            while index < len(lines) and lines[index].startswith("|"):
                cells = [c.strip() for c in lines[index].strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", c) for c in cells):
                    rows.append([Paragraph(inline(c), table_body) for c in cells])
                index += 1
            table = Table(rows, colWidths=[158, 113, 118, 105], repeatRows=1, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf2f5")),
                ("LINEBELOW", (0, 0), (-1, 0), 0.7, colors.HexColor("#aebbc5")),
                ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#dce3e8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            story += [table, Spacer(1, 7)]
            continue
        if line == "<!-- pagebreak -->":
            flush()
            story.append(PageBreak())
        elif line.startswith("# "):
            flush()
            story.append(Paragraph(inline(line[2:]), title))
        elif line.startswith("## "):
            flush()
            story.append(Paragraph(inline(line[3:]), heading))
        elif not line.strip():
            flush()
        else:
            paragraph.append(line)
        index += 1
    flush()

    def footer(canvas, document):
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#586573"))
        canvas.drawString(50, 29, "InDebted case study | Synthetic exercise | 22 October 2026")
        canvas.drawRightString(A4[0] - 50, 29, str(document.page))

    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=50, rightMargin=50,
                            topMargin=43, bottomMargin=43, title="Adaptive Resolution investment recommendation",
                            author="James Entwisle")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    pages = len(PdfReader(OUTPUT).pages)
    print(f"{OUTPUT}: {pages} pages, 11pt body text")
    if pages != 2:
        raise SystemExit("Decision note must fit exactly two readable pages. Edit DECISION.md and rerender.")


if __name__ == "__main__":
    build()
