if (process.env.NODE_ENV !== 'production') {
  require('dotenv/config');
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Seed audit logs from existing system data (runs once on startup if logs are empty)
async function seedAuditLogs() {
  try {
    const existing = await storage.getAuditLogs({ limit: 1 });
    if (existing.length > 0) return; // Already seeded

    const users = await storage.getUsers();
    const members = await storage.getGroupMembers ? [] : [];
    const systemIp = '127.0.0.1';
    const sysAgent = 'FEFA-System/1.0';

    // Log system start
    await storage.createAuditLog({
      action: 'SYSTEM_STARTUP',
      entityType: 'system',
      performedByType: 'staff',
      performedByName: 'System',
      details: { version: '1.0', environment: process.env.NODE_ENV || 'development' },
      ipAddress: systemIp,
      userAgent: sysAgent,
      location: 'Local / Internal',
    });

    // Log each existing user as USER_CREATED
    for (const user of users) {
      await storage.createAuditLog({
        action: 'USER_CREATED',
        entityType: 'user',
        entityId: user.id,
        performedByType: 'staff',
        performedByName: 'System Administrator',
        details: { newUserName: `${user.firstName} ${user.lastName}`, role: user.role, userId: user.userId },
        ipAddress: systemIp,
        userAgent: sysAgent,
        location: 'Local / Internal',
      });
    }

    // Log recent transactions if any
    const groups = await storage.getGroups();
    for (const group of groups) {
      await storage.createAuditLog({
        action: 'GROUP_CREATED',
        entityType: 'group',
        entityId: group.id,
        performedByType: 'staff',
        performedByName: 'System Administrator',
        groupId: group.id,
        details: { groupName: group.name, location: group.location, interestRate: group.interestRate },
        ipAddress: systemIp,
        userAgent: sysAgent,
        location: 'Local / Internal',
      });

      const groupMembers = await storage.getGroupMembers(group.id);
      for (const member of groupMembers) {
        await storage.createAuditLog({
          action: 'MEMBER_ENROLLED',
          entityType: 'member',
          entityId: member.id,
          performedByType: 'staff',
          performedByName: 'System Administrator',
          groupId: group.id,
          details: { memberName: `${member.firstName} ${member.lastName}`, groupRole: member.groupRole, phone: member.phone },
          ipAddress: systemIp,
          userAgent: sysAgent,
          location: 'Local / Internal',
        });
      }

      const txns = await storage.getGroupTransactions(group.id);
      for (const txn of txns.slice(0, 20)) {
        const actionMap: Record<string, string> = {
          savings: 'SAVINGS_CREATED',
          loan_disbursement: 'LOAN_CREATED',
          loan_payment: 'LOAN_PAYMENT_MADE',
          welfare: 'WELFARE_CREATED',
          fine: 'FINE_CREATED',
        };
        await storage.createAuditLog({
          action: actionMap[txn.type] || 'TRANSACTION_CREATED',
          entityType: 'transaction',
          entityId: txn.id,
          performedByType: 'staff',
          performedByName: 'System Administrator',
          groupId: group.id,
          details: { type: txn.type, amount: txn.amount, description: txn.description },
          ipAddress: systemIp,
          userAgent: sysAgent,
          location: 'Local / Internal',
        });
      }
    }

    log('Audit log seeding complete');
  } catch (err) {
    console.error('Audit log seeding error:', err);
  }
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const listenOptions: any = {
    port,
    host: process.env.RENDER ? "0.0.0.0" : (process.env.HOST || "127.0.0.1"),
  };
  if (process.platform !== 'win32') {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
    // Seed audit logs from existing data (no-op if already seeded)
    // seedAuditLogs();
  });
})();
