/** Button component. */
export interface ButtonProps {
  label: string;
  onClick: () => void;
}

/** Render a button to a string template. */
export function renderButton(props: ButtonProps): string {
  return `<button>${props.label}</button>`;
}
