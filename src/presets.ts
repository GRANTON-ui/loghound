export interface LogMetadata {
  engineGuess: string;
  lineCount: number;
  hasTimestamps: boolean;
}

export interface Fix {
  title: string;
  steps: string[];
  code_example?: string | null;
}

export interface DiagnosticsReport {
  severity: "Critical" | "High" | "Medium" | "Low";
  error_location: {
    file: string;
    line: string;
    function_or_module: string;
    context: string;
  };
  root_cause_analysis: {
    category: string;
    technical_summary: string;
    confidence_score?: number;
    primary_evidence?: string[];
    factual_classification?: {
      facts?: string[];
      inferences?: string[];
      hypotheses?: string[];
    };
  };
  secondary_contributors?: {
    title: string;
    confidence_score: number;
    evidence?: string[];
  }[];
  timeline?: {
    timestamp: string;
    event: string;
    description: string;
    classification: "Fact" | "Inference" | "Hypothesis";
  }[];
  multi_agent_transcript?: {
    agent: string;
    action: string;
    findings: string;
  }[];
  human_readable_explanation: string;
  suggested_fixes: Fix[];
  relevant_log_snippets: string[];
}

// Pre-defined real log profiles
export const PRESETS = [
  {
    title: "PostgreSQL Connection Limit",
    logs: `2026-06-25 10:14:02.128 UTC [4852] FATAL: remaining connection slots are reserved for non-replication superuser connections
2026-06-25 10:14:02.128 UTC [4852] DETAIL: Connection pool max_connections limit of 100 exceeded.
2026-06-25 10:14:02.135 UTC [4901] ERROR: database connection failed in django.db.backends.postgresql
Traceback (most recent call last):
  File "django/db/backends/base/base.py", line 220, in ensure_connection
    self.connect()
  File "django/db/backends/postgresql/base.py", line 191, in connect
    connection = Database.connect(**conn_params)
psycopg2.OperationalError: FATAL: remaining connection slots are reserved for non-replication superuser connections`
  },
  {
    title: "Kubernetes Exit Code 137 (OOM)",
    logs: `Events:
  Type     Reason       Age                    From               Message
  ----     ------       ----                   ----               -------
  Normal   Scheduled    3m20s                  default-scheduler  Successfully assigned web-app-7d9fc to node-12
  Normal   Pulling      3m18s                  kubelet            Pulling image "node:20-alpine"
  Normal   Pulled       3m10s                  kubelet            Successfully pulled image "node:20-alpine" in 8s
  Normal   Created      3m10s                  kubelet            Created container web-server
  Normal   Started      3m09s                  kubelet            Started container web-server
  Warning  BackOff      42s (x8 over 2m15s)   kubelet            Back-off restarting failed container
  Warning  Failed       12s (x3 over 2m30s)   kubelet            Container web-server failed with Exit Code 137 (OOMKilled)`
  },
  {
    title: "Django CSRF Cookie Missing",
    logs: `[25/Jun/2026 13:02:18] WARNING [django.security.csrf:224] Forbidden (CSRF cookie not set.): /api/v1/payment/submit
[25/Jun/2026 13:02:18] "POST /api/v1/payment/submit HTTP/1.1" 403 2871
Traceback (most recent call last):
  File "django/core/handlers/exception.py", line 55, in inner
    response = get_response(request)
  File "django/core/handlers/base.py", line 197, in _get_response
    response = wrapped_callback(request, *callback_args, **callback_kwargs)
django.core.exceptions.PermissionDenied: CSRF cookie not set.`
  },
  {
    title: "Node.js Missing Module",
    logs: `node:internal/modules/cjs/loader:1144
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
    at Module._compile (node:internal/modules/cjs/loader:1255:14)`
  }
];

