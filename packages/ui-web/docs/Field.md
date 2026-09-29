---
category: Inputs
---

Label above, control, help or error below; wraps every input.

`error` replaces `help`, turns the border red and should say what to do ("Already used by Estate of Harold Bennett"). `optional` shows an Optional tag.

```tsx
<Field label="Client name" help="Conflict check runs as you type.">
  <Input value="Margaret Bennett" />
</Field>
```
