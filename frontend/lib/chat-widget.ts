/** Fired when a visitor asks for the chat before its script has finished loading; ChatWidgetLoader loads it at once and opens it when ready. */
export const CHAT_WANTED_EVENT = "portfolio:chat-wanted";

export type ChatWidget = { open?: () => void; prefillQuestion?: (question: string) => void };

/** The chat widget, once its script has loaded. */
export function chatWidget(): ChatWidget | undefined {
  return (window as Window & { portfolioChatbot?: ChatWidget }).portfolioChatbot;
}

/** Opens the chat. The widget loads a moment after the page does, so a very early click is remembered and honoured as soon as it is ready instead of being lost. */
export function openChat() {
  const widget = chatWidget();
  if (typeof widget?.open === "function") widget.open();
  else window.dispatchEvent(new Event(CHAT_WANTED_EVENT));
}
