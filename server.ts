import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit increased to support large logs
  app.use(express.json({ limit: "5mb" }));

  // API Config check to see what credentials are set on the server
  app.get("/api/config", (req: Request, res: Response) => {
    res.json({
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasOpenrouterKey: !!process.env.OPENROUTER_API_KEY,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
    });
  });

  // API Endpoint for Log Analysis
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { logs, model = "google/gemma-4-31b-it:free", provider = "openrouter", apiKey = "", codebaseFiles = [] } = req.body;

      if (!logs || typeof logs !== "string" || !logs.trim()) {
        res.status(400).json({ error: "Log content is required and must be a string." });
        return;
      }

      const systemInstruction = `You are an elite team of cooperative principal software reliability engineers (LogHound Multi-Agent SRE Team) operating together to diagnose logs.
Your team consists of three expert agents:
1. **Triage Specialist (Cohere: North Mini)**: Focuses on mapping incident chronology, locating stack traces, files, lines, and isolating raw log evidence.
2. **Factual Auditor (Google: Gemma 4)**: Focuses on separating observable facts from inferences/hypotheses, computing confidence scores, and identifying secondary factors.
3. **Lead SRE Coordinator (OpenAI: GPT-OSS)**: Synthesizes the final explanations, ranks contributors, outlines actionable step-by-step code remediations, and outputs the final report.

CRITICAL ANTI-HALLUCINATION & FACTUAL INTEGRITY DIRECTIVES:
- NO HALLUCINATIONS: You are strictly forbidden from making assumptions, guessing, or fabricating details that are not explicitly present in the provided logs or codebase files context.
- NO UNNECESSARY REASONS: Do not invent external databases, third-party APIs, network routes, container cluster failures, or downstream services unless they are mentioned explicitly in the raw logs or codebase.
- ABSOLUTE TRUTHFULNESS: If the log does not contain a file name, line number, or module, and it cannot be identified from the codebase context, set the corresponding field to "Unknown" or "N/A". NEVER invent folders, paths, or code files.
- NO FICTIONAL METADATA: In the timeline and root cause analysis, only log observable, real events directly verifiable from the provided text.
- EXACT RELEVANT LOG SNIPPETS: Under the "relevant_log_snippets" field, only return verbatim lines directly extracted from the provided text segment. Do not modify or invent log lines.

Analyze the logs carefully as a team to identify the primary error, construct a precise chronological incident timeline, compile confidence & evidence scores, and suggest discrete source-code remedies.

You must respond ONLY with a valid JSON object matching this schema. Do not include any markdown code wrappers (like \`\`\`json) or any introductory text.

JSON Schema:
{
  "severity": "Critical" | "High" | "Medium" | "Low",
  "error_location": {
    "file": "string or 'Unknown'",
    "line": "string/number or 'Unknown'",
    "function_or_module": "string or 'Unknown'",
    "context": "string or 'Unknown' (e.g. database query, HTTP endpoint, system daemon)"
  },
  "root_cause_analysis": {
    "category": "string (e.g., Connection Error, Out of Memory, Permission Denied, Syntax Error)",
    "technical_summary": "string (a precise, 1-2 sentence technical summary of what triggered the failure)",
    "confidence_score": number (percentage between 0 and 100),
    "primary_evidence": [
      "string (highly specific, discrete evidence point extracted from raw log content supporting this root cause)"
    ],
    "factual_classification": {
      "facts": [
        "string (directly observable facts in the logs, e.g., 'ConnectTimeout at payment-service')"
      ],
      "inferences": [
        "string (strongly supported logical deductions, e.g., 'Failure repeated 3 times, suggesting a network hang')"
      ],
      "hypotheses": [
        "string (possible explanations not fully proven, e.g., 'Downstream payment gateway provider was under maintenance')"
      ]
    }
  },
  "secondary_contributors": [
    {
      "title": "string (name of the secondary factor contributing to or compounding the issue)",
      "confidence_score": number (percentage between 0 and 100),
      "evidence": [
        "string (evidence supporting this contributor)"
      ]
    }
  ],
  "timeline": [
    {
      "timestamp": "string (timestamp/time offset or logical step, e.g. '14:02:11.450' or 'Step 1')",
      "event": "string (short event title, e.g., 'Database Pool Maxed Out')",
      "description": "string (brief details of what occurred)",
      "classification": "Fact" | "Inference" | "Hypothesis"
    }
  ],
  "multi_agent_transcript": [
    {
      "agent": "Triage Specialist (Cohere: North Mini)",
      "action": "string (what action this agent took)",
      "findings": "string (key insights compiled by this agent)"
    },
    {
      "agent": "Factual Auditor (Google: Gemma 4)",
      "action": "string (what action this agent took)",
      "findings": "string (verification and confidence levels calculated)"
    },
    {
      "agent": "Lead SRE Coordinator (OpenAI: GPT-OSS)",
      "action": "string (what action this agent took)",
      "findings": "string (final syntheses and mitigation strategy)"
    }
  ],
  "human_readable_explanation": "string (a clear, jargon-free explanation of the error suitable for junior developers or support staff, explaining what happened and why)",
  "suggested_fixes": [
    {
      "title": "string (name of the fix)",
      "steps": [
        "string (detailed actionable step 1)",
        "string (detailed actionable step 2)"
      ],
      "code_example": "string or null (optional code snippet, shell command, or config block illustrating the fix)"
    }
  ],
  "relevant_log_snippets": [
    "string (the exact, unmodified lines of log that directly capture or contain the error)"
  ]
}`;

      let codebaseText = "";
      if (codebaseFiles && Array.isArray(codebaseFiles) && codebaseFiles.length > 0) {
        codebaseText = `\n\nAdditionally, the user has connected the following relevant codebase files or directory structure for deep context. Use these real files to analyze the logs, trace lines of code, map the exact file paths, and provide precise, complete, actionable line-by-line code modifications or replacements that resolve the errors:\n\n`;
        codebaseFiles.forEach((file: any) => {
          if (file && file.name && file.content) {
            codebaseText += `=== START FILE PATH: ${file.name} ===\n${file.content}\n=== END FILE PATH: ${file.name} ===\n\n`;
          }
        });
      }

      const userPrompt = `Please analyze the following raw log segment:

--- START OF LOGS ---
${logs}
--- END OF LOGS ---
${codebaseText}

Analyze the log, locate the error or primary failure, categorize its severity, determine the root cause, construct a plain-English explanation, detail step-by-step actionable remedies, and extract the key log lines.

Strict Instruction: You must NOT hallucinate or assume any information that is not in the logs or codebase context provided above. If details (like file path, line number, or specific database/service name) are absent from both the logs and the codebase files, leave them as "Unknown". If codebase context is provided, cross-reference it with the logs to determine the exact files and lines that require modification. Focus 100% on providing actual, discrete, line-by-line fixes and complete code replacement example blocks targeting the provided codebase files to resolve the traceback or error messages. Provide your answer strictly as the specified JSON object.`;

      let responseText = "";

      // Dynamic routing to active provider
      if (provider === "openrouter") {
        const actualKey = apiKey || process.env.OPENROUTER_API_KEY;
        if (!actualKey) {
          res.status(400).json({ error: "OpenRouter API Key is required. Please set it in Settings." });
          return;
        }
        const client = new OpenAI({
          apiKey: actualKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "LogHound SRE",
          }
        });
        const completion = await client.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1
        });
        responseText = completion.choices[0]?.message?.content || "";
      } else if (provider === "openai") {
        const actualKey = apiKey || process.env.OPENAI_API_KEY;
        if (!actualKey) {
          res.status(400).json({ error: "OpenAI API Key is required. Please set it in Settings." });
          return;
        }
        const client = new OpenAI({
          apiKey: actualKey,
          baseURL: "https://api.openai.com/v1",
        });
        const completion = await client.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1
        });
        responseText = completion.choices[0]?.message?.content || "";
      } else if (provider === "gemini") {
        const actualKey = apiKey || process.env.GEMINI_API_KEY;
        if (!actualKey) {
          res.status(400).json({ error: "Google Gemini API Key is required. Please set it in Settings." });
          return;
        }
        // Gemini OpenAI compatibility endpoint
        const client = new OpenAI({
          apiKey: actualKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        });
        const completion = await client.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1
        });
        responseText = completion.choices[0]?.message?.content || "";
      } else if (provider === "anthropic") {
        const actualKey = apiKey || process.env.ANTHROPIC_API_KEY;
        if (!actualKey) {
          res.status(400).json({ error: "Anthropic API Key is required. Please set it in Settings." });
          return;
        }
        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": actualKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 4000,
            system: systemInstruction,
            messages: [
              { role: "user", content: userPrompt }
            ],
            temperature: 0.1
          })
        });
        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          throw new Error(`Anthropic API Error: ${errorText}`);
        }
        const data = await anthropicResponse.json();
        responseText = data.content?.[0]?.text || "";
      } else {
        throw new Error(`Unsupported API Provider: ${provider}`);
      }

      if (!responseText) {
        throw new Error("No response content returned from the AI Provider API.");
      }

      // Robust JSON extraction matching first { and last }
      let cleanedText = responseText.trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      const parsedData = JSON.parse(cleanedText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Analysis route error:", error);
      res.status(500).json({ 
        error: error.message || "An unexpected error occurred during diagnostics." 
      });
    }
  });

  // Serve static assets in development & production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LogHound backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
