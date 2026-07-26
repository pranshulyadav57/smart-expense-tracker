const express = require("express");

const http = require("http");

const cors = require("cors");

const dotenv = require("dotenv");

const { Server } = require("socket.io");

const applySecurity = require("./middleware/securityMiddleware");

const { errorHandler } = require("./middleware/errorMiddleware");

const { requireValidEnvironment } = require("./utils/environment");

const logger = require("./utils/logger");

const { standardizeResponse } = require("./utils/responseHandler");
const db = require("./config/db");

dotenv.config();

/* ======================================================
   VALIDATE ENVIRONMENT
====================================================== */

requireValidEnvironment();

/* ======================================================
   EXPRESS APP
====================================================== */

const app = express();

const server = http.createServer(app);

/* ======================================================
   SECURITY
====================================================== */

app.disable("x-powered-by");

/* ======================================================
   APPLY GLOBAL SECURITY
====================================================== */

applySecurity(app);

/* ======================================================
   SOCKET.IO
====================================================== */

const io = new Server(server, {
  cors: {
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:3000",

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ],

    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  logger.info(
    `Socket connected: ${socket.id}`
  );

  socket.on("disconnect", () => {
    logger.info(
      `Socket disconnected: ${socket.id}`
    );
  });
});

/* ======================================================
   CORS
====================================================== */

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:3000",

    credentials: true,
  })
);

/* ======================================================
   BODY PARSER
====================================================== */

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/* ======================================================
   STATIC FILES
====================================================== */

app.use(
  "/public",
  express.static("public")
);

/* ======================================================
   SAFE ROUTE LOADER
====================================================== */

const _failedRouteLoads = [];

const safeRoute = (path, file, options = {}) => {
  try {
    const route = require(file);

    if (!route || typeof route !== "function") {
      throw new Error("Router export must be express.Router()");
    }

    app.use(path, route);

    logger.info(`Loaded route: ${path}`);
  } catch (err) {
    const msg = `Failed to load route: ${file}. Reason: ${err.message}`;
    logger.error(msg);

    // Record failure so we can decide to abort startup later
    _failedRouteLoads.push({ path, file, reason: err.message });
  }
};

/* ======================================================
   ROUTES
====================================================== */

safeRoute(
  "/api/auth",
  "./routes/authRoutes"
);

safeRoute(
  "/api/business",
  "./routes/businessRoutes"
);

safeRoute(
  "/api/student",
  "./routes/studentRoutes"
);

safeRoute(
  "/api/ai",
  "./routes/aiRoutes"
);

// If any mandatory routes failed to load, fail fast when running directly.
if (_failedRouteLoads.length > 0) {
  logger.error('One or more routes failed to load:', { failures: _failedRouteLoads });

  // If this module is the main entrypoint, abort startup so failures are visible.
  if (require.main === module) {
    logger.error('Aborting startup due to route load failures');
    process.exit(1);
  }
}

/* ======================================================
   HEALTH CHECK
====================================================== */
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    return res.json(
      standardizeResponse(
        true,
        {
          uptime: process.uptime(),
          database: true,
        },
        "Health check OK"
      )
    );
  } catch (error) {
    return res.status(503).json(
      standardizeResponse(
        false,
        {
          uptime: process.uptime(),
          database: false,
          error: error.message,
        },
        "Health check failed"
      )
    );
  }
});
app.get("/", (req, res) => {
  res.json(
    standardizeResponse(
      true,
      null,
      "Backend running successfully 🚀"
    )
  );
});

/* ======================================================
   404
====================================================== */

app.use((req, res) => {
  res.status(404).json(
    standardizeResponse(
      false,
      null,
      "Route not found"
    )
  );
});

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */

app.use(errorHandler);

/* ======================================================
   PROCESS ERRORS
====================================================== */

process.on(
  "unhandledRejection",
  (reason, promise) => {
    logger.error("Unhandled Rejection", {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : null,
      promise,
      reason,
    });
  }
);

process.on(
  "uncaughtException",
  (error) => {
    logger.error("Uncaught Exception", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      error,
    });

    process.exit(1);
  }
);

/* ======================================================
   START SERVER
====================================================== */

const DEFAULT_PORT = Number(process.env.PORT) || 5000;

const startServer = (port, attemptsLeft = 5) => {
  server.listen(port, () => {
    logger.info(`🚀 Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} in use. Attempts left: ${attemptsLeft}`);
      server.removeAllListeners('error');

      if (attemptsLeft > 0) {
        setTimeout(() => startServer(port + 1, attemptsLeft - 1), 200);
        return;
      }

      logger.error('Failed to bind server to a free port after multiple attempts', { error: err });
      process.exit(1);
    } else {
      logger.error('Server encountered an unexpected error', { error: err });
      process.exit(1);
    }
  });
};

if (require.main === module) {
  startServer(DEFAULT_PORT);
} else {
  // Export app and startServer for tests
  module.exports = { app, startServer, server };
}
