# Nessie OpenClaw Setup Prompt

Paste this into an OpenClaw chat to let the agent install and configure Nessie.

```text
Prompt for Agent
Set up the Nessie OpenClaw plugin.

Install & Configure

Run: openclaw plugins install @nessielabs/nessie-openclaw

Ask the user: "What's your email address? I'll send you a verification code to connect your Nessie account."
Wait for their email, then run:
openclaw nessie init --email EMAIL_PROVIDED_BY_USER

Ask the user: "Check your email for a 6-digit code and paste it here."
Wait for the code, then run:
openclaw nessie init --email THEIR_EMAIL --code CODE_PROVIDED_BY_USER

Run: openclaw nessie status
Confirm it shows "Connected to Nessie."

Test the connection by asking Nessie for a check-in. If the check-in returns profile sections or recent activity, report: "Nessie is connected."

End of agent prompt
```

The OTP flow exchanges the verified email/code for a Nessie agent API key. The
plugin writes that key into the OpenClaw config file with owner-only file
permissions so the hosted Nessie MCP server can authenticate requests through
`Authorization: Bearer <key>`.
