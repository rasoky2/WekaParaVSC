"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebviewService = void 0;
const vscode = __importStar(require("vscode"));
class WebviewService {
    constructor() {
        this.panels = new Map();
    }
    static getInstance() {
        if (!WebviewService.instance) {
            WebviewService.instance = new WebviewService();
        }
        return WebviewService.instance;
    }
    createOrShowWebview(id, title, content, options = {}) {
        if (this.panels.has(id)) {
            const panel = this.panels.get(id);
            panel.reveal(options.viewColumn, options.preserveFocus);
            panel.webview.html = content;
            return panel;
        }
        const panel = vscode.window.createWebviewPanel(id, title, options.viewColumn ?? vscode.ViewColumn.Two, {
            enableScripts: options.enableScripts ?? true,
            retainContextWhenHidden: options.retainContextWhenHidden ?? false
        });
        panel.webview.html = content;
        this.panels.set(id, panel);
        panel.onDidDispose(() => {
            this.panels.delete(id);
        });
        return panel;
    }
    static escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    static getCommonStyles() {
        return `
            <style>
                body { 
                    font-family: var(--vscode-editor-font-family);
                    padding: 20px;
                    line-height: 1.6;
                    color: var(--vscode-editor-foreground);
                }
                .section {
                    margin-bottom: 20px;
                    padding: 15px;
                    border-radius: 5px;
                    background: var(--vscode-editor-background);
                }
                .output {
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    padding: 15px;
                    border-radius: 5px;
                    white-space: pre-wrap;
                    font-family: monospace;
                    overflow-x: auto;
                }
                .error {
                    background-color: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                    padding: 10px;
                    margin-top: 10px;
                    border-radius: 5px;
                }
                .code-block {
                    background: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 4px;
                    font-family: monospace;
                    overflow-x: auto;
                }
                .metric-card {
                    margin-bottom: 15px;
                    padding: 15px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    transition: transform 0.2s ease;
                }
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
                .metric-title {
                    font-size: 1.1em;
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: var(--vscode-textLink-foreground);
                }
                .metric-value {
                    font-size: 1.8em;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .metric-description {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    line-height: 1.4;
                }
                .tab-container {
                    margin-bottom: 20px;
                }
                .tab-button {
                    padding: 8px 16px;
                    border: none;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    margin-right: 5px;
                    border-radius: 4px;
                    transition: background-color 0.2s ease;
                }
                .tab-button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .tab-button.active {
                    background: var(--vscode-button-hoverBackground);
                    font-weight: bold;
                }
                .tab-content {
                    display: none;
                    padding: 20px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                }
                .tab-content.active {
                    display: block;
                    animation: fadeIn 0.3s ease;
                }
                .timestamp {
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                    margin-bottom: 20px;
                }
                .section-title {
                    font-size: 1.2em;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: var(--vscode-textLink-foreground);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 5px;
                }
                .highlight {
                    background-color: var(--vscode-editor-selectionBackground);
                    padding: 2px 5px;
                    border-radius: 3px;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .metric-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                .class-details {
                    margin-top: 20px;
                    border-top: 1px solid var(--vscode-panel-border);
                    padding-top: 15px;
                }
                .confusion-matrix {
                    overflow-x: auto;
                    margin-top: 20px;
                }
                .confusion-matrix table {
                    border-collapse: collapse;
                    width: 100%;
                }
                .confusion-matrix th, .confusion-matrix td {
                    border: 1px solid var(--vscode-panel-border);
                    padding: 8px;
                    text-align: center;
                }
                .confusion-matrix th {
                    background: var(--vscode-editor-selectionBackground);
                }
                .status-icon {
                    display: inline-block;
                    margin-left: 8px;
                    font-size: 1.2em;
                }
                .status-icon.good { color: #4EC9B0; }
                .status-icon.warning { color: #CDB74A; }
                .status-icon.bad { color: #CD4A4A; }
            </style>
        `;
    }
    static wrapHtml(content, title = '') {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${WebviewService.escapeHtml(title)}</title>
                ${WebviewService.getCommonStyles()}
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;
    }
    _getCommonStyles() {
        return `
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    line-height: 1.6;
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .section {
                    margin-bottom: 30px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 20px;
                }

                .section-title {
                    font-size: 1.2em;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: var(--vscode-editor-foreground);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 8px;
                }

                .metric-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 15px;
                    margin-bottom: 15px;
                }

                .metric-title {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--vscode-editor-foreground);
                }

                .metric-value {
                    font-size: 1.4em;
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--vscode-textLink-foreground);
                }

                .metric-description {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                }

                .metric-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 0.9em;
                }

                .metric-table th,
                .metric-table td {
                    padding: 8px;
                    text-align: left;
                    border: 1px solid var(--vscode-panel-border);
                }

                .metric-table th {
                    background-color: var(--vscode-editor-background);
                    font-weight: bold;
                }

                .metric-table tr:nth-child(even) {
                    background-color: var(--vscode-editor-background);
                }

                .confusion-matrix {
                    overflow-x: auto;
                    margin: 15px 0;
                }

                .confusion-matrix table {
                    border-collapse: collapse;
                    font-size: 0.9em;
                }

                .confusion-matrix th,
                .confusion-matrix td {
                    padding: 8px;
                    text-align: center;
                    border: 1px solid var(--vscode-panel-border);
                }

                .confusion-matrix th {
                    background-color: var(--vscode-editor-background);
                    font-weight: bold;
                }

                .code-block {
                    background-color: var(--vscode-textBlockQuote-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 15px;
                    font-family: 'Courier New', Courier, monospace;
                    white-space: pre-wrap;
                    overflow-x: auto;
                }

                .model-description {
                    margin: 15px 0;
                }

                .class-details {
                    overflow-x: auto;
                }

                @media (max-width: 768px) {
                    .metric-table,
                    .confusion-matrix table {
                        font-size: 0.8em;
                    }

                    .metric-card {
                        padding: 10px;
                    }
                }
            </style>
        `;
    }
}
exports.WebviewService = WebviewService;
//# sourceMappingURL=webviewService.js.map