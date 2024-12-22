# WEKA ARFF Support

![WEKA Logo](images/icon.png)

Extensión de Visual Studio Code para trabajar con archivos ARFF de WEKA.

## Características

### Edición y Validación
- 🎨 Resaltado de sintaxis para archivos ARFF
- ✨ Autocompletado inteligente de keywords y atributos
- ⚡ Validación en tiempo real del formato ARFF
- 💡 Sugerencias de tipo al escribir datos
- 📝 Snippets para estructuras comunes

### Visualización y Análisis
- 📊 Vista previa de datos en tabla interactiva
- 📈 Estadísticas del dataset
- 🔍 Análisis automático de calidad de datos
- 📉 Detección de valores atípicos y datos faltantes

### Integración con WEKA
- 🧠 Ejecución de algoritmos de WEKA directamente desde VS Code
- 🔄 Aleatorización de datasets
- 🤖 Interfaz para Redes Neuronales con MultilayerPerceptron
- 💾 Guardado y carga de modelos entrenados

### Herramientas Avanzadas
- 🔀 Aleatorización de datos para archivos .arff y .data
- 📤 Importación y exportación de archivos
- 🎯 Validación cruzada integrada
- 🔧 Configuración personalizable

## Uso

1. Instala la extensión desde VS Code Marketplace
2. Abre un archivo .arff
3. Usa los comandos disponibles desde la barra de herramientas o la paleta de comandos

## Comandos

| Comando | Descripción | Atajo |
|---------|-------------|-------|
| `WEKA: Vista previa de datos` | Muestra datos en tabla interactiva | - |
| `WEKA: Abrir en WEKA Explorer` | Abre el archivo en WEKA | - |
| `WEKA: Ejecutar Algoritmo` | Selector de algoritmos de WEKA | - |
| `WEKA: Analizar Dataset` | Análisis estadístico del dataset | - |
| `WEKA: Aleatorizar Dataset` | Aleatoriza los datos del archivo | - |
| `WEKA: Red Neuronal` | Interfaz para entrenar redes neuronales | - |

## Snippets

| Snippet | Descripción |
|---------|-------------|
| `arff` | Crea estructura básica ARFF |
| `attr-num` | Atributo numérico |
| `attr-nom` | Atributo nominal |
| `attr-date` | Atributo fecha |

## Requisitos

- Visual Studio Code 1.60.0 o superior
- Java Runtime Environment (JRE) 8 o superior
- WEKA 3.8.0 o superior (opcional, para funciones avanzadas)

## Configuración

La extensión puede configurarse a través de la configuración de VS Code:

- `arff.typeHints.enabled`: Habilitar/deshabilitar sugerencias de tipo
- `arff.typeHints.style`: Estilo de las sugerencias ("inline"/"background")
- `arff.javaPath`: Ruta al ejecutable de Java
- `arff.wekaPath`: Ruta al archivo weka.jar

## Contribuir

Las contribuciones son bienvenidas. Por favor, revisa las guías de contribución antes de enviar un pull request.

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.