/** Form controls. */
export interface FormField {
  name: string;
  type: "text" | "number" | "email";
  required: boolean;
}

/** Build an HTML form string from a field list. */
export function renderForm(fields: FormField[]): string {
  return fields.map((f) => `<input name="${f.name}" type="${f.type}" />`).join("\n");
}
