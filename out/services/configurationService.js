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
exports.ConfigurationService = void 0;
const vscode = __importStar(require("vscode"));
const arffTheme_1 = require("../themes/arffTheme");
class ConfigurationService {
    constructor(context) {
        this.context = context;
    }
    getConfiguration() {
        return vscode.workspace.getConfiguration(ConfigurationService.EXTENSION_ID);
    }
    getCurrentTheme() {
        const config = this.getConfiguration();
        const workbenchTheme = vscode.window.activeColorTheme;
        const defaultTheme = workbenchTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
        const themeName = config.get('theme', defaultTheme);
        return arffTheme_1.arffThemes[themeName] || arffTheme_1.arffThemes[defaultTheme];
    }
    getTokenColors() {
        const theme = this.getCurrentTheme();
        const workbenchColors = vscode.workspace.getConfiguration('editor')
            .get('tokenColorCustomizations') || {};
        // Convertir la estructura del tema a TokenColorCustomizations
        const themeColors = {
            keywords: theme.colors.keywords,
            types: theme.colors.types,
            values: theme.colors.values,
            identifiers: theme.colors.identifiers,
            comments: theme.colors.comments,
            strings: theme.colors.strings,
            operators: theme.colors.operators,
            delimiters: theme.colors.delimiters
        };
        return {
            ...themeColors,
            ...workbenchColors
        };
    }
    getMaxLineLength() {
        const config = this.getConfiguration();
        return config.get('maxLineLength', 1000);
    }
    getValidationDelay() {
        const config = this.getConfiguration();
        return config.get('validationDelay', 500);
    }
    getSyntaxHighlightEnabled() {
        const config = this.getConfiguration();
        return config.get('enableSyntaxHighlight', true);
    }
    async updateSyntaxColors() {
        const theme = this.getCurrentTheme();
        const tokenColors = {
            "editor.tokenColorCustomizations": {
                "textMateRules": [
                    {
                        "scope": "keyword.control.relation.arff",
                        "settings": {
                            "foreground": theme.colors.keywords.relation
                        }
                    },
                    {
                        "scope": "keyword.control.attribute.arff",
                        "settings": {
                            "foreground": theme.colors.keywords.attribute
                        }
                    },
                    {
                        "scope": "keyword.control.data.arff",
                        "settings": {
                            "foreground": theme.colors.keywords.data
                        }
                    },
                    {
                        "scope": "support.type.primitive.arff",
                        "settings": {
                            "foreground": theme.colors.types.primitive
                        }
                    },
                    {
                        "scope": "support.type.nominal.arff",
                        "settings": {
                            "foreground": theme.colors.types.nominal
                        }
                    },
                    {
                        "scope": "constant.numeric.arff",
                        "settings": {
                            "foreground": theme.colors.values.numeric
                        }
                    }
                ]
            }
        };
        await vscode.workspace.getConfiguration().update('editor.tokenColorCustomizations', tokenColors["editor.tokenColorCustomizations"], vscode.ConfigurationTarget.Global);
    }
}
exports.ConfigurationService = ConfigurationService;
ConfigurationService.EXTENSION_ID = 'arff';
//# sourceMappingURL=configurationService.js.map