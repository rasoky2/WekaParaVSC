import * as vscode from 'vscode';
import { IArffTheme, arffThemes } from '../themes/arffTheme';

interface IThemeColors {
    relation: string;
    attribute: string;
    data: string;
    primitive: string;
    nominal: string;
    numeric: string;
    string: string;
    missing: string;
}

interface TokenColorCustomizations {
    [key: string]: {
        relation?: string;
        attribute?: string;
        data?: string;
        primitive?: string;
        nominal?: string;
        numeric?: string;
        string?: string;
        missing?: string;
    } | string | undefined;
}

export class ConfigurationService {
    private static readonly EXTENSION_ID = 'arff';
    private readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(ConfigurationService.EXTENSION_ID);
    }

    public getCurrentTheme(): IArffTheme {
        const config = this.getConfiguration();
        const workbenchTheme = vscode.window.activeColorTheme;
        const defaultTheme = workbenchTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
        const themeName = config.get<'light' | 'dark'>('theme', defaultTheme);
        return arffThemes[themeName] || arffThemes[defaultTheme];
    }

    public getTokenColors(): TokenColorCustomizations {
        const theme = this.getCurrentTheme();
        const workbenchColors = vscode.workspace.getConfiguration('editor')
            .get<TokenColorCustomizations>('tokenColorCustomizations') || {};
        
        // Convertir la estructura del tema a TokenColorCustomizations
        const themeColors: TokenColorCustomizations = {
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

    public getMaxLineLength(): number {
        const config = this.getConfiguration();
        return config.get<number>('maxLineLength', 1000);
    }

    public getValidationDelay(): number {
        const config = this.getConfiguration();
        return config.get<number>('validationDelay', 500);
    }

    public getSyntaxHighlightEnabled(): boolean {
        const config = this.getConfiguration();
        return config.get<boolean>('enableSyntaxHighlight', true);
    }

    public async updateSyntaxColors(): Promise<void> {
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

        await vscode.workspace.getConfiguration().update(
            'editor.tokenColorCustomizations',
            tokenColors["editor.tokenColorCustomizations"],
            vscode.ConfigurationTarget.Global
        );
    }
} 