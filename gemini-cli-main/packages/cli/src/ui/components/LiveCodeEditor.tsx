/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { SupportedLanguage } from '@gemini-cli/core/tools/enhanced-code-execution.js';

export interface LiveCodeEditorProps {
  /**
   * Initial code content
   */
  initialCode?: string;
  
  /**
   * Programming language
   */
  language: SupportedLanguage;
  
  /**
   * Filename for the code
   */
  filename?: string;
  
  /**
   * Callback when code is executed
   */
  onExecute?: (code: string, language: SupportedLanguage, filename?: string) => Promise<void>;
  
  /**
   * Callback when code is saved
   */
  onSave?: (code: string, language: SupportedLanguage, filename?: string) => Promise<void>;
  
  /**
   * Callback when editor is closed
   */
  onClose?: () => void;
  
  /**
   * Whether the editor is in focus
   */
  isFocused?: boolean;
  
  /**
   * Theme for syntax highlighting
   */
  theme?: 'light' | 'dark' | 'auto';
}

export interface CodeEditorState {
  code: string;
  cursorLine: number;
  cursorColumn: number;
  mode: 'edit' | 'command';
  statusMessage: string;
  isExecuting: boolean;
  isSaving: boolean;
}

/**
 * Live Code Editor component with vim-like keybindings
 */
