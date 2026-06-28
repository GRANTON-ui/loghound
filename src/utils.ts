/**
 * LogHound SRE Utility Functions
 * Pure TypeScript helper functions for client-side log sanitization and local-first session history.
 */

import { DiagnosticsReport, Fix } from "./presets";

export interface SanitizationResult {
  sanitized: string;
  totalMasked: number;
  breakdown: {
    emails: number;
    ips: number;
    credentials: number;
    apiKeys: number;
  };
  redactedDetails: string[];
}

/**
 * Sanitizes raw server logs client-side to redact PII and credentials
 * before they are sent to third-party AI APIs.
 */
export function sanitizeLogs(rawLogs: string): SanitizationResult {
  let sanitized = rawLogs;
  let emailsCount = 0;
  let ipsCount = 0;
  let credentialsCount = 0;
  let apiKeysCount = 0;
  const redactedDetails: string[] = [];

  if (!rawLogs) {
    return {
      sanitized: "",
      totalMasked: 0,
      breakdown: { emails: 0, ips: 0, credentials: 0, apiKeys: 0 },
      redactedDetails: [],
    };
  }

  // 1. Redact Email Addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
  const emailsFound = rawLogs.match(emailRegex);
  if (emailsFound) {
    emailsCount = emailsFound.length;
    sanitized = sanitized.replace(emailRegex, "[REDACTED_EMAIL]");
    redactedDetails.push(`Masked ${emailsCount} email address(es)`);
  }

  // 2. Redact Google / Gemini, OpenAI, Anthropic, or general API Keys
  // - Google AI Studio / Gemini: AIzaSy... (39 chars total)
  // - OpenAI project keys: sk-proj-...
  // - OpenRouter keys: sk-or-...
  const geminiKeyRegex = /AIzaSy[A-Za-z0-9\-_]{35}/g;
  const openaiKeyRegex = /sk-(?:proj|or)-[A-Za-z0-9\-_]{30,}/g;
  const genericApiKeyRegex = /(?:api[-_]?key|secret[-_]?key|auth[-_]?token)\s*[:=]\s*["']?([A-Za-z0-9\-_\.\/]{16,})["']?/gi;

  const geminiKeysFound = rawLogs.match(geminiKeyRegex);
  const openaiKeysFound = rawLogs.match(openaiKeyRegex);
  
  if (geminiKeysFound) {
    apiKeysCount += geminiKeysFound.length;
    sanitized = sanitized.replace(geminiKeyRegex, "[REDACTED_GEMINI_KEY]");
  }
  if (openaiKeysFound) {
    apiKeysCount += openaiKeysFound.length;
    sanitized = sanitized.replace(openaiKeyRegex, "[REDACTED_API_KEY]");
  }

  // Parse generic key value structures
  let genericKeysMatch;
  while ((genericKeysMatch = genericApiKeyRegex.exec(sanitized)) !== null) {
    const fullMatch = genericKeysMatch[0];
    const keyValue = genericKeysMatch[1];
    // Avoid redacting common tags like "true", "false", "undefined", "null" or standard error words
    if (!["true", "false", "undefined", "null", "application"].includes(keyValue.toLowerCase())) {
      apiKeysCount++;
      const prefix = fullMatch.split(/[:=]/)[0];
      sanitized = sanitized.replace(fullMatch, `${prefix}: "[REDACTED_KEY_SECRET]"`);
    }
  }
  if (apiKeysCount > 0 && redactedDetails.length === 0) {
    redactedDetails.push(`Anonymized ${apiKeysCount} Developer API Key(s)`);
  } else if (apiKeysCount > 0) {
    redactedDetails.push(`Anonymized ${apiKeysCount} Developer API Key(s)`);
  }

  // 3. Redact Common Authentication Headers (Authorization: Bearer <token>, etc.)
  const authHeaderRegex = /(Authorization\s*:\s*(?:Bearer|Basic)\s+)([A-Za-z0-9\-_\.\~\+\/\\=]{10,})/gi;
  const authHeadersFound = sanitized.match(authHeaderRegex);
  if (authHeadersFound) {
    credentialsCount += authHeadersFound.length;
    sanitized = sanitized.replace(authHeaderRegex, "$1[REDACTED_AUTHORIZATION_TOKEN]");
  }

  // 4. Redact Database Connection Passwords inside Connection URLs
  // e.g. postgresql://user:password@host:port/db
  const dbUrlPasswordRegex = /([A-Za-z0-9\+]+:\/\/)([^:\s"']+):([^@\s"']+)@/g;
  const dbUrlsFound = sanitized.match(dbUrlPasswordRegex);
  if (dbUrlsFound) {
    credentialsCount += dbUrlsFound.length;
    sanitized = sanitized.replace(dbUrlPasswordRegex, "$1$2:[REDACTED_PASSWORD]@");
  }

  // Also query string passwords: ?password=my_secret or &passwd=secret
  const queryPasswordRegex = /(?:password|passwd|pass|pwd|secret)\s*=\s*([^&\s"'\)\(]+)/gi;
  const queryPasswordsFound = sanitized.match(queryPasswordRegex);
  if (queryPasswordsFound) {
    credentialsCount += queryPasswordsFound.length;
    sanitized = sanitized.replace(queryPasswordRegex, (match) => {
      const parts = match.split("=");
      return `${parts[0]}=[REDACTED_SECRET]`;
    });
  }

  if (credentialsCount > 0) {
    redactedDetails.push(`Sanitized ${credentialsCount} password(s)/access credential(s)`);
  }

  // 5. Redact Public IPv4 Addresses (ignoring common local/internal CIDRs like 127.0.0.1, 10.*, 192.168.*)
  const ipv4Regex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
  const ipsFound = sanitized.match(ipv4Regex);
  if (ipsFound) {
    let maskedIps = 0;
    ipsFound.forEach((ip) => {
      // Exclude loopbacks or common internal ranges to keep debugging contexts helpful
      if (
        !ip.startsWith("127.") && 
        !ip.startsWith("10.") && 
        !ip.startsWith("192.168.") && 
        !ip.startsWith("172.16.") &&
        !ip.startsWith("172.17.") &&
        !ip.startsWith("172.18.") &&
        !ip.startsWith("172.19.") &&
        !ip.startsWith("172.2") &&
        !ip.startsWith("172.3") &&
        ip !== "0.0.0.0"
      ) {
        sanitized = sanitized.replace(ip, "[REDACTED_PUBLIC_IP]");
        maskedIps++;
      }
    });
    if (maskedIps > 0) {
      ipsCount = maskedIps;
      redactedDetails.push(`Masked ${maskedIps} public IPv4 server address(es)`);
    }
  }

  const totalMasked = emailsCount + apiKeysCount + credentialsCount + ipsCount;

  return {
    sanitized,
    totalMasked,
    breakdown: {
      emails: emailsCount,
      ips: ipsCount,
      credentials: credentialsCount,
      apiKeys: apiKeysCount
    },
    redactedDetails
  };
}

/**
 * Interface representing a saved incident analysis session
 */
export interface IncidentHistoryItem {
  id: string;
  timestamp: string;
  logsTitle: string;
  logsPreview: string;
  engineGuess: string;
  lineCount: number;
  report: DiagnosticsReport;
  rawLogs: string;
  durationMs?: number;
}

/**
 * LocalStorage SRE Incident Library Manager
 */
export const HistoryManager = {
  getHistory(): IncidentHistoryItem[] {
    try {
      const data = localStorage.getItem("loghound_incident_history");
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load loghound_incident_history", e);
      return [];
    }
  },

  saveHistoryItem(logs: string, engineGuess: string, lineCount: number, report: DiagnosticsReport, durationMs?: number): IncidentHistoryItem[] {
    try {
      const history = this.getHistory();
      
      // Build brief summary line
      let title = report.root_cause_analysis.category || "Diagnostic Run";
      if (title.length > 40) {
        title = title.substring(0, 37) + "...";
      }

      const newItem: IncidentHistoryItem = {
        id: `inc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toLocaleString(),
        logsTitle: title,
        logsPreview: logs.substring(0, 120).trim() + (logs.length > 120 ? "..." : ""),
        engineGuess,
        lineCount,
        report,
        rawLogs: logs,
        durationMs
      };

      // Put latest first and limit history to 15 items to conserve localStorage space
      const updated = [newItem, ...history].slice(0, 15);
      localStorage.setItem("loghound_incident_history", JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Failed to save incident item to local storage history", e);
      return this.getHistory();
    }
  },

  deleteHistoryItem(id: string): IncidentHistoryItem[] {
    try {
      const history = this.getHistory();
      const updated = history.filter((item) => item.id !== id);
      localStorage.setItem("loghound_incident_history", JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Failed to delete history item", e);
      return this.getHistory();
    }
  },

  clearHistory(): void {
    localStorage.removeItem("loghound_incident_history");
  }
};

/**
 * Dynamic Client-side Traceback Parser (Factual & Non-hallucinatory fallback)
 * Scans tracebacks (Python tracebacks, Node.js exception frames) to extract
 * the actual files, line numbers, error types, and custom tailored suggestions.
 */
export function parseTracebackDynamically(txt: string): DiagnosticsReport | null {
  if (!txt || !txt.trim()) return null;

  // 1. Python Traceback Pattern
  // File "C:\Users\frimo\MJay\backend\tools\telegram_bot.py", line 15, in <module>
  const pythonFileRegex = /File "([^"]+)", line (\d+)(?:, in ([^\s<>]+))?/g;
  const pyMatches: Array<{ file: string; line: string; func: string }> = [];
  let match;
  while ((match = pythonFileRegex.exec(txt)) !== null) {
    pyMatches.push({
      file: match[1],
      line: match[2],
      func: match[3] || "module"
    });
  }

  // Look for python exception message: ImportError: cannot import name '_session_lock' from 'brain.mcp_agent'
  const pyExceptionRegex = /(?:^|\n)([A-Z][A-Za-z0-9_]*(?:Error|Exception)):\s*(.*)/;
  const pyExcMatch = txt.match(pyExceptionRegex);

  if (pyMatches.length > 0) {
    const lastFrame = pyMatches[pyMatches.length - 1];
    const errClass = pyExcMatch ? pyExcMatch[1].trim() : "Python Runtime Error";
    const errorMsg = pyExcMatch ? pyExcMatch[2].trim() : "An exception was raised during execution.";

    const fileNameOnly = lastFrame.file.split(/[\\/]/).pop() || lastFrame.file;
    const isImportError = errClass === "ImportError" || errClass === "ModuleNotFoundError";

    // Build human readable explanation & fixes that do NOT hallucinate unrelated servers or DBs
    const explanation = `Your Python application crashed because of a ${errClass} inside '${fileNameOnly}' at line ${lastFrame.line}. The runtime system reports: "${errorMsg}".`;
    
    const suggestions: Fix[] = [];
    if (isImportError) {
      // Find what exactly failed to import
      const isFromImport = errorMsg.includes("cannot import name");
      let fixSteps = [
        `Open the file '${lastFrame.file}' around line ${lastFrame.line}.`,
        `Verify that the module being imported actually exists, its name is spelled correctly, and its location is inside your search paths.`
      ];

      if (isFromImport) {
        fixSteps.push(`Confirm that the variable, function, or class is correctly named, defined, and exported in the target module.`);
        fixSteps.push(`Check for circular dependency cycles where the target module might also be importing from this file before it finishes loading.`);
      }

      suggestions.push({
        title: `Resolve Import and Export Definitions`,
        steps: fixSteps,
        code_example: `# Check spelling and make sure it matches the export exactly:\n# in ${fileNameOnly} line ${lastFrame.line}:\nfrom <module_name> import <export_name>\n\n# in <module_name>.py:\n# Make sure <export_name> is defined at the top-level!`
      });
    } else if (errClass === "NameError") {
      suggestions.push({
        title: "Define Variable Before Reference",
        steps: [
          `Inspect '${fileNameOnly}' on line ${lastFrame.line} to find the undefined variable.`,
          `Make sure the variable name is spelled exactly right, accounting for case sensitivity.`,
          `Ensure the variable is in scope (initialized locally or declared as 'global' / 'nonlocal' if referencing outer scopes).`
        ],
        code_example: `# Ensure the variable is declared and assigned before calling it:\nmy_variable = "value"\nprint(my_variable)`
      });
    } else if (errClass === "KeyError") {
      suggestions.push({
        title: "Safely Read Dictionary Keys",
        steps: [
          `Verify if the dictionary contains the key before fetching it.`,
          `Use the dictionary '.get()' method to specify a default fallback value if the key does not exist.`
        ],
        code_example: `# Instead of unsafe subscript: value = my_dict["${errorMsg}"]\n# Use safe get method:\nvalue = my_dict.get("${errorMsg.replace(/'/g, "")}", None)`
      });
    } else {
      suggestions.push({
        title: `Investigate ${errClass} on Line ${lastFrame.line}`,
        steps: [
          `Open '${lastFrame.file}' and locate line ${lastFrame.line}.`,
          `Check local values or add print statements/logging prior to line ${lastFrame.line} to trace variable state.`
        ]
      });
    }

    const lines = txt.split(/\r?\n/);
    const relevantSnippets = lines.filter(l => l.includes(`line ${lastFrame.line}`) || l.includes(errClass)).slice(0, 3);

    return {
      severity: "High",
      error_location: {
        file: lastFrame.file,
        line: lastFrame.line,
        function_or_module: lastFrame.func,
        context: pyExcMatch ? pyExcMatch[0].trim() : "Python trace traceback sequence"
      },
      root_cause_analysis: {
        category: errClass,
        technical_summary: `The Python interpreter aborted execution due to a ${errClass} in ${fileNameOnly} on line ${lastFrame.line}.`,
        confidence_score: 98,
        primary_evidence: [pyExcMatch ? pyExcMatch[0].trim() : `Traceback frame at line ${lastFrame.line}`],
        factual_classification: {
          facts: [
            `Language runtime environment is Python`,
            `Crashed with exception type: ${errClass}`,
            `Source location: ${lastFrame.file} (Line ${lastFrame.line})`
          ],
          inferences: [
            isImportError ? `The requested attribute or sub-module was not found or was unavailable at the time of module evaluation.` : `Variables referenced on line ${lastFrame.line} had unexpected values/types during execution.`
          ],
          hypotheses: [
            `Spelling typo in import statements or variable reference.`,
            `Circular dependency lock preventing full compilation.`
          ]
        }
      },
      human_readable_explanation: explanation,
      suggested_fixes: suggestions,
      relevant_log_snippets: relevantSnippets.length > 0 ? relevantSnippets : [lines[lines.length - 1] || "Error traceback"]
    };
  }

  // 2. Node.js Traceback Pattern
  // at Object.<anonymous> (/usr/src/app/server.js:14:17)
  const nodeFileRegex = /at (?:[^\s(]+ \()?([^):]+):(\d+):(\d+)\)?/g;
  const nodeMatches: Array<{ file: string; line: string; col: string }> = [];
  let nodeMatch;
  while ((nodeMatch = nodeFileRegex.exec(txt)) !== null) {
    if (!nodeMatch[1].includes("node:internal") && !nodeMatch[1].includes("node_modules")) {
      nodeMatches.push({
        file: nodeMatch[1],
        line: nodeMatch[2],
        col: nodeMatch[3]
      });
    }
  }

  const nodeExceptionRegex = /(?:^|\n)([A-Z][A-Za-z0-9_]*(?:Error|Exception)):\s*(.*)/;
  const nodeExcMatch = txt.match(nodeExceptionRegex);

  if (nodeMatches.length > 0) {
    const firstFrame = nodeMatches[0];
    const errClass = nodeExcMatch ? nodeExcMatch[1].trim() : "NodeJS Error";
    const errorMsg = nodeExcMatch ? nodeExcMatch[2].trim() : "An unhandled rejection occurred.";

    const fileNameOnly = firstFrame.file.split(/[\\/]/).pop() || firstFrame.file;
    const explanation = `Your Node.js/JavaScript backend failed with a ${errClass}: "${errorMsg}". This happened on line ${firstFrame.line} of '${fileNameOnly}'.`;

    const suggestions: Fix[] = [];
    if (errClass === "TypeError") {
      suggestions.push({
        title: "Verify Object Initialization & Use Optional Chaining",
        steps: [
          `Inspect line ${firstFrame.line} inside '${firstFrame.file}' to find the object being accessed.`,
          `Make sure the parent object is not undefined or null before retrieving its properties.`,
          `Use JavaScript optional chaining (?.) to read properties or call methods safely.`
        ],
        code_example: `// Unsafe property access:\n// const value = data.user.id;\n\n// Safe optional chaining access:\nconst value = data?.user?.id;`
      });
    } else {
      suggestions.push({
        title: `Investigate ${errClass} on Line ${firstFrame.line}`,
        steps: [
          `Open '${firstFrame.file}' and examine line ${firstFrame.line}.`,
          `Check variable states or add debug logging statement prior to this execution frame.`
        ]
      });
    }

    const lines = txt.split(/\r?\n/);
    const relevantSnippets = lines.filter(l => l.includes(`:${firstFrame.line}:`) || l.includes(errClass)).slice(0, 3);

    return {
      severity: "High",
      error_location: {
        file: firstFrame.file,
        line: firstFrame.line,
        function_or_module: "Unknown",
        context: nodeExcMatch ? nodeExcMatch[0].trim() : "NodeJS traceback location"
      },
      root_cause_analysis: {
        category: errClass,
        technical_summary: `NodeJS execution was interrupted due to a ${errClass} on line ${firstFrame.line} of ${fileNameOnly}.`,
        confidence_score: 98,
        primary_evidence: [nodeExcMatch ? nodeExcMatch[0].trim() : `Runtime error on line ${firstFrame.line}`],
        factual_classification: {
          facts: [
            `Runtime engine is NodeJS / V8 JavaScript`,
            `Threw exception of type: ${errClass}`,
            `Source location: ${firstFrame.file} (Line ${firstFrame.line})`
          ],
          inferences: [
            `A variable, property, or imported module accessed on line ${firstFrame.line} was not defined or possessed an unexpected type.`
          ],
          hypotheses: [
            `Asynchronous execution context caused access to state before initialization completed.`,
            `The payload or API response format has changed, returning undefined.`
          ]
        }
      },
      human_readable_explanation: explanation,
      suggested_fixes: suggestions,
      relevant_log_snippets: relevantSnippets.length > 0 ? relevantSnippets : [lines[0] || "Error traceback"]
    };
  }

  return null;
}
