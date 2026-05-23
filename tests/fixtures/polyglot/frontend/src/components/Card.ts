/** Card layout component. */
export interface CardProps {
  title: string;
  body: string;
}

/** Render a card to a string template. */
export function renderCard(props: CardProps): string {
  return `<div class="card"><h3>${props.title}</h3><p>${props.body}</p></div>`;
}
