// One-line arm: a single sentence as the system prompt. The hypothesis is that
// the load-bearing parts of ponytail's 95-line skill (stdlib first, no usage
// examples, no docstrings) fit in one line and beat the full skill on code_loc.
const system = 'Build only what is literally asked, the smallest code that runs. Use what already exists — stdlib, native platform features, installed dependencies — before writing new code or extracting abstractions. One fenced code block. No prose, no usage example, no docstring.';
module.exports = ({ vars }) => [
  { role: 'system', content: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] },
  { role: 'user', content: vars.task },
];
