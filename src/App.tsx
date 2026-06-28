import React, { useState, useRef, useEffect } from "react";
import { 
  Terminal, 
  Trash2, 
  Play, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  Code, 
  Cpu, 
  UploadCloud, 
  Layers, 
  Clock, 
  Compass, 
  Server,
  ChevronDown,
  ShieldCheck,
  Eye,
  Users,
  Network,
  Activity,
  ExternalLink,
  Monitor,
  FileCode,
  CheckCircle,
  Settings,
  X,
  Plus,
  ArrowRight,
  Globe,
  Key,
  ShieldAlert,
  History,
  EyeOff,
  Lock,
  Unlock
} from "lucide-react";
import { 
  PRESETS, 
  SAMPLE_REPORT, 
  LogMetadata, 
  Fix, 
  DiagnosticsReport 
} from "./presets";
import { 
  sanitizeLogs, 
  HistoryManager, 
  IncidentHistoryItem, 
  SanitizationResult,
  parseTracebackDynamically
} from "./utils";

interface CodebaseFile {
  name: string;
  content: string;
  size: number;
}

export default function App() {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Codebase files context states & refs
  const [codebaseFiles, setCodebaseFiles] = useState<CodebaseFile[]>([]);
  const codebaseFileInputRef = useRef<HTMLInputElement>(null);
  const codebaseFolderInputRef = useRef<HTMLInputElement>(null);

  // Sanitization & Safe Mode states
  const [safeMode, setSafeMode] = useState<boolean>(true);
  const [sanitizationResult, setSanitizationResult] = useState<SanitizationResult | null>(null);
  const [incidentHistory, setIncidentHistory] = useState<IncidentHistoryItem[]>([]);

  // Run real-time client-side sanitization when logs or safeMode changes
  useEffect(() => {
    if (safeMode && logs.trim()) {
      const result = sanitizeLogs(logs);
      setSanitizationResult(result);
    } else {
      setSanitizationResult(null);
    }
  }, [logs, safeMode]);

  // Dynamic Provider & Models States
  const [provider, setProvider] = useState<"openrouter" | "openai" | "anthropic" | "gemini">("openrouter");
  const [apiKey, setApiKey] = useState<string>("");
  const [activeModel, setActiveModel] = useState<string>("google/gemma-2-9b-it:free");
  const [customModels, setCustomModels] = useState<string[]>([
    "google/gemma-2-9b-it:free",
    "google/gemini-2.5-flash",
    "meta-llama/llama-3-8b-instruct:free",
    "deepseek/deepseek-chat"
  ]);

  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [newModelId, setNewModelId] = useState<string>("");
  const [diagnosticDuration, setDiagnosticDuration] = useState<number | null>(null);

  // Tab controller: "report" | "timeline" | "dependency"
  const [activeTab, setActiveTab] = useState<"report" | "timeline" | "dependency">("report");
  const [selectedNode, setSelectedNode] = useState<string | null>("application");

  // Load local configurations & incident history & check server keys
  useEffect(() => {
    setIncidentHistory(HistoryManager.getHistory());
    
    // Check if server already has keys configured
    fetch("/api/config")
      .then((res) => res.json())
      .then((srvConfig) => {
        const saved = localStorage.getItem("loghound_config");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.provider) setProvider(parsed.provider);
            if (parsed.apiKey) setApiKey(parsed.apiKey);
            if (parsed.activeModel) setActiveModel(parsed.activeModel);
            if (parsed.customModels) setCustomModels(parsed.customModels);
            if (parsed.demoMode !== undefined) {
              setDemoMode(parsed.demoMode);
              // Only skip onboarding if there's a key OR demo mode is true OR server-side key is active
              if (parsed.apiKey || parsed.demoMode === true || srvConfig.hasGeminiKey) {
                setShowOnboarding(false);
              }
            }
          } catch (e) {
            console.error("Failed to load local config", e);
          }
        } else {
          // No saved configuration, let's auto-configure if a server-side Gemini key is present!
          if (srvConfig.hasGeminiKey) {
            setProvider("gemini");
            setActiveModel("gemini-2.5-flash");
            setDemoMode(false);
            setShowOnboarding(false);
            // Save this initial config
            const config = {
              provider: "gemini" as const,
              apiKey: "",
              activeModel: "gemini-2.5-flash",
              customModels: [
                "google/gemma-2-9b-it:free",
                "google/gemini-2.5-flash",
                "meta-llama/llama-3-8b-instruct:free",
                "deepseek/deepseek-chat"
              ],
              demoMode: false
            };
            localStorage.setItem("loghound_config", JSON.stringify(config));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to check server config", err);
        // Fallback to local-only configuration load
        const saved = localStorage.getItem("loghound_config");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.provider) setProvider(parsed.provider);
            if (parsed.apiKey) setApiKey(parsed.apiKey);
            if (parsed.activeModel) setActiveModel(parsed.activeModel);
            if (parsed.customModels) setCustomModels(parsed.customModels);
            if (parsed.demoMode !== undefined) {
              setDemoMode(parsed.demoMode);
              if (parsed.apiKey || parsed.demoMode === true) {
                setShowOnboarding(false);
              }
            }
          } catch (e) {
            console.error("Failed to load local config", e);
          }
        }
      });
  }, []);

  const saveConfig = (
    newProvider: "openrouter" | "openai" | "anthropic" | "gemini",
    newKey: string,
    newModel: string,
    newCustomList: string[],
    isDemo: boolean
  ) => {
    const config = {
      provider: newProvider,
      apiKey: newKey,
      activeModel: newModel,
      customModels: newCustomList,
      demoMode: isDemo
    };
    localStorage.setItem("loghound_config", JSON.stringify(config));
    
    setProvider(newProvider);
    setApiKey(newKey);
    setActiveModel(newModel);
    setCustomModels(newCustomList);
    setDemoMode(isDemo);
    setShowSettings(false);
    setShowOnboarding(false);
  };

  // Client-side log diagnostics metadata
  const getHeuristics = (txt: string): LogMetadata => {
    let engineGuess = "Generic Server Stream";
    const lineCount = txt.split(/\r?\n/).length;
    const hasTimestamps = /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})|([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/.test(txt);

    if (txt.includes("at ") && (txt.includes(".java:") || txt.includes("Exception"))) {
      engineGuess = "Spring Boot Exception";
    } else if (txt.includes("Traceback (most recent call last):") || txt.includes('.py", line')) {
      engineGuess = "Django / Python Stacktrace";
    } else if (txt.includes("at ") && (txt.includes(".js:") || txt.includes("node_modules"))) {
      engineGuess = "Node.js / V8 Stacktrace";
    } else if (/postgres|postgresql/i.test(txt)) {
      engineGuess = "PostgreSQL DB logs";
    } else if (/nginx/i.test(txt)) {
      engineGuess = "Nginx Web Router";
    } else if (/kube|kubernetes/i.test(txt)) {
      engineGuess = "Kubernetes Pod Event";
    }

    return { engineGuess, lineCount, hasTimestamps };
  };

  const metadata = logs.trim() ? getHeuristics(logs) : null;

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogs(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogs(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCodebaseFilesUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      // Limit file size to 800KB to protect AI context lengths
      if (file.size > 800000) return;
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      const binaryExtensions = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'gz', 'tar', 'exe', 'dll', 'so', 'db', 'sqlite', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'mp3', 'wav', 'svg'];
      if (ext && binaryExtensions.includes(ext)) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const relativePath = file.webkitRelativePath || file.name;
          setCodebaseFiles((prev) => {
            if (prev.some((f) => f.name === relativePath)) {
              return prev;
            }
            return [...prev, {
              name: relativePath,
              content: event.target!.result as string,
              size: file.size
            }];
          });
        }
      };
      reader.readAsText(file);
    });
  };

  // Run AI cooperative diagnostics
  const runDiagnostics = async () => {
    if (!logs.trim()) {
      setError("Please paste or upload logs before running diagnostics.");
      return;
    }

    const startTime = Date.now();
    setLoading(true);
    setError(null);
    setReport(null);
    setActiveTab("report");

    const finalLogsForAnalysis = safeMode ? sanitizeLogs(logs).sanitized : logs;

    // Live backend endpoint parsing or offline simulated demo run
    if (demoMode && !apiKey.trim()) {
      setTimeout(() => {
        let matchedReport = SAMPLE_REPORT;
        const lowerLogs = finalLogsForAnalysis.toLowerCase();

        if (lowerLogs.includes("oomkilled") || lowerLogs.includes("exit code 137") || lowerLogs.includes("kubernetes")) {
          matchedReport = {
            severity: "Critical",
            error_location: {
              file: "Kubernetes Orchestrator / kubelet",
              line: "N/A",
              function_or_module: "ContainerRuntime",
              context: "Pod: web-app-7d9fc (Container: web-server)"
            },
            root_cause_analysis: {
              category: "Out of Memory (OOMKilled)",
              technical_summary: "The container 'web-server' exceeded its allocated memory limits (OOM limit) in Kubernetes, resulting in kernel signal termination (Exit Code 137). This is caused by unbounded heap usage under load.",
              confidence_score: 98,
              primary_evidence: [
                "Container web-server failed with Exit Code 137 (OOMKilled)"
              ],
              factual_classification: {
                facts: [
                  "Kubelet emitted 'OOMKilled' warning log entries",
                  "Container web-server terminated with code 137"
                ],
                inferences: [
                  "The container is configured with insufficient memory limit constraints",
                  "Application has unoptimized garbage collection cycles"
                ],
                hypotheses: [
                  "Long-lived socket connections are caching payloads without releasing them from RAM"
                ]
              }
            },
            secondary_contributors: [
              {
                title: "Kubernetes Resource Spec Limits Too Low",
                confidence_score: 95,
                evidence: ["Memory resource allocation limited to 256Mi in Deployment spec."]
              }
            ],
            timeline: [
              {
                timestamp: "03:10 ago",
                event: "Kubelet Scheduled Container",
                description: "Node container 'web-server' successfully pulled and mounted.",
                classification: "Fact"
              },
              {
                timestamp: "02:30 ago",
                event: "Memory Threshold Warning",
                description: "Container starts warning about RSS memory passing 95% threshold of configuration limits.",
                classification: "Inference"
              },
              {
                timestamp: "12s ago",
                event: "OOM Kill Dispatched",
                description: "Operating system kills the container process with signal 9.",
                classification: "Fact"
              }
            ],
            multi_agent_transcript: [
              {
                agent: "Triage Specialist (Cohere: North Mini)",
                action: "Scanned scheduler logs.",
                findings: "Isolated Exit Code 137. This explicitly maps to memory limitation shutdowns."
              },
              {
                agent: "Factual Auditor (Google: Gemma 4)",
                action: "Verified resource parameters.",
                findings: "OOM is highly deterministic. No secondary exception was logged before crash."
              },
              {
                agent: "Lead SRE Coordinator (OpenAI: GPT-OSS)",
                action: "Formulated mitigation blueprint.",
                findings: "Advise upgrading resources limits to 1Gi RAM and adjusting node garbage collection properties."
              }
            ],
            human_readable_explanation: "Your web application crashed because it tried to load more data into its RAM than Kubernetes is allowed to give it. Think of the container as a bucket that holds up to 512MB of water; your app tried to pour in 600MB, so the Kubernetes supervisor immediately knocked it over and restarted it to protect other programs. To fix this, you should increase the 'memory limit' parameter in your Kubernetes deployment file.",
            suggested_fixes: [
              {
                title: "Increase Kubernetes Memory Limits",
                steps: [
                  "Open your deployment configuration file (e.g. deployment.yaml).",
                  "Locate the 'resources' section under the container specifications.",
                  "Increase the 'limits.memory' configuration parameter to '1Gi' or higher.",
                  "Deploy the update using 'kubectl apply -f deployment.yaml' and monitor stability."
                ],
                code_example: `resources:
  limits:
    cpu: "500m"
    memory: "1Gi" # Upgraded memory limit
  requests:
    cpu: "250m"
    memory: "512Mi"`
              }
            ],
            relevant_log_snippets: [
              "Container web-server failed with Exit Code 137 (OOMKilled)"
            ]
          };
        } else if (lowerLogs.includes("csrf")) {
          matchedReport = {
            severity: "Medium",
            error_location: {
              file: "django/security/csrf.py",
              line: "224",
              function_or_module: "django.security.csrf",
              context: "POST /api/v1/payment/submit"
            },
            root_cause_analysis: {
              category: "CSRF Security Lockout",
              technical_summary: "The secure Django POST request was rejected because the client did not send the mandatory CSRF protection cookie, throwing a Forbidden 403 response.",
              confidence_score: 95,
              primary_evidence: [
                "Forbidden (CSRF cookie not set.): /api/v1/payment/submit"
              ],
              factual_classification: {
                facts: [
                  "HTTP POST request returned status code 403 Forbidden",
                  "Explicit Django security log warning is present"
                ]
              }
            },
            suggested_fixes: [
              {
                title: "Configure Axios or Fetch to Send CSRF Headers",
                steps: [
                  "In your frontend client, configure Axios to automatically read the 'csrftoken' cookie and append it as a request header.",
                  "Ensure CORS settings allow 'withCredentials' to be sent to the backend endpoint."
                ],
                code_example: `// Configure Axios globally
import axios from 'axios';
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';`
              }
            ],
            human_readable_explanation: "Your request was rejected because of a critical security shield called Cross-Site Request Forgery (CSRF) protection. It's like trying to enter a highly secure vault without your identity badge: the building locks the door immediately. To solve this, your frontend client code must automatically fetch and attach the 'csrftoken' key in the headers of all POST/PUT requests.",
            relevant_log_snippets: [
              "WARNING [django.security.csrf:224] Forbidden (CSRF cookie not set.): /api/v1/payment/submit"
            ]
          };
        } else if (lowerLogs.includes("cannot find module") || lowerLogs.includes("missing module") || lowerLogs.includes("routes/billing")) {
          matchedReport = {
            severity: "High",
            error_location: {
              file: "server.js",
              line: "14",
              function_or_module: "Node CJS Loader",
              context: "require('./routes/billing')"
            },
            root_cause_analysis: {
              category: "Missing Module Resolution",
              technical_summary: "The application crashed on startup because the Node loader was unable to find or import the relative module path './routes/billing'.",
              confidence_score: 99,
              primary_evidence: [
                "Error: Cannot find module './routes/billing'"
              ]
            },
            suggested_fixes: [
              {
                title: "Verify File Spelling and Relative Path Structure",
                steps: [
                  "Verify that a file named 'billing.js' or 'billing/index.js' actually exists inside your 'routes' directory.",
                  "Ensure capitalization matches exactly: relative paths are case-sensitive on production servers running Linux, even if they work fine locally on Windows or Mac."
                ],
                code_example: `// server.js line 14
// Make sure this file actually exists under src/routes/billing.js
const billingRouter = require('./routes/billing');`
              }
            ],
            human_readable_explanation: "Your backend failed to start because it is trying to import a code file named 'billing' inside your routes folder, but that file doesn't exist. It's like a chef trying to make soup but finding the main ingredient is missing from the pantry. You need to make sure the file is in the right place and its name is spelled correctly.",
            relevant_log_snippets: [
              "Error: Cannot find module './routes/billing'"
            ]
          };
        } else {
          const dynamicReport = parseTracebackDynamically(logs);
          if (dynamicReport) {
            matchedReport = dynamicReport;
          } else {
            // Standard placeholder
            matchedReport = SAMPLE_REPORT;
          }
        }

        const duration = Date.now() - startTime;
        setReport(matchedReport);
        const h = getHeuristics(logs);
        const updated = HistoryManager.saveHistoryItem(logs, h.engineGuess, h.lineCount, matchedReport, duration);
        setIncidentHistory(updated);
        setDiagnosticDuration(duration);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          logs: finalLogsForAnalysis, 
          model: activeModel,
          provider: provider,
          apiKey: apiKey,
          codebaseFiles: codebaseFiles.map(f => ({ name: f.name, content: f.content }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "An error occurred during diagnostics processing.");
      }

      const duration = Date.now() - startTime;
      setReport(data);
      const h = getHeuristics(logs);
      const updated = HistoryManager.saveHistoryItem(logs, h.engineGuess, h.lineCount, data, duration);
      setIncidentHistory(updated);
      setDiagnosticDuration(duration);
    } catch (err: any) {
      setError(err.message || "Failed to parse logs. Verify API configuration key.");
    } finally {
      setLoading(false);
    }
  };

  // Compile report markdown for sharing
  const convertReportToMarkdown = (report: DiagnosticsReport): string => {
    let md = `# 🐾 LogHound SRE Diagnostics Report\n`;
    md += `**Severity:** ${report.severity} Severity | **LogHound Run ID:** LH-${Math.floor(1000 + Math.random() * 9000)}\n\n`;
    md += `## 🎯 Resolution Outline\n`;
    md += `### Plain English Explanation:\n${report.human_readable_explanation}\n\n`;
    md += `## 🔧 Suggested Actionable Remedies\n`;
    report.suggested_fixes.forEach((fix, idx) => {
      md += `### Option ${idx + 1}: ${fix.title}\n`;
      fix.steps.forEach((step, sIdx) => {
        md += `${sIdx + 1}. ${step}\n`;
      });
      if (fix.code_example) {
        md += `\n\`\`\`\n${fix.code_example}\n\`\`\`\n`;
      }
      md += `\n`;
    });
    return md;
  };

  const copyToClipboard = () => {
    if (!report) return;
    const md = convertReportToMarkdown(report);
    navigator.clipboard.writeText(md);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const downloadReport = () => {
    if (!report) return;
    const md = convertReportToMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `loghound_remediation_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Node details for Interactive Dependency Graph
  const getGraphNodeDetails = (nodeId: string) => {
    const defaultData = {
      client: {
        title: "Client Network Boundary",
        subtitle: "External Browser / API Client Connection",
        status: "Normal",
        statusColor: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40",
        stats: {
          "Connection Protocol": "HTTP/2 TLS v1.3",
          "Average Latency": "34ms",
          "Health Index": "100%"
        },
        description: "Represents user requests hitting our system. External parameters are stable but clients are experiencing cascading 5xx gateway faults."
      },
      gateway: {
        title: "Ingress Router / API Gateway",
        subtitle: "Nginx Load Balancer",
        status: "Warning",
        statusColor: "text-amber-400 bg-amber-950/40 border-amber-800/40",
        stats: {
          "Server Host": "nginx-ingress-pod",
          "Port Route": "443 -> 3000",
          "Gateway Error Rate": "8.4% (Elevated)"
        },
        description: "Reverse proxy routing user requests. It logs network disconnects and timeouts from stalled downstream containers."
      },
      application: {
        title: "Application Microservice",
        subtitle: report?.error_location?.function_or_module || "Core Django/Node Service Backend",
        status: "Critical Failure",
        statusColor: "text-rose-400 bg-rose-950/40 border-rose-800/40",
        stats: {
          "Active Crash Site": report?.error_location?.file || "base.py",
          "Trigger Line": `Line #${report?.error_location?.line || '191'}`,
          "Host Status": "Deregistered"
        },
        description: "This server is actively throwing severe traceback exceptions. Click 'Suggested remedies' to patch its code files."
      },
      database: {
        title: "Primary Database Cluster",
        subtitle: report?.root_cause_analysis?.category || "PostgreSQL Service",
        status: "Resource Limit Reached",
        statusColor: "text-amber-400 bg-amber-950/40 border-amber-800/40",
        stats: {
          "Active Connections": "100/100 (Max Capacity)",
          "Queue Length": "42 queries delayed"
        },
        description: "The SQL database is running fine internally, but has ran out of client socket handles, locking out backend service inquiries."
      }
    };
    return defaultData[nodeId as keyof typeof defaultData] || defaultData.application;
  };

  const nodeInfo = getGraphNodeDetails(selectedNode || "application");

  const addNewModelId = () => {
    if (newModelId.trim() && !customModels.includes(newModelId.trim())) {
      const updated = [...customModels, newModelId.trim()];
      setCustomModels(updated);
      setActiveModel(newModelId.trim());
      setNewModelId("");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(211,90,37,0.12),rgba(255,255,255,0))] text-zinc-100 flex flex-col font-sans antialiased relative selection:bg-orange-500/30 selection:text-white">
      
      {/* Background Orbs for Glassmorphism highlight */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-orange-500/10 via-[#D35A25]/5 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[25%] left-[10%] w-[450px] h-[450px] rounded-full bg-orange-600/[0.04] blur-[150px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[30%] right-[15%] w-[400px] h-[400px] rounded-full bg-orange-500/[0.03] blur-[130px] pointer-events-none z-0" />
      
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-zinc-950/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          <div className="bg-[#D35A25] p-2 rounded-xl text-white shadow-md">
            <Terminal className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-sans font-extrabold tracking-tight text-orange-500">
                LogHound
              </h1>
              <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                SRE Multi-Agent
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium italic">Cooperative log diagnosis workspace</p>
          </div>
        </div>

        {/* Right Header: Dynamic Configuration & Settings Toggle */}
        <div className="flex items-center gap-3 relative">
          
          {/* Status Badge */}
          {demoMode ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-900/50 text-[10px] font-bold text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              TRIAL MODE (OFFLINE DEMO)
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              CONNECTED ({provider.toUpperCase()})
            </div>
          )}

          {/* Quick Config Button */}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] hover:border-orange-500 hover:bg-white/[0.06] text-zinc-100 rounded-xl transition-all cursor-pointer text-xs font-bold shadow-md"
          >
            <Settings className="h-4 w-4 text-orange-500 animate-spin-hover" />
            <span>Settings & Models</span>
          </button>

          {/* Dynamic Settings Dropdown Menu */}
          {showSettings && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-zinc-900/80 backdrop-blur-xl border border-white/[0.1] p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-fade-in text-zinc-200">
              <div className="flex justify-between items-center pb-3 border-b border-white/[0.06] mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4.5 w-4.5 text-orange-500" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-500">Provider & Models Setup</h3>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-[#2d2d2f] rounded text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-orange-500" /> Provider API Gateway
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setProvider(val);
                      // Default model choices for provider
                      if (val === "openrouter") setActiveModel("google/gemma-2-9b-it:free");
                      else if (val === "openai") setActiveModel("gpt-4o-mini");
                      else if (val === "gemini") setActiveModel("gemini-2.5-flash");
                      else if (val === "anthropic") setActiveModel("claude-3-5-sonnet-latest");
                    }}
                    className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500 focus:bg-[#212124] cursor-pointer font-bold transition-all duration-200"
                  >
                    <option value="openrouter">OpenRouter (Supports custom model list)</option>
                    <option value="openai">OpenAI Official (API Keys)</option>
                    <option value="gemini">Google Gemini Developer Platform</option>
                    <option value="anthropic">Anthropic Console</option>
                  </select>
                </div>

                {/* API Key Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-orange-500" /> API Access Token
                    </label>
                    {provider === "openrouter" && (
                      <a 
                        href="https://openrouter.ai/keys" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[9px] text-orange-400 hover:underline flex items-center gap-0.5"
                      >
                        Get Free Key <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={apiKey ? "••••••••••••••••••••••••••••" : `Paste your ${provider.toUpperCase()} API key`}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500 transition-all duration-200"
                  />
                  <p className="text-[9px] text-zinc-500 font-medium leading-normal mt-1">
                    API keys are saved in your secure local sandbox and never transmitted directly outside of your requests.
                  </p>
                </div>

                {/* Model ID Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-orange-500" /> Active SRE Model
                  </label>
                  <select
                    value={activeModel}
                    onChange={(e) => setActiveModel(e.target.value)}
                    className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500 focus:bg-[#212124] cursor-pointer font-bold font-mono transition-all duration-200"
                  >
                    {provider === "openrouter" ? (
                      customModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    ) : provider === "openai" ? (
                      <>
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="gpt-4o">gpt-4o</option>
                      </>
                    ) : provider === "gemini" ? (
                      <>
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                      </>
                    ) : (
                      <>
                        <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet-latest</option>
                        <option value="claude-3-5-haiku-latest">claude-3-5-haiku-latest</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Add Custom Models Block (OpenRouter specific as requested) */}
                {provider === "openrouter" && (
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] space-y-2">
                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Add Custom OpenRouter Model</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g., deepseek/deepseek-r1:free"
                        value={newModelId}
                        onChange={(e) => setNewModelId(e.target.value)}
                        className="flex-1 bg-white/[0.01] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-orange-500"
                      />
                      <button
                        onClick={addNewModelId}
                        className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Simulated Offline Mode Selection Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-[#2d2d2f]">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Run in Offline Demo Mode</span>
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={(e) => setDemoMode(e.target.checked)}
                    className="h-4 w-4 accent-orange-500 rounded cursor-pointer"
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={() => saveConfig(provider, apiKey, activeModel, customModels, demoMode)}
                  className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-sans text-xs font-bold rounded-xl transition-all cursor-pointer mt-2"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
        
        {/* Left Hand: Ingest Log Stream */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Paste Board */}
          <div className="bg-zinc-900/30 backdrop-blur-md border border-white/[0.08] rounded-3xl flex flex-col overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(211,90,37,0.05)] transition-all duration-300">
            <div className="bg-white/[0.02] px-5 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="font-sans font-extrabold text-sm text-orange-500 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-orange-500" />
                Ingest Crash Log Stream
              </h2>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#2c2c2e] transition-all cursor-pointer"
                  title="Upload log file"
                >
                  <UploadCloud className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setLogs("")}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
                  title="Clear log contents"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".txt,.log,text/*"
                />
              </div>
            </div>

            {/* Input logs content */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative flex-1 flex flex-col min-h-[360px] transition-all ${
                dragActive ? "bg-orange-500/5 ring-2 ring-dashed ring-orange-500/20" : ""
              }`}
            >
              <textarea
                value={logs}
                onChange={(e) => setLogs(e.target.value)}
                placeholder="Paste your raw production server logs, stack traces, PostgreSQL connection logs, database exceptions, or drag-and-drop log files directly here..."
                id="log-ingest-box"
                className="w-full flex-1 p-5 bg-transparent resize-none text-[11px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-0 leading-relaxed"
              />

              {dragActive && (
                <div className="absolute inset-0 bg-[#141415]/95 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none gap-2 text-zinc-400 animate-fade-in">
                  <UploadCloud className="h-11 w-11 text-orange-500 animate-bounce" />
                  <p className="font-sans font-bold text-sm text-white">Drop log file to analyze</p>
                  <p className="text-xs text-zinc-500">Text logs, diagnostic files accepted</p>
                </div>
              )}
            </div>

            {/* Safe Mode & Masking Bar */}
            <div className="bg-white/[0.01] border-t border-white/[0.06] px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2.5 text-zinc-300 font-sans font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safeMode}
                  onChange={(e) => setSafeMode(e.target.checked)}
                  className="h-4 w-4 rounded bg-[#27272a] border-zinc-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 accent-orange-500 cursor-pointer"
                />
                <div className="flex items-center gap-1.5">
                  <Lock className={`h-3.5 w-3.5 ${safeMode ? "text-emerald-400 font-extrabold" : "text-zinc-500"}`} />
                  <span className="font-bold">🔒 Safe Mode Masking</span>
                  <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">(Auto-Anonymize API Keys / PII)</span>
                </div>
              </label>
              {safeMode && sanitizationResult && sanitizationResult.totalMasked > 0 ? (
                <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 font-bold px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 animate-pulse">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{sanitizationResult.totalMasked} items masked prior to send</span>
                </div>
              ) : (
                <span className="text-[9px] text-zinc-500 italic">Logs are secure locally</span>
              )}
            </div>

            {/* Log Metadata Heuristics bar */}
            {metadata && (
              <div className="bg-[#1b1b1c] border-t border-[#2d2d2e] px-5 py-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="truncate" title={metadata.engineGuess}>
                    {metadata.engineGuess}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 justify-center border-x border-[#2d2d2e] px-2">
                  <Layers className="h-3.5 w-3.5 text-sky-500" />
                  <span>{metadata.lineCount} Log Lines</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                  <span>{metadata.hasTimestamps ? "Time Captured" : "No timestamps"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Codebase Files Context Card */}
          <div className="bg-zinc-900/30 backdrop-blur-md border border-white/[0.08] rounded-3xl flex flex-col overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(211,90,37,0.05)] transition-all duration-300 animate-fade-in">
            <div className="bg-white/[0.02] px-5 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <div className="flex flex-col">
                <h2 className="font-sans font-extrabold text-sm text-sky-400 flex items-center gap-2">
                  <FileCode className="h-4.5 w-4.5 text-sky-400" />
                  Connect Codebase Context
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Inject code files for precise line-level fixes</p>
              </div>
              
              {codebaseFiles.length > 0 && (
                <button 
                  type="button"
                  onClick={() => setCodebaseFiles([])}
                  className="text-[10px] text-zinc-400 hover:text-red-400 transition-all font-bold cursor-pointer"
                  title="Clear all codebase context files"
                >
                  Clear Files
                </button>
              )}
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* File selectors */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => codebaseFileInputRef.current?.click()}
                  className="py-2.5 px-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.1] rounded-xl flex items-center justify-center gap-2 text-xs text-zinc-300 font-sans font-bold transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-sky-400" />
                  Select Files
                </button>
                <button
                  type="button"
                  onClick={() => codebaseFolderInputRef.current?.click()}
                  className="py-2.5 px-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.1] rounded-xl flex items-center justify-center gap-2 text-xs text-zinc-300 font-sans font-bold transition-all cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4 text-sky-400" />
                  Select Folder
                </button>
                <input 
                  type="file" 
                  ref={codebaseFileInputRef} 
                  onChange={(e) => handleCodebaseFilesUpload(e.target.files)} 
                  className="hidden" 
                  multiple
                />
                <input 
                  type="file" 
                  ref={codebaseFolderInputRef} 
                  onChange={(e) => handleCodebaseFilesUpload(e.target.files)} 
                  className="hidden" 
                  {...{ webkitdirectory: "", directory: "", multiple: true } as any}
                />
              </div>

              {/* Codebase dropzone or files list */}
              {codebaseFiles.length === 0 ? (
                <div 
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      handleCodebaseFilesUpload(e.dataTransfer.files);
                    }
                  }}
                  className="border border-dashed border-white/[0.06] rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 bg-white/[0.01]"
                >
                  <Code className="h-6 w-6 text-zinc-600" />
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    Drag & drop code files or entire directories here to feed source files directly to the SRE agents.
                  </p>
                </div>
              ) : (
                <div className="max-h-[180px] overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 divide-y divide-white/[0.04]">
                  {codebaseFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-white/[0.02] transition-all text-[11px]">
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <FileCode className="h-4 w-4 text-sky-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-zinc-300 font-mono truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-medium">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCodebaseFiles((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger button */}
          <button
            onClick={runDiagnostics}
            disabled={loading || !logs.trim()}
            id="run-diagnostics-trigger"
            className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed active:bg-orange-700 text-white font-sans font-bold text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer group"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>SRE Agent Cooperative Audit...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white stroke-none group-hover:translate-x-0.5 transition-transform" />
                <span>Execute Team Diagnostics</span>
              </>
            )}
          </button>

          {error && (
            <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 p-4 rounded-2xl flex items-start gap-3 animate-fade-in shadow-sm">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Diagnostics Refused</p>
                <p className="text-zinc-400 mt-1 leading-relaxed font-mono">{error}</p>
              </div>
            </div>
          )}

          {/* Saved Incident Audits History */}
          <div className="bg-zinc-900/30 backdrop-blur-md border border-white/[0.08] rounded-3xl flex flex-col overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(211,90,37,0.05)] transition-all duration-300">
            <div className="bg-white/[0.02] px-5 py-3.5 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="font-sans font-extrabold text-[11px] text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-orange-500" />
                Local Audits Library ({incidentHistory.length})
              </h2>
              {incidentHistory.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all cached incident audits?")) {
                      HistoryManager.clearHistory();
                      setIncidentHistory([]);
                    }
                  }}
                  className="text-[10px] text-zinc-500 hover:text-red-400 transition-all font-bold cursor-pointer"
                >
                  Clear Library
                </button>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-[#2d2d2e] bg-[#171718]/50">
              {incidentHistory.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 italic text-xs leading-relaxed">
                  No local audits stored yet. Diagnosed logs will automatically be saved to your session workspace history.
                </div>
              ) : (
                incidentHistory.map((item) => {
                  const sev = item.report.severity;
                  const isCurrent = report && report.human_readable_explanation === item.report.human_readable_explanation;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-all cursor-pointer ${
                        isCurrent ? "bg-orange-500/[0.04] border-l-2 border-l-orange-500" : ""
                      }`}
                      onClick={() => {
                        setLogs(item.rawLogs);
                        setReport(item.report);
                        setDiagnosticDuration(item.durationMs || null);
                        setActiveTab("report");
                        setError(null);
                      }}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            sev === "Critical" ? "bg-red-950/20 text-red-400 border-red-900/30" :
                            sev === "High" ? "bg-orange-950/20 text-orange-400 border-orange-900/30" :
                            sev === "Medium" ? "bg-yellow-950/20 text-yellow-400 border-yellow-900/30" :
                            "bg-zinc-800 text-zinc-300 border-zinc-700"
                          }`}>
                            {sev}
                          </span>
                          <span className="text-[11px] font-bold text-white truncate max-w-[150px] sm:max-w-xs" title={item.logsTitle}>
                            {item.logsTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-500 font-mono">
                          <span className="truncate max-w-[90px]">{item.engineGuess}</span>
                          <span>•</span>
                          <span>{item.lineCount} lines</span>
                          <span>•</span>
                          <span className="text-[9px] font-sans">{item.timestamp.split(",")[1]?.trim() || item.timestamp}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = HistoryManager.deleteHistoryItem(item.id);
                          setIncidentHistory(updated);
                        }}
                        className="p-1.5 hover:bg-[#2e2e30] rounded-lg text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Delete run from history"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Right Hand: SRE Multi-Agent Notebook results */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Tab Controller */}
          <div className="flex bg-[#1f1f21] p-1.5 rounded-2xl border border-[#2d2d2f] gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab("report")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === "report" 
                  ? "bg-[#2c2c2e] text-orange-500 shadow-sm font-bold border border-[#3e3e40]" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>SRE Team Report</span>
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === "timeline" 
                  ? "bg-[#2c2c2e] text-orange-500 shadow-sm font-bold border border-[#3e3e40]" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Timeline Chronology</span>
            </button>
            <button
              onClick={() => setActiveTab("dependency")}
              className={`flex-1 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === "dependency" 
                  ? "bg-[#2c2c2e] text-orange-500 shadow-sm font-bold border border-[#3e3e40]" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Dependency Graph</span>
            </button>
          </div>

          {/* SRE Results Area */}
          <div className="flex-1 min-h-[500px] flex flex-col">
            
            {/* Pending Stream Capture */}
            {!report && !loading && (
              <div className="flex-1 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-zinc-900/20 backdrop-blur-md min-h-[460px] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <div className="bg-white/[0.03] p-4.5 rounded-3xl text-zinc-500 mb-4 border border-white/[0.08] shadow-sm">
                  <Terminal className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="font-sans font-extrabold text-lg text-orange-500">LogHound Pending Inputs</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
                  Provide raw crash logs or paste a traceback on the left-side panel to generate real cooperative SRE diagnostics instantly.
                </p>
              </div>
            )}

            {/* Cooperative Spinner */}
            {loading && (
              <div className="flex-1 bg-zinc-900/30 backdrop-blur-md border border-white/[0.08] rounded-3xl p-10 flex flex-col items-center justify-center text-center min-h-[460px] gap-6 animate-fade-in shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-zinc-800 border-t-orange-500 animate-spin" />
                  <Terminal className="h-6 w-6 text-orange-500 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-extrabold text-lg text-orange-500">Assembling SRE Cooperative Agents</h3>
                  <div className="max-w-xs text-xs text-zinc-400 mt-3 space-y-2 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                    <p className="flex items-center gap-1.5 text-left"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" /> 🧑‍💻 Cohere Triage Specialist: Scanning traceback...</p>
                    <p className="flex items-center gap-1.5 text-left"><span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" /> 🔬 Gemma Factual Auditor: Rating metrics evidence...</p>
                    <p className="flex items-center gap-1.5 text-left"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> 🤝 GPT OSS Lead SRE: Rendering code remedies...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Output View: SRE Team Report */}
            {report && !loading && activeTab === "report" && (
              <div className="bg-zinc-900/30 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] animate-fade-in">
                
                {/* Header Metrics */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#2d2d2f]">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                      report.severity === "Critical" ? "bg-red-950/20 text-red-400 border-red-900/40" :
                      report.severity === "High" ? "bg-orange-950/20 text-orange-400 border-orange-900/40" :
                      report.severity === "Medium" ? "bg-yellow-950/20 text-yellow-400 border-yellow-900/40" :
                      "bg-zinc-800 text-zinc-300 border-zinc-700"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        report.severity === "Critical" ? "bg-red-500 animate-ping" :
                        report.severity === "High" ? "bg-orange-500 animate-pulse" :
                        report.severity === "Medium" ? "bg-yellow-500" :
                        "bg-zinc-500"
                      }`} />
                      {report.severity} Threat Level
                    </div>
                    <div>
                      <h2 className="font-sans font-extrabold text-base text-orange-500">Cooperative SRE Audit</h2>
                      <p className="text-[10px] text-zinc-500 font-mono">SRE-RUN: LH-{Math.floor(1000 + Math.random() * 9000)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-orange-500 text-zinc-300 rounded-xl transition-all cursor-pointer font-medium shadow-sm"
                    >
                      {copying ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copying ? "Copied" : "Copy Remediation"}</span>
                    </button>
                    <button
                      onClick={downloadReport}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-orange-500 text-zinc-300 rounded-xl transition-all cursor-pointer font-medium shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Report</span>
                    </button>
                  </div>
                </div>

                {/* Primary Diagnosis Box */}
                <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl flex flex-col gap-2 shadow-sm">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Root Cause Diagnosis
                  </div>
                  <h3 className="font-sans font-extrabold text-orange-500 text-base leading-tight">
                    {report.root_cause_analysis.category || "General System Error"}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                    {report.root_cause_analysis.technical_summary}
                  </p>
                </div>

                {/* CRITICAL UPGRADE: THE ERROR RESOLUTIONS IN A HIGH-VISIBILITY CLEAR PLACE FIRST */}
                <div className="border-t border-orange-500/20 pt-6 space-y-5 bg-orange-500/[0.01] p-4 rounded-3xl border border-orange-500/10">
                  
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                    <div className="bg-[#D35A25]/10 p-1.5 rounded-xl text-orange-400">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-orange-500 uppercase tracking-wider">🎯 Instant Resolution Blueprint</h3>
                      <p className="text-[11px] text-zinc-400 italic">Clear plain explanations and verified code-level remedies formulated to repair this exact crash site</p>
                    </div>
                  </div>

                  {/* Plain English explanation box - highly comfortable and legible */}
                  <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/[0.06] flex flex-col gap-3">
                    <h4 className="text-xs font-sans font-extrabold text-orange-500 flex items-center gap-2">
                      <HelpCircle className="h-4.5 w-4.5 text-orange-500" />
                      Plain English Explanation (What happened?)
                    </h4>
                    <p className="text-xs text-white leading-relaxed font-sans">
                      {report.human_readable_explanation}
                    </p>
                  </div>

                  {/* Step-by-Step Actionable Remedies with Highlighted Code Boxes */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-2">
                      <Code className="h-4 w-4 text-orange-500" />
                      Step-by-Step Code Remediation Steps
                    </h4>
                    <div className="flex flex-col gap-4">
                      {report.suggested_fixes.map((fix, idx) => (
                        <div key={idx} className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden shadow-md">
                          <div className="bg-white/[0.03] px-4 py-3 border-b border-white/[0.06] flex justify-between items-center">
                            <span className="text-xs font-extrabold text-white font-sans flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold">#{idx + 1}</span>
                              {fix.title}
                            </span>
                          </div>
                          
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2.5 text-xs">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Implementation Actions</p>
                              <ul className="space-y-2.5 text-zinc-200">
                                {fix.steps.map((step, sIdx) => (
                                  <li key={sIdx} className="flex gap-2">
                                    <span className="text-orange-500 font-mono font-bold shrink-0">{sIdx + 1}.</span>
                                    <span className="leading-relaxed text-white">{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {fix.code_example && (
                              <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Configuration Code snippet</p>
                                <pre className="bg-black/40 p-3.5 rounded-xl border border-white/[0.06] text-[10px] font-mono text-[#D4D4D4] overflow-x-auto leading-relaxed max-h-[180px] shadow-inner select-all">
                                  <code>{fix.code_example}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Secondary Diagnostics (Collapsed/Secondary further down) */}
                <div className="border-t border-white/[0.06] pt-5 space-y-6">
                  
                  {/* Callsite Hotspots */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* SRE Hotspot Frame */}
                    <div className="bg-white/[0.02] p-4.5 rounded-2xl border border-white/[0.06] flex flex-col gap-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/[0.06]">
                        <Compass className="h-3.5 w-3.5 text-sky-400" />
                        Identified Code Coordinate Hotspot
                      </div>
                      <div className="text-xs space-y-2 text-zinc-300">
                        <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                          <span className="text-zinc-500">Target File:</span>
                          <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono font-bold text-orange-400 max-w-[160px] truncate" title={report.error_location.file}>
                            {report.error_location.file || "N/A"}
                          </code>
                        </div>
                        <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                          <span className="text-zinc-500">Crash Frame Line:</span>
                          <span className="font-mono font-bold text-white">Line #{report.error_location.line || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                          <span className="text-zinc-500">Active Function:</span>
                          <code className="text-zinc-300 font-mono truncate max-w-[160px]" title={report.error_location.context}>
                            {report.error_location.function_or_module || "N/A"}
                          </code>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="text-zinc-500">Evaluated Certainty:</span>
                          <span className="font-bold text-emerald-400 font-mono">{report.root_cause_analysis.confidence_score || 95}% certainty</span>
                        </div>
                      </div>
                    </div>

                    {/* Contributing Cascades */}
                    <div className="bg-white/[0.02] p-4.5 rounded-2xl border border-white/[0.06] flex flex-col gap-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        Contributing Cascading Factors
                      </div>
                      <div className="space-y-3.5">
                        {report.secondary_contributors && report.secondary_contributors.length > 0 ? (
                          report.secondary_contributors.map((contrib, idx) => (
                            <div key={idx} className="text-xs">
                              <div className="flex justify-between items-center text-[11px] font-bold text-zinc-200 mb-1">
                                <span className="truncate">{contrib.title}</span>
                                <span className="text-orange-400 font-mono shrink-0">{contrib.confidence_score}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                                <div className="bg-orange-500 h-1 rounded-full" style={{ width: `${contrib.confidence_score}%` }} />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-zinc-500 italic leading-relaxed pt-2">
                            No secondary factors isolated. Standard linear incident trigger stack dump.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* SRE Multi-Agent Logs */}
                  {report.multi_agent_transcript && report.multi_agent_transcript.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-500" />
                        SRE Collaborative Transcript Logs
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {report.multi_agent_transcript.map((agentLog, idx) => {
                          const isAuditor = agentLog.agent.includes("Auditor");
                          const isTriage = agentLog.agent.includes("Triage");
                          
                          let cardStyle = "bg-white/[0.01] border-white/[0.06]";
                          let iconNode = <Layers className="h-4 w-4 text-sky-400" />;
                          
                          if (isAuditor) {
                            cardStyle = "bg-white/[0.03] border-white/[0.06]";
                            iconNode = <ShieldCheck className="h-4 w-4 text-emerald-400" />;
                          } else if (!isTriage) {
                            cardStyle = "bg-white/[0.02] border-white/[0.06]";
                            iconNode = <Cpu className="h-4 w-4 text-orange-400" />;
                          }

                          return (
                            <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-2 ${cardStyle} shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]`}>
                              <div className="flex items-center gap-1.5 pb-2 border-b border-white/[0.04]">
                                {iconNode}
                                <span className="font-bold text-[10px] uppercase tracking-wide truncate text-zinc-100">{agentLog.agent.split(" ")[0]} Specialist</span>
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Audit Action:</p>
                                <p className="text-[11px] leading-relaxed text-zinc-300 font-mono font-medium line-clamp-2" title={agentLog.action}>{agentLog.action}</p>
                              </div>
                              <div className="mt-1 pt-2 border-t border-white/[0.04]">
                                <p className="text-[9px] text-orange-400 uppercase tracking-wider mb-0.5">Findings:</p>
                                <p className="text-[11px] leading-relaxed italic text-white">"{agentLog.findings}"</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Supporting log clips */}
                  <div>
                    <h3 className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-orange-500" />
                      Associated Raw Log Snippets
                    </h3>
                    <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/[0.06] text-[10.5px] font-mono text-zinc-100 space-y-2.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                      {report.relevant_log_snippets.map((snippet, idx) => (
                        <div key={idx} className="border-l-2 border-orange-500 bg-white/[0.03] p-2.5 rounded-r">
                          <code className="break-all whitespace-pre-wrap text-white">{snippet}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* SRE Report Footer Latency Tracker */}
                <div className="border-t border-white/[0.06] pt-5 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-zinc-500 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Diagnostics Cycle Verified • Safe Mode Compliant</span>
                  </div>
                  {diagnosticDuration !== null && (
                    <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 rounded-lg">
                      <Clock className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                      <span className="text-zinc-400">Multi-Agent Cycle Latency:</span>
                      <span className="text-orange-400 font-mono font-bold">
                        {diagnosticDuration >= 1000 
                          ? `${(diagnosticDuration / 1000).toFixed(2)}s` 
                          : `${diagnosticDuration}ms`}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Output View: Timeline chronology */}
            {report && !loading && activeTab === "timeline" && (
              <div className="bg-zinc-900/30 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] animate-fade-in flex-1">
                <div>
                  <h2 className="font-sans font-extrabold text-base text-orange-500">Incident Chronology</h2>
                  <p className="text-xs text-zinc-400 mt-1 italic">Sequential timeline reconstructed cooperatively by agents</p>
                </div>

                <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden flex-1">
                  <div className="absolute left-[31px] top-9 bottom-9 w-0.5 bg-gradient-to-b from-orange-500 to-zinc-800/20" />
                  
                  <div className="space-y-6 relative">
                    {report.timeline && report.timeline.length > 0 ? (
                      report.timeline.map((item, idx) => {
                        const isFact = item.classification === "Fact";
                        const isInference = item.classification === "Inference";
                        const badgeStyle = isFact 
                          ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/40" 
                          : isInference 
                            ? "bg-amber-950/20 text-amber-400 border-amber-900/40" 
                            : "bg-rose-950/20 text-rose-400 border-rose-900/40";
                        const dotStyle = isFact ? "bg-emerald-500 ring-emerald-950/50" : isInference ? "bg-amber-500 ring-amber-950/50" : "bg-red-500 ring-rose-950/50";
                        return (
                          <div key={idx} className="flex gap-4.5 items-start relative pl-1.5 animate-fade-in">
                            <div className="relative z-10 flex items-center justify-center mt-1.5 shrink-0">
                              <div className={`h-4.5 w-4.5 rounded-full ${dotStyle} ring-4 flex items-center justify-center border border-zinc-950`} />
                            </div>
                            
                            <div className="flex-1 bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] hover:border-orange-500 transition-all duration-300 shadow-sm">
                              <div className="flex flex-wrap justify-between items-center gap-1.5 mb-2 pb-1.5 border-b border-white/[0.04]">
                                <span className="font-mono text-[10.5px] font-bold text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-white/[0.06]">
                                  {item.timestamp || `Step ${idx + 1}`}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wide ${badgeStyle}`}>
                                  {item.classification}
                                </span>
                              </div>
                              <h4 className="font-bold text-white text-xs mb-1">
                                {item.event}
                              </h4>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-zinc-500 italic text-xs">
                        No chronology dataset was compiled.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Output View: Dependency topology Graph */}
            {report && !loading && activeTab === "dependency" && (
              <div className="bg-zinc-900/30 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] animate-fade-in flex-1">
                <div>
                  <h2 className="font-sans font-extrabold text-base text-orange-500">Service Call-Stack Graph</h2>
                  <p className="text-xs text-zinc-400 mt-1">Interactive topology mapping incident trace logs to architecture nodes</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                  
                  <div className="lg:col-span-7 bg-black/20 border border-white/[0.06] rounded-2xl p-4.5 flex flex-col items-center justify-center relative overflow-hidden min-h-[340px] shadow-inner">
                    <div className="absolute top-2 left-2 text-[9px] font-mono font-bold text-[#8F7C6E] bg-white/[0.02] px-2 py-1 rounded border border-white/[0.06]">
                      LIVE SYSTEM FLOW (CLICK NODES)
                    </div>
                    
                    <svg className="w-full h-full max-w-[500px] min-h-[250px]" viewBox="0 0 500 250">
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 2 L 10 5 L 0 8 z" fill="#D35A25" />
                        </marker>
                      </defs>

                      <path d="M 60 120 Q 140 70 200 120" fill="none" stroke="#2d2d2f" strokeWidth="2" strokeDasharray="6 4" />
                      <circle r="4" fill="#10B981">
                        <animateMotion dur="2.8s" repeatCount="indefinite" path="M 60 120 Q 140 70 200 120" />
                      </circle>

                      <path d="M 220 120 Q 285 160 350 120" fill="none" stroke={selectedNode === "application" ? "#EF4444" : "#2d2d2f"} strokeWidth="2" strokeDasharray="4 4" />
                      <circle r="4" fill="#EF4444">
                        <animateMotion dur="2.2s" repeatCount="indefinite" path="M 220 120 Q 285 160 350 120" />
                      </circle>

                      <path d="M 370 120 Q 415 60 450 120" fill="none" stroke={selectedNode === "database" ? "#F59E0B" : "#2d2d2f"} strokeWidth="2" />

                      {/* BROWSER */}
                      <g className="cursor-pointer" onClick={() => setSelectedNode("client")}>
                        <circle cx="50" cy="120" r="22" fill={selectedNode === "client" ? "#222" : "#1a1a1c"} stroke="#10B981" strokeWidth={selectedNode === "client" ? 3 : 1.5} />
                        <text x="50" y="123" textAnchor="middle" className="text-[8px] font-bold fill-white font-mono">CLIENT</text>
                      </g>

                      {/* PROXY */}
                      <g className="cursor-pointer" onClick={() => setSelectedNode("gateway")}>
                        <circle cx="210" cy="120" r="22" fill={selectedNode === "gateway" ? "#222" : "#1a1a1c"} stroke="#F59E0B" strokeWidth={selectedNode === "gateway" ? 3 : 1.5} />
                        <text x="210" y="123" textAnchor="middle" className="text-[8px] font-bold fill-white font-mono">GATEWAY</text>
                      </g>

                      {/* BACKEND */}
                      <g className="cursor-pointer" onClick={() => setSelectedNode("application")}>
                        <circle cx="360" cy="120" r="24" fill={selectedNode === "application" ? "#2a1515" : "#1a1a1c"} stroke="#EF4444" strokeWidth={3} className="animate-pulse" />
                        <text x="360" y="123" textAnchor="middle" className="text-[8px] font-bold fill-white font-mono">BACKEND</text>
                      </g>

                      {/* DB */}
                      <g className="cursor-pointer" onClick={() => setSelectedNode("database")}>
                        <circle cx="450" cy="120" r="22" fill={selectedNode === "database" ? "#222" : "#1a1a1c"} stroke="#F59E0B" strokeWidth={selectedNode === "database" ? 3 : 1.5} />
                        <text x="450" y="123" textAnchor="middle" className="text-[8px] font-bold fill-white font-mono">DATABASE</text>
                      </g>
                    </svg>
                  </div>

                  <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-white/[0.06]">
                        <div className={`px-2 py-1 inline-block rounded text-[9px] font-bold uppercase tracking-wider border ${nodeInfo.statusColor}`}>
                          {nodeInfo.status}
                        </div>
                        <h3 className="font-extrabold text-white text-xs mt-2">{nodeInfo.title}</h3>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{nodeInfo.subtitle}</p>
                      </div>

                      <div className="space-y-2">
                        {Object.entries(nodeInfo.stats).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-zinc-500">{k}:</span>
                            <span className="text-zinc-200 font-bold">{v}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed font-sans border-t border-white/[0.04] pt-3">
                        {nodeInfo.description}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* Elegant Footer */}
      <footer className="border-t border-zinc-800 bg-[#121213] py-8 px-6 text-center text-xs text-zinc-500 z-10 relative mt-12">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 font-sans font-medium">
          <p>© 2026 LogHound Diagnostics Engine. Released under Apache-2.0 License.</p>
          <div className="flex items-center gap-1 text-zinc-400">
            <Users className="h-3.5 w-3.5 text-orange-500" />
            <span>Cooperative SRE Multi-Agent Notebooks</span>
          </div>
        </div>
      </footer>

      {/* Dynamic First-Time Onboarding Modal Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.1] p-6 sm:p-8 rounded-3xl max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative space-y-6 text-zinc-200 animate-scale-up">
            
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-orange-600 p-3.5 rounded-2xl text-white shadow-lg">
                <Terminal className="h-7 w-7 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2 justify-center">
                  Welcome to <span className="text-orange-500">LogHound</span> SRE
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  An open-source, multi-agent cooperative notebook built to diagnose application trace logs instantly.
                </p>
              </div>
            </div>

            <div className="bg-white/[0.02] p-4.5 rounded-2xl border border-white/[0.06] space-y-3 text-xs leading-relaxed">
              <p className="font-bold text-orange-500 uppercase tracking-wider text-[10px]">🔑 API Provider Set Up</p>
              <p className="text-zinc-300">
                To run live, hyper-intelligent log diagnostic sessions, connect to your preferred provider API. We highly recommend getting a free key from <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline inline-flex items-center gap-0.5">OpenRouter <ExternalLink className="h-3 w-3" /></a> to explore hundreds of open-weights models for free or fractional cents.
              </p>
              <div className="pt-2 flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={provider}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setProvider(val);
                      if (val === "openrouter") setActiveModel("google/gemma-2-9b-it:free");
                      else if (val === "openai") setActiveModel("gpt-4o-mini");
                      else if (val === "gemini") setActiveModel("gemini-2.5-flash");
                      else if (val === "anthropic") setActiveModel("claude-3-5-sonnet-latest");
                    }}
                    className="bg-white/[0.03] border border-white/[0.08] focus:bg-[#212124] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="openrouter">OpenRouter (Default / Free)</option>
                    <option value="openai">OpenAI Official</option>
                    <option value="gemini">Google Gemini Developer Platform</option>
                    <option value="anthropic">Anthropic Console</option>
                  </select>
                  <input
                    type="password"
                    placeholder="Paste your API key/token here"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setDemoMode(true);
                  saveConfig(provider, apiKey, activeModel, customModels, true);
                }}
                className="flex-1 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                🎮 Offline Trial Mode (Demo Logs)
              </button>
              <button
                onClick={() => {
                  setDemoMode(false);
                  saveConfig(provider, apiKey, activeModel, customModels, false);
                }}
                disabled={!apiKey.trim()}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <span>Launch SRE Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-center text-[10px] text-zinc-500">
              You can modify provider keys, active model parameters, or toggle Trial Mode anytime via the <span className="text-orange-400 font-bold">Settings & Models</span> button in the top-right header.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
