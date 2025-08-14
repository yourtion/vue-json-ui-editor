module.exports = {
  // Basic formatting
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  
  // Line formatting
  printWidth: 80,
  endOfLine: 'lf',
  
  // Vue specific
  vueIndentScriptAndStyle: false,
  
  // HTML/Template formatting
  htmlWhitespaceSensitivity: 'css',
  
  // Override for specific file types
  overrides: [
    {
      files: '*.vue',
      options: {
        parser: 'vue'
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript'
      }
    },
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always'
      }
    }
  ]
}
