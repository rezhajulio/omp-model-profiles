# 🎭 omp-model-profiles

**Dynamic model profile switcher for [Oh My Pi (OMP)](https://github.com/can1357/oh-my-pi)**.

Switch your entire suite of model roles (`default`, `task`, `slow`, `plan`, `vision`, `advisor`, `designer`, `tiny`) and thinking levels on the fly **without killing, restarting, or leaving your active OMP session**.

---

## ⚡ Features

- **🚀 Live in-session switching**: Instantly switch the active model and thinking effort in your current chat.
- **🔄 Full fleet reconfiguration**: Atomically updates all OMP model roles (`modelRoles`) in-memory via OMP's Settings singleton (`pi.pi.settings.setModelRole`) and on disk (`~/.omp/agent/config.yml`) so subagents (`task`), planners (`plan`), image inspectors (`vision`), and advisors (`advisor`) immediately use the new profile.
- **🎨 Interactive TUI selector**: Type `/profile` to pop up an interactive dialog with fuzzy search and model previews.
- **⌨️ Direct command shortcut**: Fast-switch directly from chat: `/profile anthropic`, `/profile chinese`, `/profile antigravity`, `/profile openai`.
- **💾 Profile saving**: Save your current runtime `modelRoles` to a reusable profile with `/profile save <name>`.
- **📦 Zero runtime dependencies**: Lightweight, self-contained, and compatible with Bun and Node runtimes.

---

## 📥 Installation

### Method 1: Direct File Copy (Fastest)

Copy `src/index.ts` (or the pre-built bundle) directly into your OMP extensions folder:

```bash
mkdir -p ~/.omp/agent/extensions ~/.omp/model-profiles
cp src/index.ts ~/.omp/agent/extensions/model-profiles.ts
```

### Method 2: Git Clone

```bash
git clone https://github.com/rezhajulio/omp-model-profiles.git ~/Workspace/omp-model-profiles
ln -sf ~/Workspace/omp-model-profiles/src/index.ts ~/.omp/agent/extensions/model-profiles.ts
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
│   antigravity  default: google-antigravity/gemini-3.7-flash:high | slow...   │
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
Creates `~/.omp/model-profiles/my-custom-profile.yml` from your active `~/.omp/agent/config.yml`.

---

## 📁 Profile Format

Profiles are stored as standard YAML files inside `~/.omp/model-profiles/<name>.yml`.

### Example: `~/.omp/model-profiles/anthropic.yml`

```yaml
# Anthropic Claude Profile (Claude Sonnet 4.6, Claude Opus 4.6, Claude Haiku 4.5)
modelRoles:
  default: anthropic/claude-sonnet-4-6:high
  smol: anthropic/claude-haiku-4-5:none
  slow: anthropic/claude-opus-4-6:high
  vision: anthropic/claude-sonnet-4-6:none
  plan: anthropic/claude-opus-4-6:max
  task: anthropic/claude-haiku-4-5:none
  advisor: anthropic/claude-opus-5:high
  commit: anthropic/claude-haiku-4-5:none
  designer: anthropic/claude-sonnet-4-6:high
  tiny: anthropic/claude-haiku-4-5:none
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
| [`antigravity.yml`](./examples/antigravity.yml) | Gemini 3.7 Flash | Gemini 3 Pro | Gemini 3.7 Flash | Fast loops, native vision & 1M context |
| [`openai.yml`](./examples/openai.yml) | GPT-5.3-Codex | GPT-5.4-Pro | GPT-5.4-Mini | Advanced reasoning & frontier coding |
| [`local-ollama.yml`](./examples/local-ollama.yml) | Qwen2.5-Coder 32B | DeepSeek-R1 32B | Qwen2.5-Coder 7B | 100% offline & local execution |

To install all example profiles:
```bash
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
