"""
LogHound Analyzer Engine
Handles communication with OpenAI-compatible APIs (including OpenAI and Google Gemini)
to parse and diagnose raw log data.
"""

import os
import json
from typing import Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

import prompts

# Load environment variables
load_dotenv()

class LogAnalyzer:
    """
    LogAnalyzer integrates with OpenAI-compatible API endpoints
    to analyze pasted application or server log snippets.
    """
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        # Allow passing custom keys/endpoints or falling back to environment variables
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
        
        # Check if we are using Gemini API or OpenAI API
        # Gemini provides a fully compatible OpenAI-style endpoint at https://generativelanguage.googleapis.com/v1beta/
        default_base_url = "https://generativelanguage.googleapis.com/v1beta/" if os.getenv("GEMINI_API_KEY") else None
        self.base_url = base_url or os.getenv("API_BASE_URL") or default_base_url
        
        # Default model: gemini-2.5-flash or gpt-4o-mini
        if model:
            self.model = model
        elif os.getenv("GEMINI_API_KEY"):
            # gemini-2.5-flash is extremely powerful and has OpenAI-compatible API routing
            self.model = os.getenv("API_MODEL") or "gemini-2.5-flash"
        else:
            self.model = os.getenv("API_MODEL") or "gpt-4o-mini"
            
        self.client = None
        if self.api_key:
            # Initialize client
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )

    def is_configured(self) -> bool:
        """Checks if the API client is fully initialized with credentials."""
        return self.client is not None

    def analyze_logs(self, log_content: str) -> Dict[str, Any]:
        """
        Sends raw log files to the LLM and extracts a structured diagnostic report.
        
        Args:
            log_content: The string of raw log lines pasted by the user.
            
        Returns:
            A dictionary containing severity, error_location, root_cause_analysis,
            human_readable_explanation, suggested_fixes, and relevant_log_snippets.
        """
        if not log_content.strip():
            raise ValueError("Log content cannot be empty.")
            
        if not self.is_configured():
            raise RuntimeError(
                "API key is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY."
            )
            
        user_prompt = prompts.get_analysis_prompt(log_content)
        
        try:
            # We enforce JSON response format
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompts.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            raw_response = response.choices[0].message.content
            if not raw_response:
                raise RuntimeError("Received empty response from AI model.")
                
            # Parse the JSON response
            return json.loads(raw_response)
            
        except json.JSONDecodeError as jde:
            # In case the model did not output perfect JSON
            raise RuntimeError(
                f"Failed to parse AI diagnostics into structured JSON: {str(jde)}"
            ) from jde
        except Exception as e:
            raise RuntimeError(f"Log analysis failed: {str(e)}") from e
