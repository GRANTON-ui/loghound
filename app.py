"""
LogHound Streamlit Frontend Application
Provides a polished, feature-rich web dashboard in Python for real-time log analysis.
"""

import streamlit as st
import os
from dotenv import load_dotenv

from analyzer import LogAnalyzer
import utils

# Load env variables
load_dotenv()

# Page Configuration
st.set_page_config(
    page_title="LogHound | AI-Powered Log Diagnostics",
    page_icon="🐾",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Force Dark/Modern Theme)
st.markdown("""
<style>
    /* Dark Slate modern panel styling */
    .reportview-container {
        background: #0f172a;
    }
    .severity-critical {
        padding: 10px;
        background-color: #7f1d1d;
        border-left: 5px solid #ef4444;
        color: #fee2e2;
        border-radius: 4px;
        margin-bottom: 15px;
    }
    .severity-high {
        padding: 10px;
        background-color: #7c2d12;
        border-left: 5px solid #f97316;
        color: #ffedd5;
        border-radius: 4px;
        margin-bottom: 15px;
    }
    .severity-medium {
        padding: 10px;
        background-color: #713f12;
        border-left: 5px solid #eab308;
        color: #fef9c3;
        border-radius: 4px;
        margin-bottom: 15px;
    }
    .severity-low {
        padding: 10px;
        background-color: #1e293b;
        border-left: 5px solid #64748b;
        color: #f1f5f9;
        border-radius: 4px;
        margin-bottom: 15px;
    }
    .section-header {
        color: #f8fafc;
        border-bottom: 1px solid #334155;
        padding-bottom: 5px;
        margin-top: 25px;
    }
</style>
""", unsafe_allow_html=True)

# Sample Logs dictionary for user convenience
SAMPLE_LOGS = {
    "PostgreSQL Connection Pool Exhausted": """2026-06-25 10:14:02.128 UTC [4852] FATAL: remaining connection slots are reserved for non-replication superuser connections
2026-06-25 10:14:02.128 UTC [4852] DETAIL: Connection pool max_connections limit of 100 exceeded.
2026-06-25 10:14:02.135 UTC [4901] ERROR: database connection failed in django.db.backends.postgresql
Traceback (most recent call last):
  File "django/db/backends/base/base.py", line 220, in ensure_connection
    self.connect()
  File "django/db/backends/postgresql/base.py", line 191, in connect
    connection = Database.connect(**conn_params)
psycopg2.OperationalError: FATAL: remaining connection slots are reserved for non-replication superuser connections""",

    "Kubernetes Out-of-Memory (OOM) Crash": """Events:
  Type     Reason       Age                    From               Message
  ----     ------       ----                   ----               -------
  Normal   Scheduled    3m20s                  default-scheduler  Successfully assigned web-app-7d9fc to node-12
  Normal   Pulling      3m18s                  kubelet            Pulling image "node:20-alpine"
  Normal   Pulled       3m10s                  kubelet            Successfully pulled image "node:20-alpine" in 8s
  Normal   Created      3m10s                  kubelet            Created container web-server
  Normal   Started      3m09s                  kubelet            Started container web-server
  Warning  BackOff      42s (x8 over 2m15s)   kubelet            Back-off restarting failed container
  Warning  Failed       12s (x3 over 2m30s)   kubelet            Container web-server failed with Exit Code 137 (OOMKilled)""",

    "Django CSRF Validation Failure": """[25/Jun/2026 13:02:18] WARNING [django.security.csrf:224] Forbidden (CSRF cookie not set.): /api/v1/payment/submit
[25/Jun/2026 13:02:18] "POST /api/v1/payment/submit HTTP/1.1" 403 2871
Traceback (most recent call last):
  File "django/core/handlers/exception.py", line 55, in inner
    response = get_response(request)
  File "django/core/handlers/base.py", line 197, in _get_response
    response = wrapped_callback(request, *callback_args, **callback_kwargs)
django.core.exceptions.PermissionDenied: CSRF cookie not set.""",

    "Node.js SyntaxError (Broken Import)": """node:internal/modules/cjs/loader:1144
  throw err;
  ^

Error: Cannot find module './routes/billing'
Require stack:
- /usr/src/app/server.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1140:15)
    at Module._load (node:internal/modules/cjs/loader:981:27)
    at Module.require (node:internal/modules/cjs/loader:1144:19)
    at require (node:internal/modules/helpers:121:18)
    at Object.<anonymous> (/usr/src/app/server.js:14:17)
    at Module._compile (node:internal/modules/cjs/loader:1255:14)"""
}

# Sidebar Info and Config
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1601758124540-12d960087c3d?q=80&w=200&auto=format&fit=crop", caption="LogHound SRE Assistant", width=200)
    st.title("🐕 LogHound Settings")
    st.write("An intelligent, high-fidelity log analysis companion.")
    
    st.subheader("🔑 API Setup")
    # API key field
    env_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
    api_key_input = st.text_input(
        "Enter API Key", 
        value=env_key, 
        type="password",
        help="Paste your Gemini or OpenAI API key here. Defaults to environment variable if set."
    )
    
    st.subheader("⚙️ Engine Customization")
    model_option = st.selectbox(
        "Select AI Model",
        ["gemini-2.5-flash", "gpt-4o-mini", "gpt-4o"],
        index=0,
        help="We recommend Gemini models for incredibly fast, detailed, and highly reliable technical reports."
    )
    
    st.info("💡 Tip: Selecting from the template presets in the main panel will automatically paste actual server logs into the analysis area!")

