from __future__ import annotations
import html
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

def _tokens(text: str) -> set[str]:
    import re
    stop = {"della","delle","degli","dello","alla","alle","agli","allo","con","per","che","del","dei","una","uno","nel","nei","nelle","sul","sui","tra","fra","the","and","job","work"}
    return {x for x in re.findall(r"[a-zà-ù0-9]{3,}", (text or "").lower()) if x not in stop}

def _relevance(exp: dict, job_text: str) -> int:
    jt = _tokens(job_text)
    hay = " ".join([exp.get("title",""), exp.get("company",""), " ".join(exp.get("domains",[])), " ".join(exp.get("bullets",[]))])
    return len(jt & _tokens(hay))

def _skills(profile: dict, job_text: str) -> list[str]:
    base = list(profile.get("skills", [])) or ["Assistenza alla clientela", "Vendita e supporto al cliente", "Rifornimento e sistemazione merce", "Organizzazione del punto vendita", "Ricevimento e movimentazione merci", "Lavoro in team", "Precisione operativa", "Gestione delle priorità"]
    jt = _tokens(job_text)
    return sorted(dict.fromkeys(base), key=lambda s: (-len(_tokens(s) & jt), s.lower()))[:10]

def build_cv(profile: dict, job: dict, output: Path) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    name = ParagraphStyle("name", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=21, spaceAfter=2, alignment=TA_LEFT)
    role = ParagraphStyle("role", parent=styles["Normal"], fontName="Helvetica", fontSize=10.5, leading=13, spaceAfter=5)
    sec = ParagraphStyle("sec", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=14, spaceBefore=6, spaceAfter=4)
    body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica", fontSize=9.4, leading=12.2, spaceAfter=2)
    small = ParagraphStyle("small", parent=body, fontSize=8.7, leading=11)
    title = job.get("title") or "Addetto punto vendita"
    company = job.get("company") or ""
    description = " ".join([title, company, job.get("description", ""), job.get("requirements", "")])
    experiences = list(profile.get("experiences", []))
    experiences.sort(key=lambda e: (-_relevance(e, description), e.get("order", 999)))
    summary = profile.get("summary") or "Professionista con esperienza operativa nel commercio, nel contatto con il pubblico e nell'organizzazione delle attività quotidiane. Abituato a lavorare con precisione, orientamento al cliente, collaborazione con il team e attenzione all'ordine del punto vendita."
    story = [Paragraph(html.escape(profile.get("name", "Candidato")), name), Paragraph(html.escape(title), role), Paragraph(html.escape(" | ".join(x for x in [profile.get("phone",""), profile.get("email",""), profile.get("area","")] if x)), small), Spacer(1, 2*mm), Paragraph("PROFILO PROFESSIONALE", sec), Paragraph(html.escape(summary), body), Paragraph("ESPERIENZA PROFESSIONALE", sec)]
    for exp in experiences:
        head = f"<b>{html.escape(exp.get('title',''))}</b> — {html.escape(exp.get('company',''))}"
        if exp.get("dates"): head += f" <font color='#555555'>| {html.escape(exp['dates'])}</font>"
        block = [Paragraph(head, body)]
        for bullet in exp.get("bullets", [])[:4]: block.append(Paragraph("• " + html.escape(bullet), small))
        block.append(Spacer(1, 1.3*mm)); story.append(KeepTogether(block))
    story.append(Paragraph("COMPETENZE", sec))
    for skill in _skills(profile, description): story.append(Paragraph("• " + html.escape(skill), small))
    if profile.get("education"):
        story.append(Paragraph("FORMAZIONE", sec))
        for item in profile.get("education", [])[:8]: story.append(Paragraph("• " + html.escape(item), small))
    if profile.get("additional"):
        story.append(Paragraph("INFORMAZIONI AGGIUNTIVE", sec))
        for item in profile.get("additional", []): story.append(Paragraph("• " + html.escape(item), small))
    story.append(Paragraph("PRIVACY", sec)); story.append(Paragraph("Autorizzo il trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) e della normativa italiana applicabile.", small))
    doc = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=13*mm, bottomMargin=13*mm, title=f"Curriculum - {title} - {company}")
    doc.build(story); return output
