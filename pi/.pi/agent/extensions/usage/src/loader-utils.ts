import { BorderedLoader } from "@mariozechner/pi-coding-agent";

export function setBorderedLoaderMessage(loader: BorderedLoader, message: string): void {
	const maybeLoader = loader as unknown as { loader?: unknown };
	const inner = maybeLoader.loader;
	if (typeof inner !== "object" || inner === null) return;

	const withSetMessage = inner as { setMessage?: (text: string) => void };
	if (typeof withSetMessage.setMessage === "function") {
		withSetMessage.setMessage(message);
	}
}
