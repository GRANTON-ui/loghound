# 🐕 LogHound: AI-Powered Log Diagnostics Engine

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success)](#)

LogHound is an AI-powered log analysis tool for developers, SREs, and cybersecurity students. By parsing raw application, database, container, or server logs alongside your connected codebase files, LogHound instantly pinpoints the precise file and line location of errors, isolates the technical root cause, and formulates evidence-backed diagnostics and actionable remediation suggestions.

---

## 🔍 Quick Example

### 1. Ingest Raw Stacktrace
```text
ERROR sqlalchemy.exc.PendingRollbackError: This Session's transaction has been rolled back due to a previous exception in this transaction...
```

### 2. SRE Agent Response
* **Severity Level:** `🚨 CRITICAL`
* **Root Cause:** Database connection pool transaction was not rolled back after an external payment gateway timeout exception occurred.
* **Suggested Fix:** Add a rollback handler inside the exception block before executing any consecutive queries:
  ```python
  try:
      db.session.commit()
  except Exception as e:
      db.session.rollback() # ← Critical missing step
      raise e
  ```

---

## 🏗️ Architecture

```text
       Raw Server Logs + Connected Codebase files
                          ↓
                   Log Sanitizer
       (Scrubs passwords, API keys, and Secrets)
                          ↓
               SRE Prompt Builder Context
                          ↓
                 AI Analysis Engine
       (Triage, Root Cause, Chronological Events)
                          ↓
               Multi-Agent Coordinator
       (Confidence Scoring, Timeline Synthesizer)
                          ↓
        Human-Readable Diagnostics Report UI
```

LogHound uses a modular full-stack architecture where:
- `server.ts` manages the Express server, static assets, and the SRE cooperative analysis pipeline with Google Gemini & OpenRouter APIs.
- `src/App.tsx` renders the modern dashboard, the file/folder upload dropzones, and the dynamic visual timeline.
- `src/utils.ts` handles log scrubbing, telemetry sanitization, and fallback heuristics.

---

## ✨ Features

* **Instant File & Callstack Localization:** Pinpoints exactly where in the source code or framework the failure triggered (File path, Line number, Function, and Context).
* **Multi-Format Log Parser:** Automatically classifies and analyzes multi-line logs, container crashes, database locks, Django validation warning, or raw tracebacks.
* **Intelligent Severity Leveling:** Categorizes logs into four distinct danger levels (**Critical**, **High**, **Medium**, and **Low**) to help prioritize incident responses.
* **Plain English Explanations:** Explains complex nested stack traces and underlying infrastructure crashes in conversational, clear prose.
* **Actionable Solutions & Code Snippets:** Synthesizes actionable, step-by-step resolution scripts, terminal commands, or config updates with side-by-side reference examples.
* **Log Sanitization & Security Protection:** Automatically scrubs raw passwords, secret credentials, or API keys from logs before sending queries to secure APIs.
* **One-Click Export:** Instantly download structured Markdown diagnostics reports for incident tracking or ticket attachments.

---

## 🎨 Screenshot Placeholder

Below is a conceptual layout of the modern dark UI designed for LogHound:

```
+-----------------------------------------------------------------------------+
|  🐾 LogHound AI Log Diagnostics                                              |
+-----------------------------------------------------------------------------+
|  [ Preset: PG Pool Exhausted ] [ Preset: K8s OOM ] [ Preset: Node Import ]  |
+-----------------------------------------------------------------------------+
|  PASTE LOG LINES:                                                           |
|  >> 2026-06-25 10:14:02.128 UTC [4852] FATAL: remaining connection slots... |
|                                                                             |
|  [🐕 RUN DIAGNOSTICS]                                                        |
+-----------------------------------------------------------------------------+
|  🎯 DIAGNOSTICS REPORT                                                      |
|  +-----------------------------------------------------------------------+  |
|  | 🚨 SEVERITY: CRITICAL (Database Pool Exhaustion detected)              |  |
|  +-----------------------------------------------------------------------+  |
|  | 📍 LOCATION: base.py | Line 191 | Postgres Database Connect           |  |
|  |                                                                       |  |
|  | 🔬 ROOT CAUSE: Connection pool max_connections limit exceeded         |  |
|  |                                                                       |  |
|  | 📖 EXPLANATION: Your server is attempting to establish connections to   |  |
|  |    PostgreSQL, but the database has already reached its limits...     |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+
```

---

## 🚀 Quickstart & Installation

Follow these instructions to run LogHound locally on your system using Python.

### Prerequisites

* Python 3.12 or newer
* A Google Gemini API Key or an OpenAI API Key

### 1. Clone & Set Up Directory
Create a project directory or extract files:
```bash
cd loghound
```

### 2. Configure Environment Secrets
Create a `.env` file in the root directory and add your API key:
```env
# Google Gemini API key (Recommended)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"

# OR use standard OpenAI API key
OPENAI_API_KEY="sk-proj-YourOpenAIApiKeyHere"
```

### 3. Install Python Dependencies
Install requirements inside your virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Boot the Streamlit Application
Start the interactive local web dashboard:
```bash
streamlit run app.py
```
This will open up your browser at `http://localhost:8501`.

---

## 📝 Example Log Input

Paste a trace similar to this Kubernetes out-of-memory container failure:

```
Events:
  Type     Reason       Age                    From               Message
  ----     ------       ----                   ----               -------
  Normal   Scheduled    3m20s                  default-scheduler  Successfully assigned web-app-7d9fc to node-12
  Normal   Pulling      3m18s                  kubelet            Pulling image "node:20-alpine"
  Normal   Pulled       3m10s                  kubelet            Successfully pulled image "node:20-alpine" in 8s
  Normal   Created      3m10s                  kubelet            Created container web-server
  Normal   Started      3m09s                  kubelet            Started container web-server
  Warning  BackOff      42s (x8 over 2m15s)   kubelet            Back-off restarting failed container
  Warning  Failed       12s (x3 over 2m30s)   kubelet            Container web-server failed with Exit Code 137 (OOMKilled)
```

---

## 🎯 Example Diagnostics Output

Below is a structured analysis report output by LogHound's backend model:

* **Severity Level:** `🚨 CRITICAL`
* **Error Location:**
  * **File:** `Kubelet Container Runtime`
  * **Line:** `Unknown`
  * **Function:** `web-server`
  * **Context:** `Kubernetes Cluster Node Resource Scheduler`
* **Root Cause Analysis:**
  * **Fault Category:** `Out Of Memory (OOM)`
  * **Technical Summary:** Container crashed with Exit Code 137, indicating it exceeded the hard memory limits assigned inside the pod configuration, triggering a kernel OOM termination.
* **Explanation:**
  The container named `web-server` was terminated by the Kubernetes node scheduler because it tried to consume more RAM than allowed. Exit Code `137` is a standard Unix code where a process is forcefully stopped (`SIGKILL` or signal 9) by the system's memory killer (`128 + 9 = 137`).
* **Recommended Remediations:**
  1. Increase the memory limit values under `resources.limits.memory` inside the pod spec deployment definition.
  2. Profile the application for memory leaks or configure custom garbage collection thresholds.

---

## 📝 Project Status

🟢 **Active Development**

**Current Version:** `v0.1.0-alpha`

### Features Completed:
- **Connected Codebase Context:** Upload or drag-and-drop your workspace directories or individual files to isolate precise line-level source code repairs.
- **SRE Co-operative Agent Engine:** Triages raw log events, maps error callstacks, and provides structured explanations.
- **Visual Chronological Timeline:** Automatically generates elegant step-by-step incident events chronologically.
- **Sanitization Safe-Mode:** Automated regex-based pre-scrubbing of credentials, passwords, and private API keys before context transmission.

### In Development & Planned:
- **VS Code Extension:** Right-click traceback lines in your editor to instantly fetch SRE solutions in a sidebar.
- **Terminal CLI:** A lightweight CLI utility to run `loghound analyze server.log` directly in your terminal.
- **Local LLM Support:** Offline log analysis using quantized LLMs (Llama 3, Mistral) for privacy-first secure environments.
- **Real-time Log Streaming:** Live direct integration with FluentBit, Logstash, or Datadog API ingestion.

---

## 📄 License

This project is licensed under the Apache-2.0 License. See the [LICENSE](./LICENSE) details.

🐾 **LogHound** — Sniffing out error bugs before they bite your uptime.