// Beautiful static initial sample report matching PostgreSQL Connection limit,
// so the user starts with a gorgeous high-fidelity interface instead of a blank screen.
export const SAMPLE_REPORT: DiagnosticsReport = {
  severity: "High",
  error_location: {
    file: "django/db/backends/postgresql/base.py",
    line: "191",
    function_or_module: "django.db.backends.postgresql",
    context: "Database.connect(**conn_params)"
  },
  root_cause_analysis: {
    category: "Database Connection Overload",
    technical_summary: "The system has exhausted all 100 available client connection slots on the PostgreSQL database instance. Django is failing to establish new database connections, raising a fatal OperationalError. This is likely caused by an missing connection pool management system, runaway long-lived transactions, or a traffic spike.",
    confidence_score: 95,
    primary_evidence: [
      "DETAIL: Connection pool max_connections limit of 100 exceeded.",
      "psycopg2.OperationalError: FATAL: remaining connection slots are reserved for non-replication superuser connections"
    ],
    factual_classification: {
      facts: [
        "FATAL: remaining connection slots are reserved error was thrown at 10:14:02.128",
        "The connection pool max_connections limit is configured to exactly 100"
      ],
      inferences: [
        "The application is not using connection pooling, creating a new socket connection per HTTP request",
        "A traffic spike or open unclosed transactions are holding connection slots open indefinitely"
      ],
      hypotheses: [
        "An background cron task is spawning nested, unclosed sub-threads that leak database handles"
      ]
    }
  },
  secondary_contributors: [
    {
      title: "Missing PgBouncer Middleware Proxy",
      confidence_score: 88,
      evidence: ["Connection parameters list direct host connection instead of a transaction pooler."]
    },
    {
      title: "Django Transaction Middleware Leak",
      confidence_score: 72,
      evidence: ["Long-running middleware block delaying transaction commit or rollback cycles."]
    }
  ],
  timeline: [
    {
      timestamp: "10:14:02.128",
      event: "DB Slots Exhausted",
      description: "PostgreSQL internal process logs connection count hitting the hard max_connections ceiling of 100 limit.",
      classification: "Fact"
    },
    {
      timestamp: "10:14:02.130",
      event: "Superuser Reservation Lockout",
      description: "Subsequent client connection requests from Django are blocked, reserving remaining slots for administrative recovery tools.",
      classification: "Inference"
    },
    {
      timestamp: "10:14:02.135",
      event: "Django Backend Cascade Failure",
      description: "django.db.backends raises OperationalError, causing subsequent HTTP requests to throw 500 Server Errors.",
      classification: "Fact"
    }
  ],
  multi_agent_transcript: [
    {
      agent: "Triage Specialist (Cohere: North Mini)",
      action: "Analyzed Django Exception Stack trace and isolated PostgreSQL detail block.",
      findings: "Identified that the connection failure originates directly inside base.py:191 during a Database.connect() call. Root error is a PostgreSQL FATAL state rather than Python runtime syntax."
    },
    {
      agent: "Factual Auditor (Google: Gemma 4)",
      action: "Calculated confidence parameters based on explicit raw log snippets.",
      findings: "Calculated 95% confidence based on absolute match of 'FATAL: remaining connection slots' detail logs. Classified DB pool exhaustion as Fact, and traffic spike as strong Inference."
    },
    {
      agent: "Lead SRE Coordinator (OpenAI: GPT-OSS)",
      action: "Compiled mitigation steps and generated C-level code fix modules.",
      findings: "Synthesized direct code fixes including Django database pool configuration parameters (CONN_MAX_AGE) and transaction proxies like PgBouncer."
    }
  ],
  human_readable_explanation: "Your application crashed because too many users or tasks tried talking to the database at the exact same millisecond. Think of your database as a room with exactly 100 seats: all 100 seats got taken, so the door locked and blocked further entries. To prevent this, we should enable 'CONN_MAX_AGE' in Django to reuse seats (connection pooling) or use a database proxy (PgBouncer) that manages the line of incoming database requests efficiently.",
  suggested_fixes: [
    {
      title: "Enable Django Native Connection Lifespan",
      steps: [
        "Navigate to settings.py inside your Django project.",
        "Update the DATABASES setting for your default database to include 'CONN_MAX_AGE': 600.",
        "This persistent connection mechanism reuses existing socket connections for 10 minutes rather than spawning new ones every query."
      ],
      code_example: `DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'production_db',
        'USER': 'loghound_app',
        'HOST': 'db.internal.net',
        'PORT': '5432',
        'CONN_MAX_AGE': 600, # Reuse db sockets for 10 mins
        'OPTIONS': {
            'sslmode': 'require',
        }
    }
}`
    },
    {
      title: "Deploy PgBouncer Transaction Proxy",
      steps: [
        "Deploy a PgBouncer sidecar container or service in front of your PostgreSQL cluster.",
        "Configure PgBouncer settings in pgbouncer.ini to operate in 'transaction' pool mode.",
        "Redirect Django HOST configuration parameters to point to the PgBouncer proxy port (default: 6432) instead of direct database port."
      ],
      code_example: `[databases]
production_db = host=db.internal.net port=5432 dbname=production_db

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction # Share connections during transactions
max_client_conn = 1000  # Django can open up to 1000 client sockets
default_pool_size = 50  # Keeps max database slots under 100`
    }
  ],
  relevant_log_snippets: [
    "2026-06-25 10:14:02.128 UTC [4852] FATAL: remaining connection slots are reserved for non-replication superuser connections",
    "2026-06-25 10:14:02.128 UTC [4852] DETAIL: Connection pool max_connections limit of 100 exceeded."
  ]
};