export const LiveCodeEditor: React.FC<LiveCodeEditorProps> = ({
  initialCode = '',
  language,
  filename,
  onExecute,
  onSave,
  onClose,
  isFocused = true,
  theme = 'auto',
}) => {
  const { exit } = useApp();
  const [state, setState] = useState<CodeEditorState>({
    code: initialCode,
    cursorLine: 0,
    cursorColumn: 0,
    mode: 'edit',
    statusMessage: 'Ready',
    isExecuting: false,
    isSaving: false,
  });

  const codeRef = useRef(state.code);
  const linesRef = useRef(state.code.split('\n'));

  // Update refs when code changes
  useEffect(() => {
    codeRef.current = state.code;
    linesRef.current = state.code.split('\n');
  }, [state.code]);

  // Language-specific syntax highlighting colors
  const getSyntaxColors = useCallback((lang: SupportedLanguage, currentTheme: string) => {
    const isDark = currentTheme === 'dark' || (currentTheme === 'auto' && process.env.TERM_PROGRAM === 'Apple_Terminal');
    
    return {
      keyword: isDark ? '\x1b[94m' : '\x1b[34m',      // Blue
      string: isDark ? '\x1b[92m' : '\x1b[32m',        // Green
      comment: isDark ? '\x1b[37m' : '\x1b[90m',       // Gray
      number: isDark ? '\x1b[95m' : '\x1b[35m',        // Magenta
      function: isDark ? '\x1b[96m' : '\x1b[36m',      // Cyan
      reset: '\x1b[0m',
    };
  }, []);

  // Apply simple syntax highlighting
  const highlightLine = useCallback((line: string, lineNumber: number): string => {
    const colors = getSyntaxColors(language, theme);
    
    // Basic keyword highlighting based on language
    const keywords: Record<SupportedLanguage, string[]> = {
      python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'return', 'try', 'except'],
      javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class'],
      typescript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'interface', 'type'],
      java: ['public', 'private', 'class', 'if', 'else', 'for', 'while', 'return'],
      cpp: ['#include', 'int', 'char', 'if', 'else', 'for', 'while', 'return', 'class'],
      c: ['#include', 'int', 'char', 'if', 'else', 'for', 'while', 'return'],
      rust: ['fn', 'let', 'mut', 'if', 'else', 'for', 'while', 'return', 'use'],
      go: ['func', 'var', 'if', 'else', 'for', 'return', 'package'],
      bash: ['if', 'then', 'else', 'fi', 'for', 'while', 'do', 'done', 'echo'],
      shell: ['if', 'then', 'else', 'fi', 'for', 'while', 'do', 'done', 'echo'],
    };

    let highlighted = line;
    
    // Highlight keywords
    keywords[language]?.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `${colors.keyword}${keyword}${colors.reset}`);
    });

    // Highlight strings
    highlighted = highlighted.replace(/"([^"]*)"/g, `${colors.string}"$1"${colors.reset}`);
    highlighted = highlighted.replace(/'([^']*)'/g, `${colors.string}'$1'${colors.reset}`);

    // Highlight comments
    if (language === 'python' || language === 'bash' || language === 'shell') {
      highlighted = highlighted.replace(/#(.*)$/, `${colors.comment}#$1${colors.reset}`);
    } else if (['javascript', 'typescript', 'java', 'cpp', 'c', 'rust', 'go'].includes(language)) {
      highlighted = highlighted.replace(/\/\/(.*)$/, `${colors.comment}//$1${colors.reset}`);
    }

    // Highlight numbers
    highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, `${colors.number}$&${colors.reset}`);

    return highlighted;
  }, [language, theme, getSyntaxColors]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;

    setState(prev => {
      const lines = prev.code.split('\n');
      let newState = { ...prev };

      if (state.mode === 'command') {
        // Command mode (vim-like)
        switch (input) {
          case 'i':
            newState.mode = 'edit';
            newState.statusMessage = '-- INSERT --';
            break;
          case 'q':
            onClose?.();
            break;
          case 'w':
            if (onSave) {
              newState.isSaving = true;
              newState.statusMessage = 'Saving...';
              onSave(prev.code, language, filename).then(() => {
                setState(s => ({ ...s, isSaving: false, statusMessage: 'Saved!' }));
              });
            }
            break;
          case 'r':
            if (onExecute) {
              newState.isExecuting = true;
              newState.statusMessage = 'Executing...';
              onExecute(prev.code, language, filename).then(() => {
                setState(s => ({ ...s, isExecuting: false, statusMessage: 'Executed!' }));
              });
            }
            break;
          case 'j':
            newState.cursorLine = Math.min(lines.length - 1, prev.cursorLine + 1);
            newState.cursorColumn = Math.min(lines[newState.cursorLine]?.length || 0, prev.cursorColumn);
            break;
          case 'k':
            newState.cursorLine = Math.max(0, prev.cursorLine - 1);
            newState.cursorColumn = Math.min(lines[newState.cursorLine]?.length || 0, prev.cursorColumn);
            break;
          case 'h':
            newState.cursorColumn = Math.max(0, prev.cursorColumn - 1);
            break;
          case 'l':
            newState.cursorColumn = Math.min(lines[prev.cursorLine]?.length || 0, prev.cursorColumn + 1);
            break;
        }
      } else {
        // Edit mode
        if (key.escape) {
          newState.mode = 'command';
          newState.statusMessage = 'Command mode';
        } else if (key.return) {
          const currentLine = lines[prev.cursorLine] || '';
          const beforeCursor = currentLine.slice(0, prev.cursorColumn);
          const afterCursor = currentLine.slice(prev.cursorColumn);
          
          lines[prev.cursorLine] = beforeCursor;
          lines.splice(prev.cursorLine + 1, 0, afterCursor);
          
          newState.code = lines.join('\n');
          newState.cursorLine = prev.cursorLine + 1;
          newState.cursorColumn = 0;
        } else if (key.backspace || key.delete) {
          if (prev.cursorColumn > 0) {
            const currentLine = lines[prev.cursorLine] || '';
            const newLine = currentLine.slice(0, prev.cursorColumn - 1) + currentLine.slice(prev.cursorColumn);
            lines[prev.cursorLine] = newLine;
            newState.code = lines.join('\n');
            newState.cursorColumn = prev.cursorColumn - 1;
          } else if (prev.cursorLine > 0) {
            // Join with previous line
            const currentLine = lines[prev.cursorLine] || '';
            const prevLine = lines[prev.cursorLine - 1] || '';
            lines[prev.cursorLine - 1] = prevLine + currentLine;
            lines.splice(prev.cursorLine, 1);
            newState.code = lines.join('\n');
            newState.cursorLine = prev.cursorLine - 1;
            newState.cursorColumn = prevLine.length;
          }
        } else if (key.tab) {
          // Insert tab/spaces
          const currentLine = lines[prev.cursorLine] || '';
          const spaces = '  '; // 2 spaces for tab
          const newLine = currentLine.slice(0, prev.cursorColumn) + spaces + currentLine.slice(prev.cursorColumn);
          lines[prev.cursorLine] = newLine;
          newState.code = lines.join('\n');
          newState.cursorColumn = prev.cursorColumn + spaces.length;
        } else if (key.upArrow) {
          newState.cursorLine = Math.max(0, prev.cursorLine - 1);
          newState.cursorColumn = Math.min(lines[newState.cursorLine]?.length || 0, prev.cursorColumn);
        } else if (key.downArrow) {
          newState.cursorLine = Math.min(lines.length - 1, prev.cursorLine + 1);
          newState.cursorColumn = Math.min(lines[newState.cursorLine]?.length || 0, prev.cursorColumn);
        } else if (key.leftArrow) {
          newState.cursorColumn = Math.max(0, prev.cursorColumn - 1);
        } else if (key.rightArrow) {
          newState.cursorColumn = Math.min(lines[prev.cursorLine]?.length || 0, prev.cursorColumn + 1);
        } else if (input && input.length === 1) {
          // Regular character input
          const currentLine = lines[prev.cursorLine] || '';
          const newLine = currentLine.slice(0, prev.cursorColumn) + input + currentLine.slice(prev.cursorColumn);
          lines[prev.cursorLine] = newLine;
          newState.code = lines.join('\n');
          newState.cursorColumn = prev.cursorColumn + 1;
        }
      }

      return newState;
    });
  }, { isActive: isFocused });

  // Render the code editor
  const lines = state.code.split('\n');
  const maxLineNumber = lines.length.toString().length;

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Live Code Editor - {language.toUpperCase()}
          {filename && ` (${filename})`}
        </Text>
      </Box>

      {/* Code area */}
      <Box flexDirection="column" flexGrow={1} borderStyle="single" padding={1}>
        {lines.map((line, index) => {
          const lineNumber = (index + 1).toString().padStart(maxLineNumber, ' ');
          const isCurrentLine = index === state.cursorLine;
          const highlightedLine = highlightLine(line, index);
          
          return (
            <Box key={index}>
              <Text color="gray">{lineNumber} </Text>
              <Text backgroundColor={isCurrentLine && state.mode === 'edit' ? 'blue' : undefined}>
                {highlightedLine}
                {isCurrentLine && state.mode === 'edit' && (
                  <Text backgroundColor="white" color="black">
                    {line[state.cursorColumn] || ' '}
                  </Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Status bar */}
      <Box marginTop={1} paddingX={1} backgroundColor={state.mode === 'edit' ? 'blue' : 'gray'}>
        <Text color="white">
          {state.statusMessage} | Line {state.cursorLine + 1}, Col {state.cursorColumn + 1} | {state.mode.toUpperCase()}
        </Text>
        <Box marginLeft="auto">
          <Text color="white">
            {state.isExecuting && '⚡ Executing... '}
            {state.isSaving && '💾 Saving... '}
            ESC: Command | i: Insert | w: Save | r: Run | q: Quit
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default LiveCodeEditor;