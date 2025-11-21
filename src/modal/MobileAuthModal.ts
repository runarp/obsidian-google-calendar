import { App, Modal } from "obsidian";

export class MobileAuthModal extends Modal {
	private authUrl: string;

	constructor(app: App, authUrl: string) {
		super(app);
		this.authUrl = authUrl;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Google Calendar Authentication" });
		
		const instructionEl = contentEl.createEl("p");
		instructionEl.setText("Tap the link below to open Google's authentication page in your browser:");
		
		// Create a clickable link
		const linkEl = contentEl.createEl("a", { 
			text: "Open Google Authentication", 
			href: this.authUrl,
			attr: { target: "_blank" }
		});
		linkEl.style.display = "block";
		linkEl.style.marginTop = "20px";
		linkEl.style.marginBottom = "20px";
		linkEl.style.padding = "10px";
		linkEl.style.backgroundColor = "var(--interactive-normal)";
		linkEl.style.color = "var(--text-on-accent)";
		linkEl.style.borderRadius = "4px";
		linkEl.style.textAlign = "center";
		linkEl.style.textDecoration = "none";
		linkEl.style.fontWeight = "bold";
		
		// Also try to open it programmatically when the modal opens
		// This might work in some mobile browsers
		setTimeout(() => {
			const opened = window.open(this.authUrl, '_blank');
			if (opened) {
				this.close();
			}
		}, 100);

		contentEl.createEl("p", { 
			text: "After authenticating, you will be redirected back to Obsidian automatically.",
			attr: { style: "margin-top: 20px; color: var(--text-muted);" }
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

