# Using the UX Writing Skill with Figma

Connect this skill to Figma so your agent can review and improve UX copy directly from your designs. Perfect for content designers, product designers, and anyone who needs to audit or enhance UX text in Figma mockups.

## What You Can Do

Once connected, you can:
- **Share Figma frame links** with your agent and get instant UX writing feedback
- **Audit existing designs** for accessibility, clarity, and tone
- **Generate improved copy** that follows best practices
- **Review entire flows** for consistency and voice
- **Get specific suggestions** based on the four quality standards (purposeful, concise, conversational, clear)

## Quick Example

```
Here's my login screen: [Figma link]

Review all the UX copy using the UX Writing Skill. Check for:
- Accessibility (screen reader compatibility, plain language)
- Error message clarity
- Button labels
- Tone consistency
```

Your agent will analyze the design, identify all text elements, and provide detailed feedback with specific improvements.

---

## Setup: Connect Figma to Your Agent

Choose the setup guide for your agent:

- [Claude Code](#setup-claude-code)
- [Codex](#setup-codex)
- [Cursor](#setup-cursor)

---

### Setup: Claude Code

There are two ways to connect Figma to Claude Code. **Choose the Remote Server option** unless you have specific requirements for the Desktop Server.

#### Option 1: Remote Server (Recommended)

**Best for:** Quick setup, working from anywhere, no Figma desktop app needed

**Requirements:**
- Claude Code installed
- Figma account (Starter, Professional, Organization, or Enterprise plan)
- Internet connection

**Step 1: Install Figma MCP**

1. Open your terminal
2. Run this command:
   ```bash
   claude mcp add --transport http figma https://mcp.figma.com/mcp
   ```

**Step 2: Restart Claude Code**

Completely quit Claude Code and reopen it.

**Step 3: Authenticate with Figma**

1. In Claude Code, type: `/mcp`
2. Find the "figma-remote-mcp" server
3. If it shows "disconnected", press Enter on that line
4. A browser window will open — click **"Allow access"**

**Step 4: Verify**

Ask Claude: `Do you have access to Figma?`

Claude should confirm the connection and describe what it can do.

---

#### Option 2: Desktop Server

**Best for:** Working locally, no internet dependency once set up

**Requirements:**
- Figma desktop app (latest version)
- Claude Code installed
- Dev Mode access in Figma

**Step 1: Enable MCP in Figma Desktop**

1. Open the Figma desktop app
2. Open any design file
3. Press `Shift + D` to switch to **Dev Mode**
4. In the right panel, scroll to the **MCP server** section
5. Click **"Enable desktop MCP server"**

**Step 2: Connect Claude Code**

```bash
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

**Step 3: Restart Claude Code** and verify with: `Do you have access to Figma?`

**Note:** The Figma desktop app must be running with Dev Mode enabled whenever you use this integration.

---

### Setup: Codex

**Requirements:**
- Codex CLI or IDE extension installed
- Figma account
- Internet connection

**Step 1: Configure Codex for MCP**

Open `~/.codex/config.toml` and add:

```toml
[features]
rmcp_client = true

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
```

**Step 2: Install Codex CLI** (if not already installed)

```bash
npm i -g @openai/codex
```

**Step 3: Authenticate with Figma**

```bash
codex mcp login figma
```

This opens a browser window for authentication. Follow the prompts to allow Codex to access your Figma account.

**Step 4: Restart your IDE**

If using Codex in an IDE, completely restart it to activate the MCP connection.

**Step 5: Verify**

Paste a Figma Dev Mode section link into Codex and ask it to review the UX copy. Codex should access the frame and respond with feedback.

---

### Setup: Cursor

**Requirements:**
- Cursor installed
- Figma account
- Internet connection

**Step 1: Add Figma MCP to Cursor**

Open your Cursor MCP configuration (`.cursor/mcp.json` in your project, or the global config at `~/.cursor/mcp.json`) and add:

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp",
      "transport": "http"
    }
  }
}
```

**Step 2: Restart Cursor**

Completely quit and reopen Cursor.

**Step 3: Authenticate with Figma**

Open the MCP panel in Cursor settings, find the Figma server, and follow the authentication prompts to connect your Figma account.

**Step 4: Verify**

Ask Cursor: `Do you have access to Figma?`

Cursor should confirm the connection.

---

## How to Use

### Share a Figma Link

**Step 1: Get the link**

1. Open your design in Figma
2. Select the frame you want to review
3. Right-click and select **"Copy link"** (or copy the URL from your browser)
   - For Codex, use the **Dev Mode** section link (`Shift + D`, then copy the section link)

**Step 2: Share with your agent**

```
Review the UX copy in this login screen:
https://www.figma.com/file/abc123/Design?node-id=123-456

Focus on:
- Button labels
- Error messages
- Form field labels
```

**Step 3: Get feedback**

Your agent will access the frame, extract all text elements, apply the UX Writing Skill, and provide specific, actionable feedback.

---

### Review an Entire Flow

```
Review all UX copy in this onboarding flow:
https://www.figma.com/file/abc123/Onboarding-Flow

Check for:
- Tone consistency across all screens
- Reading level (target 7th-8th grade)
- Accessibility (screen reader compatibility)
- Button label clarity
```

---

### Get Rewritten Copy

```
Here's my error state: [Figma link]

Rewrite all the copy following UX writing best practices:
- Make it more concise
- Add specific recovery steps
- Ensure screen reader accessibility
- Use empathetic tone
```

---

## Example Workflows

### 1. Design Review (Quick Audit)

```
I need to review copy in this checkout flow before launch:
[Figma link to checkout screens]

Using the UX Writing Skill, audit for:
- Accessibility issues
- Sentence length (should be under 20 words)
- Button labels (should be specific, not generic)
- Error message clarity
- Consistency across screens

Provide a prioritized list of issues.
```

### 2. Voice and Tone Check

```
Review the tone in these empty states:
[Figma link]

Our voice is: helpful, friendly, professional
Check if the copy matches this voice and suggest improvements.
Use the tone adaptation framework from the UX Writing Skill.
```

### 3. Accessibility Audit

```
Audit this form for accessibility:
[Figma link to form]

Using accessibility guidelines from the UX Writing Skill, check:
- Screen reader compatibility
- Form labels (visible, not just placeholders)
- Error messages (descriptive, actionable)
- Plain language (7th-8th grade reading level)
- Link text (descriptive, not "click here")
```

### 4. Before/After Improvements

```
Here's my current error screen: [Figma link]

Using the UX Writing Skill:
1. Score the current copy against the 4 quality standards
2. Identify specific problems
3. Provide a rewritten version
4. Explain what changed and why
```

### 5. Cross-Platform Consistency

```
Compare copy across these three platforms:
- Web: [Figma link 1]
- iOS: [Figma link 2]
- Android: [Figma link 3]

Check for:
- Terminology consistency
- Tone consistency
- Platform-specific conventions (e.g., "tap" vs "click")
- Character count appropriateness for each platform
```

### 6. Complete UX Audit Workflow

```
I'm reviewing our checkout flow before launch. Here are the 4 key frames:

1. Cart: [Figma link]
2. Shipping: [Figma link]
3. Payment: [Figma link]
4. Confirmation: [Figma link]

Using the UX Writing Skill, perform a complete audit:

Check for:
- All 4 quality standards (purposeful, concise, conversational, clear)
- Accessibility (screen readers, reading level, plain language)
- Error messages (empathetic, actionable, specific)
- Form labels (visible, descriptive, not placeholder-only)
- Button labels (specific verbs, not generic)
- Voice consistency across all screens
- Appropriate tone for context

Provide:
1. Overall score (1–10) with explanation
2. Critical issues (must fix before launch)
3. Recommended improvements (nice to have)
4. Rewritten copy for any critical issues
5. Summary of patterns used well

Format as a design review report.
```

---

## Tips for Best Results

### Be Specific About What You Want

❌ **Too vague:**
> "Review this design: [link]"

✅ **Better:**
> "Review the error messages in this form: [link]. Check for accessibility, clarity, and actionable guidance."

### Reference Multiple Frames for Context

```
Review this 3-step onboarding flow:
1. Welcome screen: [link]
2. Account setup: [link]
3. Preferences: [link]

Check for consistent voice and progressive disclosure of information.
```

### Ask for Specific Frameworks

```
Use the tone adaptation framework to suggest appropriate tone for this error state: [link]
```

```
Score this against the content usability checklist: [link]
```

### Explicitly Mention the Skill

For best results, explicitly mention the UX Writing Skill in your prompts — especially in Codex and Cursor:

```
Using the UX Writing Skill, review this design: [link]
```

In **Codex**, you can also invoke it directly:

```
$ux-writing Review the UX copy in this design: [Figma link]
```

Or use the `/skills` command to select it from the list.

In **Cursor**, reference it in your prompt:

```
@ux-writing Review the copy in this design: [Figma link]
```

---

## Troubleshooting

### "I don't have access to that Figma file"

1. Make sure the file is set to "Anyone with the link can view"
2. Check that you're signed into the same Figma account you authenticated with
3. Try copying the link again — it may have been truncated or expired
4. For Codex, make sure you're using a Dev Mode section link, not just the file URL

### MCP server is disconnected

**Claude Code:**
1. Type `/mcp` in Claude Code
2. Find the Figma server and press Enter to reconnect
3. Re-authenticate if prompted

**Codex:**
1. Verify `~/.codex/config.toml` has the correct configuration
2. Re-run `codex mcp login figma`
3. Restart your IDE completely

**Cursor:**
1. Open Cursor settings and check the MCP panel
2. Reconnect or re-authenticate the Figma server
3. Restart Cursor if needed

### "I can't see the MCP server section in Figma"

This applies to the Claude Code Desktop Server option only:
1. Update to the latest Figma desktop app version
2. Make sure you're in Dev Mode (`Shift + D`)
3. Check that your Figma plan includes Dev Mode access

### The skill doesn't seem to activate

Explicitly mention it in your prompt:

```
Using the UX Writing Skill, review this design: [link]
```

Or ask your agent to apply specific frameworks:

```
Apply the four quality standards (purposeful, concise, conversational, clear) to this copy: [link]
```

---

## Advanced Usage

### Create Documentation from Designs

```
Review all copy in this feature: [link]

Create a content patterns document showing:
- Common patterns we use (buttons, errors, empty states)
- Voice characteristics
- Terminology conventions
- Do/don't examples

Format it as a content style guide section.
```

### Build a Voice Chart from Existing Designs

```
Analyze the copy in these designs: [multiple Figma links]

Using the voice chart template from the UX Writing Skill, create a voice chart showing:
- 3–5 key brand concepts
- Voice characteristics for each
- Do/Don't examples from our actual product
- Tone variations for different contexts
```

### Generate Test Copy

```
I need placeholder copy for this wireframe: [link]

Generate realistic UX copy for all text elements following our voice:
- Helpful, professional, encouraging
- Target reading level: 8th grade
- Keep button labels under 25 characters
```

### Localization Prep

```
Review this design for translation readiness: [link]

Check:
- Text expansion space (German expands 30–40%)
- Idioms or cultural references to avoid
- Hard-coded text in buttons that should be dynamic
- Character limits that might break in other languages
```

### Automated Copy Testing

```
Every week, I'll share new designs with you. For each design:
1. Extract all copy
2. Run it through the content usability checklist
3. Flag anything scoring below 7/10
4. Provide specific fixes
5. Track improvements over time
```

---

## Resources

- **Figma MCP Documentation**: [developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server/)
- **UX Writing Skill**: See the main [README.md](../README.md) for installation and overview

---

## Feedback

Have ideas for improving this integration? Open an issue or contribute to the repository. We'd especially love to hear:
- Real-world workflows that work well for your team
- Examples of great UX writing improvements from Figma designs
- Tips for content design teams using this integration
