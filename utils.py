"""
LogHound Utility Helpers
Provides log sanitization, statistic counting, and result exporting utilities.
"""

import re
from typing import Dict, List, Any

def sanitize_log_content(log_text: str, max_lines: int = 1500) -> str:
    """
    Sanitizes raw log input by removing potential system-sensitive tokens
    (like raw passwords, secret tokens) and caps the length to fit context windows.
    """
    cleaned_lines = []
    lines = log_text.splitlines()
    
    # Cap the logs at max_lines
    if len(lines) > max_lines:
        lines = lines[-max_lines:] # Keep the latest logs which are most relevant
        cleaned_lines.append(f"[LogHound Info: Truncated first {len(lines) - max_lines} lines to optimize analysis context]")
        
    for line in lines:
        # Simple regex replacements to obscure common sensitive token patterns
        line_clean = re.sub(r'(?i)(password|passwd|secret|api_key|apikey|token|private_key)\s*[:=]\s*[^\s]+', r'\1=********', line)
        cleaned_lines.append(line_clean)
        
    return "\n".join(cleaned_lines)

def detect_log_metadata(log_text: str) -> Dict[str, Any]:
    """
    Performs quick client-side heuristics on logs to identify the format or engine,
    such as identifying PostgreSQL, Django, Kubernetes, Spring Boot, Node.js, etc.
    """
    metadata = {
        "engine_guess": "Generic / Raw Text",
        "line_count": len(log_text.splitlines()),
        "has_timestamps": False
    }
    
    # Timestamp regex detection (e.g., ISO8601, syslog format, etc.)
    timestamp_pattern = r'(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})|([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})'
    if re.search(timestamp_pattern, log_text):
        metadata["has_timestamps"] = True
        
    # Language or environment indicators
    if "at " in log_text and (".java:" in log_text or "Exception" in log_text):
        metadata["engine_guess"] = "Java Stack Trace / Spring Boot"
    elif "Traceback (most recent call last):" in log_text or ".py\", line" in log_text:
        metadata["engine_guess"] = "Python Stack Trace"
    elif "at " in log_text and (".js:" in log_text or "node_modules" in log_text):
        metadata["engine_guess"] = "Node.js / JavaScript Stack Trace"
    elif "django." in log_text.lower():
        metadata["engine_guess"] = "Django / Python Web Framework"
    elif "postgres" in log_text.lower() or "postgresql" in log_text.lower():
        metadata["engine_guess"] = "PostgreSQL Database Log"
    elif "nginx" in log_text.lower():
        metadata["engine_guess"] = "Nginx Web Server Log"
    elif "kube" in log_text.lower() or "kubernetes" in log_text.lower():
        metadata["engine_guess"] = "Kubernetes Event Log"
        
    return metadata

def format_report_as_markdown(log_metadata: Dict[str, Any], report: Dict[str, Any]) -> str:
    """
    Formats the structured analysis report dict as a clean, ready-to-copy Markdown document.
    """
    sev_emoji = {
        "Critical": "🚨 CRITICAL",
        "High": "⚠️ HIGH",
        "Medium": "🟡 MEDIUM",
        "Low": "ℹ️ LOW"
    }.get(report.get("severity", "Medium"), "🟡 MEDIUM")
    
    loc = report.get("error_location", {})
    rc = report.get("root_cause_analysis", {})
    
    md = f"""# LogHound Diagnostics Report
**Severity Level:** {sev_emoji}

---

## 🔍 1. Error Location
* **File:** `{loc.get('file', 'Unknown')}`
* **Line:** `{loc.get('line', 'Unknown')}`
* **Function/Module:** `{loc.get('function_or_module', 'Unknown')}`
* **Context:** {loc.get('context', 'Unknown')}

---

## 🎯 2. Root Cause Analysis
* **Category:** **{rc.get('category', 'General Error')}**
* **Technical Summary:** {rc.get('technical_summary', 'No summary available.')}
* **Confidence Level:** `{rc.get('confidence_score', 'N/A')}%`

"""
    if "primary_evidence" in rc and rc["primary_evidence"]:
        md += "### Primary Evidence:\n"
        for item in rc["primary_evidence"]:
            md += f"- {item}\n"
        md += "\n"

    if "factual_classification" in rc and rc["factual_classification"]:
        fc = rc["factual_classification"]
        md += "### Factual Classification Breakdown:\n"
        if fc.get("facts"):
            md += "**Facts (Directly Observable in Logs):**\n"
            for item in fc["facts"]:
                md += f"- {item}\n"
        if fc.get("inferences"):
            md += "**Inferences (Strongly Supported Deductions):**\n"
            for item in fc["inferences"]:
                md += f"- {item}\n"
        if fc.get("hypotheses"):
            md += "**Hypotheses (Possible Explanations Not Fully Proven):**\n"
            for item in fc["hypotheses"]:
                md += f"- {item}\n"
        md += "\n"

    contributors = report.get("secondary_contributors", [])
    if contributors:
        md += "---\n\n## 🤝 3. Secondary Contributors\n"
        for idx, contributor in enumerate(contributors, 1):
            md += f"### {idx}. {contributor.get('title', 'Contributor')}\n"
            md += f"* **Confidence Level:** `{contributor.get('confidence_score', 'N/A')}%`\n"
            if contributor.get("evidence"):
                md += "* **Evidence Used:**\n"
                for item in contributor["evidence"]:
                    md += f"  - {item}\n"
            md += "\n"

    md += f"""---

## 📖 4. Explanation
{report.get('human_readable_explanation', 'No explanation provided.')}

---

## 🔧 5. Suggested Fixes
"""
    for i, fix in enumerate(report.get("suggested_fixes", []), 1):
        md += f"### Fix {i}: {fix.get('title', 'Recommended Fix')}\n"
        for step in fix.get("steps", []):
            md += f"- {step}\n"
        if fix.get("code_example"):
            md += f"\n```\n{fix.get('code_example')}\n```\n"
        md += "\n"
        
    md += "---\n\n## 📋 6. Relevant Log Snippets (Supporting Evidence)\n"
    for snippet in report.get("relevant_log_snippets", []):
        md += f"```\n{snippet}\n```\n"
        
    md += f"\n---\n*Report generated by LogHound. Log Profile: {log_metadata.get('engine_guess', 'Generic')}.*"
    return md
