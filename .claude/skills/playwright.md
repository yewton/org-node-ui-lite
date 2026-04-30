# Playwright Best Practices

- **Browsers Path:** Do not hardcode `PLAYWRIGHT_BROWSERS_PATH` in `package.json` scripts. This allows local runs to use default cached browsers and avoid slow installations. It should only be explicitly set in CI environments.
- **Global Setup Processes:** When spawning a background process from `global-setup.ts`, use `detached: true`, `stdio: "ignore"`, and `process.unref()`. Otherwise, the process may receive `SIGPIPE` and crash when the `globalSetup` Node.js process exits.
- **WebServer Deadlock:** The `webServer` config starts and polls its `url` *before* `globalSetup` runs. Pointing `webServer.url` to an endpoint that depends on a backend started in `globalSetup` will cause a deadlock.
