---
category: Inputs
---

Vertical form stack with 16px gaps; FormRow puts two fields side by side.

```tsx
<Form>
  <Field label="Matter">
    <Select value="Estate of Harold Bennett" mono="2026-0187" />
  </Field>
  <FormRow>
    <Field label="Duration">
      <Stepper value="0:42" />
    </Field>
    <Field label="Amount">
      <Input amount prefix="$" value="227.50" />
    </Field>
  </FormRow>
</Form>
```