# Main Panel
st.title("🐾 LogHound AI Log Diagnostics")
st.write("Detect hidden error roots, file locations, severity risks, and get actionable code solutions instantly.")

# Presets Column
preset_cols = st.columns(4)
selected_preset_log = ""

for idx, (title, raw_log) in enumerate(SAMPLE_LOGS.items()):
    with preset_cols[idx % 4]:
        if st.button(f"📋 {title}", key=f"btn_preset_{idx}"):
            selected_preset_log = raw_log
            st.session_state["log_input"] = raw_log

# Log paste text area
log_input_placeholder = "Paste raw stack traces, web server error outputs, syslogs, Kubernetes logs, or database crash traces here..."
log_text = st.text_area(
    "📝 Paste your Logs below:",
    value=selected_preset_log or st.session_state.get("log_input", ""),
    height=250,
    placeholder=log_input_placeholder,
    key="log_input_area"
)

# Keep session_state synced
if log_text:
    st.session_state["log_input"] = log_text

col_action, col_clear = st.columns([1, 8])
with col_action:
    analyze_btn = st.button("🐕 Run Diagnostics", type="primary", use_container_width=True)
with col_clear:
    if st.button("🧹 Clear Logs", use_container_width=False):
        st.session_state["log_input"] = ""
        st.rerun()

# Run Diagnostics Trigger
if analyze_btn:
    if not log_text.strip():
        st.warning("⚠️ Please paste some log lines to begin!")
    elif not api_key_input:
        st.error("🔑 API Key is required. Please set it in the sidebar settings or .env file.")
    else:
        with st.spinner("🐾 LogHound is sniffing through logs, resolving callstacks, and tracing error lines..."):
            try:
                # Setup analyzer
                # Auto-resolve API type based on keys
                analyzer = LogAnalyzer(
                    api_key=api_key_input,
                    model=model_option
                )
                
                # Perform basic analytics
                log_meta = utils.detect_log_metadata(log_text)
                
                # Run AI Diagnostics
                report = analyzer.analyze_logs(log_text)
                
                st.success("✨ Diagnostics Complete!")
                
                # Result dashboard
                st.header("🎯 Log Diagnostics Report")
                
                # Severity Indicator
                severity = report.get("severity", "Medium")
                severity_classes = {
                    "Critical": "severity-critical",
                    "High": "severity-high",
                    "Medium": "severity-medium",
                    "Low": "severity-low"
                }
                sev_class = severity_classes.get(severity, "severity-medium")
                
                st.markdown(f"""
                <div class="{sev_class}">
                    <h3>🚨 Severity Risk: {severity.upper()}</h3>
                    <p><b>Analysis Profile:</b> {log_meta['engine_guess']} | {log_meta['line_count']} log lines parsed</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 2-Column Overview
                col_loc, col_cause = st.columns(2)
                
                with col_loc:
                    st.subheader("📍 Error Location Details")
                    loc = report.get("error_location", {})
                    st.markdown(f"""
                    * **Target File:** `{loc.get('file', 'Unknown')}`
                    * **Line Number:** `{loc.get('line', 'Unknown')}`
                    * **Function/Module:** `{loc.get('function_or_module', 'Unknown')}`
                    * **Execution Context:** *{loc.get('context', 'Unknown')}*
                    """)
                    
                with col_cause:
                    st.subheader("🔬 Primary Root Cause")
                    rc = report.get("root_cause_analysis", {})
                    st.markdown(f"""
                    * **Fault Category:** `{rc.get('category', 'General Error')}`
                    * **Technical Description:** {rc.get('technical_summary', 'No further details.')}
                    """)
                
                # Human Readable Explanation
                st.subheader("📖 Plain English Explanation")
                st.info(report.get("human_readable_explanation", "No description generated."))
                
                # Suggested Fixes
                st.subheader("🔧 Suggested Resolutions & Code Remediation")
                for i, fix in enumerate(report.get("suggested_fixes", []), 1):
                    with st.expander(f"Fix {i}: {fix.get('title', 'Recommended Fix')}", expanded=True):
                        cols_fix = st.columns([3, 2])
                        with cols_fix[0]:
                            st.write("**Actionable Steps:**")
                            for step in fix.get("steps", []):
                                st.markdown(f"- {step}")
                        with cols_fix[1]:
                            if fix.get("code_example"):
                                st.write("**Reference Solution:**")
                                st.code(fix.get("code_example"))
                                
                # Relevant log snippets
                st.subheader("📋 Related Stack Trace Lines")
                for snippet in report.get("relevant_log_snippets", []):
                    st.code(snippet)
                    
                # Download Report Button
                report_md = utils.format_report_as_markdown(log_meta, report)
                
                st.download_button(
                    label="📥 Export Report as Markdown",
                    data=report_md,
                    file_name="loghound_diagnostics_report.md",
                    mime="text/markdown"
                )
                
            except Exception as ex:
                st.exception(ex)
