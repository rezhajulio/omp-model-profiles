# 🎭 omp-model-profiles

**Dynamic model profile switcher for [Oh My Pi (OMP)](https://github.com/can1357/oh-my-pi)**.

Switch your entire suite of model roles (`default`, `task`, `slow`, `plan`, `vision`, `advisor`, `designer`, `tiny`) and thinking levels on the fly **without killing, restarting, or leaving your active OMP session**.

---

## ⚡ Features

- **🚀 Live in-session switching**: Instantly switch the active model and thinking effort in your current chat.
- **🔄 Full fleet reconfiguration**: Applies all model roles (`modelRoles`) in-memory via OMP's runtime settings override layer so subagents (`task`), planners (`plan`), image inspectors (`vision`), and advisors (`advisor`) immediately use the new profile.
- **🛡️ Multi-instance isolation**: Profile switches only affect the current running terminal session. Other concurrent OMP instances remain completely untouched.
- **🎨 Interactive TUI selector**: Type `/profile` to pop up an interactive dialog with fuzzy search and model previews.
- **⌨️ Direct command shortcut**: Fast-switch directly from chat: `/profile anthropic`, `/profile chinese`, `/profile antigravity`, `/profile openai`.
- **💾 Profile saving**: Save your current runtime `modelRoles` to a reusable profile with `/profile save <name>`.
- **📦 Zero runtime dependencies**: Lightweight, self-contained, and compatible with Bun and Node runtimes.

---

## 📥 Installation

### Single Command (Recommended)

Install directly using OMP's built-in plugin manager:

```bash
omp plugin install github:rezhajulio/omp-model-profiles
```

Or from inside an active OMP chat session:
```
/plugin install github:rezhajulio/omp-model-profiles
```

---

## 🎮 Usage

### 1. Interactive Picker
Type in your OMP chat:
```
/profile
```
*(or alias `/model-profile`)*

Opens an interactive dialog showing available profiles and their models:

```
┌─ Select Model Profile ────────────────────────────────────────────────────────┐
│ > anthropic    default: anthropic/claude-sonnet-4-6:high | slow: ...opus-4-6  │
│   chinese      default: 9router/cmc/deepseek/deepseek-v4-flash:high | slow... │
│   antigravity  default: google-antigravity/gemini-3.8-flash:high | slow...   │
│   openai       default: openai/gpt-5.3-codex:auto | slow: openai/gpt-5.4-pro │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 2. Switch by Name
```
/profile anthropic
/profile chinese
/profile antigravity
/profile openai
```

### 3. List Profiles
```
/profile list
```

### 4. Inspect a Profile
```
/profile show chinese
```

### 5. Save Current Roles as a Profile
```
/profile save my-custom-profile
```
Creates `~/.omp/model-profiles/my-custom-profile.yml`.

---

## 📁 Profile Format

Profiles are stored as standard YAML files inside `~/.omp/model-profiles/<name>.yml`.

### Example: `~/.omp/model-profiles/antigravity.yml`

```yaml
# Google Antigravity Profile (Gemini 3.8 Flash, Gemini 3 Pro)
modelRoles:
  default: google-antigravity/gemini-3.8-flash:high
  smol: google-antigravity/gemini-3.8-flash:low
  slow: google-antigravity/gemini-3-pro:high
  vision: google-antigravity/gemini-3.8-flash:low
  plan: google-antigravity/gemini-3-pro:max
  task: google-antigravity/gemini-3.8-flash:low
  advisor: google-antigravity/gemini-3-pro:high
  commit: google-antigravity/gemini-3.8-flash:low
  designer: google-antigravity/gemini-3-pro:high
  tiny: google-antigravity/gemini-3.8-flash:low
```

### Thinking Level Suffixes
You can append `:thinkingLevel` to any model selector:
- `:none` — disable reasoning/thinking tokens
- `:low` — minimal thinking budget
- `:medium` — balanced reasoning
- `:high` — deep reasoning
- `:max` — maximum reasoning effort
- `:auto` — provider default

---

## 📚 Example Profiles Included

Check the [`examples/`](./examples) directory for ready-to-use profiles:

| Profile | Primary (`default`) | Reasoning (`slow` / `plan`) | Subagents (`task`) | Best For |
|---|---|---|---|---|
| [`anthropic.yml`](./examples/anthropic.yml) | Claude Sonnet 4.6 | Claude Opus 4.6 / Opus 5 | Claude Haiku 4.5 | Deep architecture, refactoring & code review |
| [`chinese.yml`](./examples/chinese.yml) | DeepSeek V4 Flash | DeepSeek V4 Pro | DeepSeek V4 Flash | High speed, 1M context & low token cost |
| [`antigravity.yml`](./examples/antigravity.yml) | Gemini 3.8 Flash | Gemini 3 Pro | Gemini 3.8 Flash | Fast loops, native vision & 1M context |
| [`openai.yml`](./examples/openai.yml) | GPT-5.3-Codex | GPT-5.4-Pro | GPT-5.4-Mini | Advanced reasoning & frontier coding |
| [`local-ollama.yml`](./examples/local-ollama.yml) | Qwen2.5-Coder 32B | DeepSeek-R1 32B | Qwen2.5-Coder 7B | 100% offline & local execution |

To install all example profiles:
```bash
mkdir -p ~/.omp/model-profiles
cp examples/*.yml ~/.omp/model-profiles/
```

---

## 🛠️ Development & Testing

```bash
# Run test suite (Bun test runner)
bun test

# Run tests with coverage
bun test --coverage

# Bundle single-file distributable
bun run build
```

---

## 👤 Author

**Rezha Julio**
- Email: [contact@rezhajulio.id](mailto:contact@rezhajulio.id)
- GitHub: [@rezhajulio](https://github.com/rezhajulio)

---

## 📄 License

[MIT License](./LICENSE) © 2026 Rezha Julio
