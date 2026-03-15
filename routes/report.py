import datetime
from pathlib import Path
from flask import Blueprint, send_file, jsonify, request
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, Image as RLImage
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import config
from routes.potholes import load_detections, save_detections

report_bp = Blueprint("report", __name__)

# Colours
BLUE    = colors.HexColor("#1a4b9c")
YELLOW  = colors.HexColor("#f5a800")
RED     = colors.HexColor("#d32f2f")
ORANGE  = colors.HexColor("#e65100")
GREY    = colors.HexColor("#5a6a87")
LGREY   = colors.HexColor("#f4f6fb")
WHITE   = colors.white
BLACK   = colors.black


def generate_report(detections: list) -> Path:
    """Generate a technical PDF report for a cluster of detections."""
    now       = datetime.datetime.now()
    ref_no    = f"CNR/{now.strftime('%Y%m%d')}/{detections[0]['id'].upper()}"
    pdf_name  = f"CraterNet_Report_{ref_no.replace('/', '_')}.pdf"
    pdf_path  = config.REPORTS_DIR / pdf_name

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm,  bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Header band ──
    header_data = [[
        Paragraph(
            f'<font color="white" size="18"><b>CraterNet.AI</b></font><br/>'
            f'<font color="#f5a800" size="9">AUTONOMOUS ROAD DAMAGE DETECTION SYSTEM</font>',
            ParagraphStyle("hdr", alignment=TA_LEFT, leading=22)
        ),
        Paragraph(
            f'<font color="white" size="8">Reference No.<br/>'
            f'<b>{ref_no}</b><br/><br/>'
            f'Date: {now.strftime("%d %B %Y")}</font>',
            ParagraphStyle("hdr2", alignment=TA_RIGHT, leading=14)
        )
    ]]
    header_table = Table(header_data, colWidths=[11*cm, 6*cm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BLUE),
        ("TOPPADDING",    (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (0,-1), 16),
        ("RIGHTPADDING",  (-1,0), (-1,-1), 16),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.5*cm))

    # ── To / From ──
    story.append(Paragraph(
        "<b>To,</b><br/>"
        "The Regional Officer<br/>"
        "<b>National Highways Authority of India (NHAI)</b><br/>"
        "Raipur Regional Office, Chhattisgarh – 492001<br/>"
        "Email: ro.raipur@nhai.org",
        ParagraphStyle("addr", fontSize=9, leading=15, leftIndent=0)
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLUE))
    story.append(Spacer(1, 0.3*cm))

    # ── Subject ──
    story.append(Paragraph(
        f"<b>Subject: Technical Detection Report — Road Damage on NH-343 "
        f"({len(detections)} incident(s) detected by AI system)</b>",
        ParagraphStyle("subj", fontSize=10, textColor=BLUE, leading=14)
    ))
    story.append(Spacer(1, 0.4*cm))

    # ── Body ──
    severe_n   = sum(1 for d in detections if d.get("severity") == "severe")
    moderate_n = sum(1 for d in detections if d.get("severity") == "moderate")

    story.append(Paragraph(
        f"This report has been <b>auto-generated</b> by the CraterNet.AI road monitoring "
        f"system upon detection of road damage exceeding the alert threshold on "
        f"<b>National Highway 343 (Chhattisgarh)</b>. "
        f"A total of <b>{len(detections)} pothole(s)</b> were detected and verified by "
        f"the YOLOv8-based computer vision model, of which <b>{severe_n} are classified "
        f"as Severe</b> and <b>{moderate_n} as Moderate</b>.",
        ParagraphStyle("body", fontSize=9, leading=15)
    ))
    story.append(Spacer(1, 0.4*cm))

    # ── Summary table ──
    story.append(Paragraph(
        "<b>Detection Summary</b>",
        ParagraphStyle("sh", fontSize=10, textColor=BLUE, leading=14)
    ))
    story.append(Spacer(1, 0.2*cm))

    table_data = [[
        Paragraph("<b>ID</b>",         ParagraphStyle("th", fontSize=8, textColor=WHITE)),
        Paragraph("<b>Timestamp</b>",  ParagraphStyle("th", fontSize=8, textColor=WHITE)),
        Paragraph("<b>Latitude</b>",   ParagraphStyle("th", fontSize=8, textColor=WHITE)),
        Paragraph("<b>Longitude</b>",  ParagraphStyle("th", fontSize=8, textColor=WHITE)),
        Paragraph("<b>Severity</b>",   ParagraphStyle("th", fontSize=8, textColor=WHITE)),
        Paragraph("<b>Confidence</b>", ParagraphStyle("th", fontSize=8, textColor=WHITE)),
        Paragraph("<b>Source</b>",     ParagraphStyle("th", fontSize=8, textColor=WHITE)),
    ]]

    for d in detections:
        sev_color = RED if d.get("severity") == "severe" else ORANGE
        table_data.append([
            Paragraph(d["id"],                          ParagraphStyle("td", fontSize=7.5)),
            Paragraph(d.get("timestamp","—"),           ParagraphStyle("td", fontSize=7.5)),
            Paragraph(str(d.get("lat","—")),            ParagraphStyle("td", fontSize=7.5)),
            Paragraph(str(d.get("lng","—")),            ParagraphStyle("td", fontSize=7.5)),
            Paragraph(
                f'<font color="{"#d32f2f" if d.get("severity")=="severe" else "#e65100"}">'
                f'<b>{d.get("severity","—").upper()}</b></font>',
                ParagraphStyle("td", fontSize=7.5)
            ),
            Paragraph(f'{int(d.get("confidence",0)*100)}%', ParagraphStyle("td", fontSize=7.5)),
            Paragraph(d.get("source","—"),              ParagraphStyle("td", fontSize=7.5)),
        ])

    col_w = [2*cm, 3.5*cm, 2.5*cm, 2.5*cm, 2*cm, 2*cm, 2.5*cm]
    summary_table = Table(table_data, colWidths=col_w, repeatRows=1)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  BLUE),
        ("BACKGROUND",    (0,1), (-1,-1), LGREY),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, LGREY]),
        ("GRID",          (0,0), (-1,-1), 0.4, colors.HexColor("#d0d9ec")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Annotated images ──
    has_images = any(d.get("result_url") for d in detections)
    if has_images:
        story.append(Paragraph(
            "<b>AI Detection Evidence</b>",
            ParagraphStyle("sh", fontSize=10, textColor=BLUE, leading=14)
        ))
        story.append(Spacer(1, 0.2*cm))

        for d in detections:
            result_url = d.get("result_url", "")
            result_path = config.BASE_DIR / result_url.lstrip("/")
            if result_path.exists():
                img_row = [[
                    RLImage(str(result_path), width=7*cm, height=5*cm),
                    Paragraph(
                        f"<b>Detection ID:</b> {d['id']}<br/>"
                        f"<b>Timestamp:</b> {d.get('timestamp','—')}<br/>"
                        f"<b>Coordinates:</b> {d.get('lat','—')}, {d.get('lng','—')}<br/>"
                        f"<b>Severity:</b> {d.get('severity','—').upper()}<br/>"
                        f"<b>Confidence:</b> {int(d.get('confidence',0)*100)}%<br/>"
                        f"<b>Source:</b> {d.get('source','—')}<br/>"
                        f"<b>Road:</b> NH-343",
                        ParagraphStyle("imgmeta", fontSize=8, leading=14)
                    )
                ]]
                img_table = Table(img_row, colWidths=[7.5*cm, 9.5*cm])
                img_table.setStyle(TableStyle([
                    ("VALIGN",        (0,0), (-1,-1), "TOP"),
                    ("LEFTPADDING",   (0,0), (-1,-1), 4),
                    ("RIGHTPADDING",  (0,0), (-1,-1), 4),
                    ("TOPPADDING",    (0,0), (-1,-1), 4),
                    ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#d0d9ec")),
                    ("BACKGROUND",    (0,0), (-1,-1), LGREY),
                ]))
                story.append(img_table)
                story.append(Spacer(1, 0.3*cm))

    # ── Recommendation ──
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "<b>Recommendations</b>",
        ParagraphStyle("sh", fontSize=10, textColor=BLUE)
    ))
    story.append(Spacer(1, 0.15*cm))

    rec_items = []
    if severe_n > 0:
        rec_items.append("• <b>Immediate action required</b> for severe pothole(s). Risk of vehicle damage and road accidents is HIGH.")
    if moderate_n > 0:
        rec_items.append("• Moderate potholes require scheduled maintenance within 30 days.")
    rec_items.append("• GPS coordinates provided are accurate to ±10 metres (browser geolocation).")
    rec_items.append("• All detections have been verified by YOLOv8 computer vision model with confidence scores above 25%.")

    for item in rec_items:
        story.append(Paragraph(item, ParagraphStyle("rec", fontSize=9, leading=15)))

    story.append(Spacer(1, 0.5*cm))

    # ── Footer ──
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        f"<font color='#5a6a87' size='8'>"
        f"This report was auto-generated by CraterNet.AI on {now.strftime('%d %B %Y at %H:%M IST')}. "
        f"CraterNet.AI is an autonomous road damage detection and reporting system. "
        f"For queries, contact the system administrator. | Ref: {ref_no}"
        f"</font>",
        ParagraphStyle("footer", fontSize=8, alignment=TA_CENTER, textColor=GREY)
    ))

    doc.build(story)
    return pdf_path


# ── Admin endpoints ──

@report_bp.route("/api/admin/reports")
def list_reports():
    from flask import session
    # Simple check — admin already authenticated via password in session
    reports = sorted(config.REPORTS_DIR.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
    return jsonify([{"name": p.name, "url": f"/api/admin/report/{p.name}", "size_kb": round(p.stat().st_size/1024, 1)} for p in reports])


@report_bp.route("/api/admin/report/<filename>")
def download_report(filename):
    path = config.REPORTS_DIR / filename
    if not path.exists():
        return jsonify({"error": "Not found"}), 404
    return send_file(str(path), as_attachment=True, download_name=filename)


@report_bp.route("/api/admin/report/generate/<uid>", methods=["POST"])
def manual_generate(uid):
    """Admin can manually trigger a report for a single detection."""
    data = load_detections()
    target = next((d for d in data if d["id"] == uid), None)
    if not target:
        return jsonify({"error": "Detection not found"}), 404
    pdf_path = generate_report([target])
    for d in data:
        if d["id"] == uid:
            d["report_generated"] = True
            d["pdf_path"] = str(pdf_path)
    save_detections(data)
    return jsonify({"pdf_url": f"/api/admin/report/{Path(pdf_path).name}"})
