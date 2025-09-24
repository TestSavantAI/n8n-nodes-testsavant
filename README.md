<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/90e9550b-5035-4c81-bda1-84ea6876f965" />
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/6c31f752-c2ef-4f35-b29b-d08d43afefb1" />
  <img width="400px" height="auto" alt="TestSavant.AI Logo Image" src="https://github.com/user-attachments/assets/90e9550b-5035-4c81-bda1-84ea6876f965" />
</picture>

# TestSavant.AI for n8n

An n8n community node that runs TestSavant.AI Guard safety checks on prompts or model outputs. Use it to detect policy violations (e.g., harmful content) and gate your AI workflows.

- npm: `@testsavant/n8n-nodes-testsavant`
- Repo: https://github.com/TestSavantAI/n8n-nodes-testsavant
- Docs: https://docs.testsavant.ai

## Requirements

- n8n ( self‑hosted or desktop )
- A TestSavant API key ( get one from your TestSavant account at https://app.testsavant.ai )

## Install

- In n8n UI: Settings → Community Nodes → Install → enter:
  ```
  @testsavant/n8n-nodes-testsavant
  ```
- Or via terminal (for self‑hosted setups):
  ```
  npm install @testsavant/n8n-nodes-testsavant
  ```

## Set up credentials

1. In n8n, go to Settings → Credentials → New.
2. Search for “TestSavant.AI API”.
3. Fill in:
  - API Key: your TestSavant API key.
4. Save the credential.

### Get your API key (app.testsavant.ai)

1. Sign in at https://app.testsavant.ai
2. Open your account or workspace settings and go to “API Keys”.
3. Create a new key → give it a name → copy the key value.
4. Paste the key into the “TestSavant.AI API” credential in n8n.

Notes:
- Treat your API key like a password. Store it in n8n credentials only.
- You can revoke/regenerate keys any time from the API Keys page.

#### Create an API Key
<img width="466" height="255" alt="Screenshot 2025-09-24 at 1 59 26 PM" src="https://github.com/user-attachments/assets/6ba1ca56-092b-47b7-8dde-07df36347200" />
<img width="468" height="339" alt="Screenshot 2025-09-24 at 1 59 36 PM" src="https://github.com/user-attachments/assets/17461e43-9a4a-453b-858c-86c84f204e40" />


<img width="1488" height="314" alt="Screenshot 2025-09-24 at 1 59 59 PM" src="https://github.com/user-attachments/assets/ba31988f-9af2-49f4-8462-8f063ffb0206" />

### Create or manage Projects

1. In the TestSavant app, go to “Projects”.
2. Click “New Project”, provide a name and optional description, and save.
3. Your node’s “Project” dropdown will list your projects after you select credentials.
4. Select the project you want to use for guardrailing (its policies/config apply to scans).

#### Use API Key in n8n
<img width="1214" height="455" alt="Screenshot 2025-09-24 at 1 56 06 PM" src="https://github.com/user-attachments/assets/5f2dac3a-9679-4369-8375-eb599f10af1b" />

Credentials are stored securely by n8n.

## Use the node

1. Add “TestSavant.AI” to your workflow.
2. Connect it after a node that produces the text you want to check (e.g., an LLM node).
3. Configure fields:
  - Prompt / Output: strings to validate (you can map from previous node output, e.g. `{{$json.data}}`).
  - Scan Type: Input or Output.
  - Project: loads after selecting credentials. Choose one to continue.
  - Scanners: select which scanners to evaluate.

4. Run the workflow.

The node processes one item per incoming item, so it fits naturally in n8n pipelines.

<img width="1438" height="769" alt="Screenshot 2025-09-23 at 6 31 57 PM" src="https://github.com/user-attachments/assets/4659bd7f-96ff-42ef-874b-ce84689e0b20" />

<img width="1768" height="923" alt="Screenshot 2025-09-23 at 6 33 37 PM" src="https://github.com/user-attachments/assets/cdb5a3f8-08a3-4c77-93a3-a07d674bc781" />

## Input/Output

- Input
  - Expects an item with a string field you map to “Text”.

- Output
  - Two outputs: the first is “valid”, the second is “not valid”.
  - Each output item contains safety evaluation details:
    ```json
    [
      {
        "valid": true,
        "prompt": "test message",
        "output": "",
        "result": {
          "sanitized_prompt": "test message",
          "is_valid": true,
          "scanners": {
            "PromptInjection:base": -1,
          },
          "validity": {
            "PromptInjection:base": true,
          }
        }
      }
    ]
    ```
  - Inspect the node’s output panel in n8n to see the exact structure.

## Common patterns

- Guard an LLM:
  - LLM node → TestSavant.AI → If node (check `testsavant.decision !== "allow"`) → handle violations.
- Pre‑check user input:
  - Webhook → TestSavant.AI (Mode: Prompt) → proceed or reject.

## What is guardrailing?

Guardrailing evaluates prompts and/or model outputs to detect policy violations and risky behavior before results are used or returned. Typical checks include:
- Prompt injection and jailbreak attempts
- PII leakage and data exfiltration
- Toxicity, hate speech, violence, sexual content
- Custom organization policies configured per project

With a selected Project, the node applies your project’s policies and thresholds and returns a decision and per‑scanner details. Use the decision to allow, block, or route for human review.

## Error handling

- 401/403: Invalid or missing API key. Recheck the credential.
- 429: Rate limited. Add retry/Wait node or reduce throughput.
- Timeouts: Increase timeout in the node (Advanced) or in n8n global settings.
- Don’t want the workflow to stop on violation? Enable “Continue On Fail” in the node so the item is annotated instead of throwing.

## Development

- Local build:
  ```
  npm run build
  ```
- Deploy to your local n8n user directory (macOS):
  ```
  npm run deploy
  ```
- Lint/format:
  ```
  npm run lint
  npm run format
  ```

## Support

- Issues: https://github.com/TestSavantAI/n8n-nodes-testsavant/issues
- Docs: https://docs.testsavant.ai

## License

MIT
