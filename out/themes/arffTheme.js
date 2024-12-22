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
exports.arffThemes = exports.arffStyles = exports.activateColorization = exports.arffTokens = void 0;
const vscode = __importStar(require("vscode"));
function getThemeColor(colorVar, darkFallback, lightFallback, isDark) {
    return `var(${colorVar}, ${isDark ? darkFallback : lightFallback})`;
}
function getKeywordColors(isDark) {
    const keywordColor = getThemeColor('--vscode-symbolIcon-keywordForeground', '#569CD6', '#0000FF', isDark);
    return {
        relation: keywordColor,
        attribute: keywordColor,
        data: keywordColor
    };
}
function getTypeColors(isDark) {
    return {
        primitive: getThemeColor('--vscode-symbolIcon-typeParameterForeground', '#4EC9B0', '#267F99', isDark),
        nominal: getThemeColor('--vscode-symbolIcon-enumForeground', '#C586C0', '#AF00DB', isDark)
    };
}
function getValueColors(isDark) {
    return {
        numeric: getThemeColor('--vscode-charts-green', '#B5CEA8', '#098658', isDark),
        string: getThemeColor('--vscode-charts-orange', '#CE9178', '#A31515', isDark),
        missing: getThemeColor('--vscode-errorForeground', '#FF6B6B', '#EE0000', isDark),
        nominal: getThemeColor('--vscode-charts-yellow', '#D7BA7D', '#C17E70', isDark),
        boolean: getThemeColor('--vscode-debugTokenExpression-boolean', '#4E94CE', '#0000FF', isDark)
    };
}
function getIdentifierColors(isDark) {
    return {
        relation: getThemeColor('--vscode-symbolIcon-variableForeground', '#9CDCFE', '#001080', isDark),
        attribute: getThemeColor('--vscode-symbolIcon-propertyForeground', '#9CDCFE', '#001080', isDark),
        braces: getThemeColor('--vscode-symbolIcon-operatorForeground', '#FFD700', '#FF8C00', isDark),
        parenthesis: getThemeColor('--vscode-symbolIcon-operatorForeground', '#DA70D6', '#4B0082', isDark)
    };
}
function getVSCodeColors() {
    const theme = vscode.window.activeColorTheme;
    const isDark = theme.kind === vscode.ColorThemeKind.Dark;
    return {
        name: 'VS Code Theme',
        colors: {
            keywords: getKeywordColors(isDark),
            types: getTypeColors(isDark),
            values: getValueColors(isDark),
            identifiers: getIdentifierColors(isDark),
            comments: getThemeColor('--vscode-editorLineNumber-foreground', '#6A9955', '#008000', isDark),
            strings: getThemeColor('--vscode-charts-orange', '#CE9178', '#A31515', isDark),
            operators: getThemeColor('--vscode-symbolIcon-operatorForeground', '#D4D4D4', '#000000', isDark),
            delimiters: getThemeColor('--vscode-symbolIcon-operatorForeground', '#D4D4D4', '#000000', isDark),
            bracesContent: getThemeColor('--vscode-charts-foreground', '#DCDCAA', '#8B4513', isDark)
        },
        styles: {
            keywords: {
                fontWeight: 'bold',
                fontStyle: 'normal'
            },
            types: {
                fontWeight: 'bold',
                fontStyle: 'italic'
            },
            values: {
                numeric: {
                    fontWeight: 'normal',
                    fontStyle: 'normal'
                },
                string: {
                    fontWeight: 'normal',
                    fontStyle: 'italic'
                },
                boolean: {
                    fontWeight: 'bold',
                    fontStyle: 'italic'
                }
            },
            identifiers: {
                fontWeight: 'normal',
                fontStyle: 'normal'
            }
        }
    };
}
// Definición de tokens y patrones
exports.arffTokens = {
    keywords: ['@relation', '@attribute', '@data'],
    types: ['numeric', 'string', 'date', 'real', 'integer'],
    operators: ['{', '}', ',', '?', '[', ']', '(', ')'],
    comments: ['%'],
    specialChars: ['@', '_', '-', '.', '+'],
    booleanValues: ['true', 'false', 'yes', 'no', 'si', 'no']
};
// Definición de tipos de tokens para colorización semántica
const tokenTypes = [
    'keyword',
    'type',
    'string',
    'number',
    'comment',
    'variable',
    'operator',
    'identifier',
    'delimiter',
    'boolean' // 9
];
const tokenModifiers = [
    'declaration',
    'definition',
    'readonly',
    'static',
    'deprecated',
    'modification',
    'documentation'
];
// Función principal de activación de la colorización
function activateColorization(context) {
    const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
    const eventEmitter = new vscode.EventEmitter();
    const provider = createSemanticTokensProvider(legend, eventEmitter);
    // Registrar el proveedor de tokens semánticos
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'arff' }, provider, legend));
    // Escuchar cambios en el tema de color
    context.subscriptions.push(vscode.window.onDidChangeActiveColorTheme(() => {
        eventEmitter.fire();
    }));
    // Asegurarse de que el EventEmitter se disponga correctamente
    context.subscriptions.push(eventEmitter);
}
exports.activateColorization = activateColorization;
function createSemanticTokensProvider(legend, eventEmitter) {
    return {
        provideDocumentSemanticTokens(document) {
            const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
            const theme = getVSCodeColors();
            processDocument(document, tokensBuilder, theme);
            return tokensBuilder.build();
        },
        onDidChangeSemanticTokens: eventEmitter.event
    };
}
function processDocument(document, tokensBuilder, theme) {
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        processLine(line.text, i, tokensBuilder, theme);
    }
}
function processLine(text, lineIndex, tokensBuilder, theme) {
    processComments(text, lineIndex, tokensBuilder);
    processKeywords(text, lineIndex, tokensBuilder);
    processTypes(text, lineIndex, tokensBuilder);
    processNumericValues(text, lineIndex, tokensBuilder);
    processStrings(text, lineIndex, tokensBuilder);
    processMissingValues(text, lineIndex, tokensBuilder);
    processIdentifiers(text, lineIndex, tokensBuilder);
    processNominalValues(text, lineIndex, tokensBuilder);
    processBooleanValues(text, lineIndex, tokensBuilder);
}
function processComments(text, lineIndex, tokensBuilder) {
    const commentMatch = RegExp(/%(.*$)/).exec(text);
    if (commentMatch) {
        const index = text.indexOf('%');
        tokensBuilder.push(lineIndex, index, commentMatch[0].length, 4, 0);
    }
}
function processKeywords(text, lineIndex, tokensBuilder) {
    const keywordRegex = RegExp(/@(relation|attribute|data)\b/g);
    let match;
    while ((match = keywordRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 0, 1);
    }
}
function processTypes(text, lineIndex, tokensBuilder) {
    const typeRegex = RegExp(/\b(numeric|string|date|real|integer)\b/g);
    let match;
    while ((match = typeRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 1, 2);
    }
}
function processNumericValues(text, lineIndex, tokensBuilder) {
    const numericRegex = RegExp(/\b\d+(\.\d+)?\b/g);
    let match;
    while ((match = numericRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 3, 0);
    }
}
function processStrings(text, lineIndex, tokensBuilder) {
    const stringRegex = RegExp(/'[^']*'|"[^"]*"/g);
    let match;
    while ((match = stringRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 2, 0);
    }
}
function processMissingValues(text, lineIndex, tokensBuilder) {
    const missingRegex = RegExp(/\?/g);
    let match;
    while ((match = missingRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, 1, 6, 0);
    }
}
function processIdentifiers(text, lineIndex, tokensBuilder) {
    const identifierRegex = RegExp(/(?<=@(?:relation|attribute)\s+)\w+/g);
    let match;
    while ((match = identifierRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 7, 0);
    }
}
function processNominalValues(text, lineIndex, tokensBuilder) {
    const nominalRegex = RegExp(/\{([^}]+)\}/g);
    let match;
    while ((match = nominalRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const index = match.index;
        // Colorear las llaves y su contenido
        tokensBuilder.push(lineIndex, index, fullMatch.length, 8, 0);
        // Colorear los valores individuales dentro de las llaves
        processNominalValueContent(text, lineIndex, index, fullMatch, tokensBuilder);
    }
}
function processNominalValueContent(text, lineIndex, startIndex, fullMatch, tokensBuilder) {
    const values = fullMatch.slice(1, -1).split(',');
    let currentIndex = startIndex + 1;
    values.forEach(value => {
        const trimmedValue = value.trim();
        currentIndex = text.indexOf(trimmedValue, currentIndex);
        if (currentIndex !== -1) {
            tokensBuilder.push(lineIndex, currentIndex, trimmedValue.length, 5, 0);
            currentIndex += trimmedValue.length;
        }
    });
}
function processBooleanValues(text, lineIndex, tokensBuilder) {
    const boolRegex = new RegExp(`\\b(${exports.arffTokens.booleanValues.join('|')})\\b`, 'gi');
    let match;
    while ((match = boolRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 9, // token type 'boolean'
        0 // no modifiers
        );
    }
}
// Actualizar el CSS para los valores booleanos
const booleanStyles = `
.boolean-value {
    font-weight: bold;
    color: var(--vscode-debugTokenExpression-boolean);
    font-style: italic;
}
`;
// Actualizar el CSS para los tokens
const tokenStyles = `
.token-type-keyword {
    font-weight: bold;
    color: var(--vscode-symbolIcon-keywordForeground);
    text-transform: uppercase;
}

.token-type-type {
    font-weight: bold;
    font-style: italic;
    color: var(--vscode-symbolIcon-typeParameterForeground);
}

.token-type-string {
    font-style: italic;
    color: var(--vscode-charts-orange);
}

.token-type-number {
    color: var(--vscode-charts-green);
}

.token-type-boolean {
    font-weight: bold;
    font-style: italic;
    color: var(--vscode-debugTokenExpression-boolean);
}

.token-type-identifier {
    color: var(--vscode-symbolIcon-variableForeground);
}

.token-type-comment {
    font-style: italic;
    color: var(--vscode-editorLineNumber-foreground);
    opacity: 0.8;
}

.token-type-operator {
    font-weight: bold;
    color: var(--vscode-symbolIcon-operatorForeground);
}

.token-type-delimiter {
    color: var(--vscode-symbolIcon-operatorForeground);
    opacity: 0.9;
}

.token-type-nominal {
    font-weight: bold;
    color: var(--vscode-charts-yellow);
    text-decoration: underline;
}

.token-type-missing {
    font-weight: bold;
    color: var(--vscode-errorForeground);
    text-decoration: wavy underline;
}
`;
// Exportar los estilos
exports.arffStyles = {
    tokenStyles,
    booleanStyles
};
exports.arffThemes = {
    light: getVSCodeColors(),
    dark: getVSCodeColors()
};
//# sourceMappingURL=arffTheme.js.map